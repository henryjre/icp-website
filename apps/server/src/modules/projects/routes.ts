import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import { optionalAuthGuard } from "../../middleware/optionalAuthGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import { validate } from "../../middleware/validate.js";
import {
  createProjectBodySchema,
  projectIdParamSchema,
  thumbnailUploadBodySchema,
  updateProjectBodySchema,
} from "./schemas.js";
import { mapProjectDetail, mapProjectListItem } from "../_shared/mappers.js";
import { HttpError } from "../../utils/httpError.js";
import { createPresignedUploadUrl, createPublicObjectUrl, removeObject, withS3EnvironmentRoot } from "../../lib/s3.js";
import { env } from "../../config/env.js";

export const projectsRouter = Router();

const projectDetailActivityTypes = ["updated", "document", "comment"];

function canAccessConfidential(role?: "admin" | "editor" | "client") {
  return role === "admin" || role === "editor";
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extractS3KeyFromPublicUrl(url: string): string | null {
  try {
    const base = new URL(env.S3_PUBLIC_BASE_URL);
    const target = new URL(url);
    if (base.host !== target.host) return null;

    const basePath = base.pathname.replace(/^\/+|\/+$/g, "");
    let targetPath = target.pathname.replace(/^\/+/, "");

    if (basePath) {
      if (targetPath === basePath) return null;
      if (!targetPath.startsWith(`${basePath}/`)) return null;
      targetPath = targetPath.slice(basePath.length + 1);
    }

    return targetPath.length > 0 ? targetPath : null;
  } catch {
    return null;
  }
}

function toDateOnlyValue(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function toDisplayDate(value: string | null): string {
  if (!value) return "None";
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function diffLine(label: string, before: string, after: string): string {
  return `- ${label}: ${before} -> ${after}`;
}

projectsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const projects = await prisma.project.findMany({
      include: {
        createdBy: true,
        documents: {
          where: { scope: "PROJECT" },
          include: { uploadedBy: true },
          orderBy: { createdAt: "desc" },
        },
        elements: {
          include: {
            createdBy: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      items: projects.map(mapProjectListItem),
      total: projects.length,
    });
  }),
);

projectsRouter.get(
  "/:projectId",
  optionalAuthGuard,
  validate({ params: projectIdParamSchema }),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        createdBy: true,
        documents: {
          where: { scope: "PROJECT" },
          include: { uploadedBy: true },
          orderBy: { createdAt: "desc" },
        },
        elements: {
          include: {
            createdBy: true,
            documents: {
              include: { uploadedBy: true },
              orderBy: { createdAt: "desc" },
            },
            activities: {
              include: { actor: true },
              orderBy: { occurredAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: { actor: true },
          orderBy: { occurredAt: "desc" },
        },
      },
    });

    if (!project) {
      throw new HttpError(404, "Project not found");
    }

    const safeProject = {
      ...project,
      activities: canAccessConfidential(req.user?.role)
        ? project.activities.filter((activity) => !(activity.elementId && projectDetailActivityTypes.includes(activity.type)))
        : [],
      documents: project.documents.filter((doc) => !doc.isConfidential || canAccessConfidential(req.user?.role)),
      elements: project.elements.map((element) => ({
        ...element,
        activities: canAccessConfidential(req.user?.role) ? element.activities : [],
        documents: element.documents.filter((doc) => !doc.isConfidential),
      })),
    };

    return res.json({ project: mapProjectDetail(safeProject) });
  }),
);

projectsRouter.post(
  "/thumbnail/upload-url",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ body: thumbnailUploadBodySchema }),
  asyncHandler(async (req, res) => {
    const { fileName, mimeType } = req.body;
    const key = withS3EnvironmentRoot(`projects/thumbnails/${Date.now()}-${sanitizeFileName(fileName)}`);
    const uploadUrl = await createPresignedUploadUrl({ key, mimeType, acl: "public-read" });
    const publicUrl = createPublicObjectUrl(key);
    return res.json({ uploadUrl, s3Key: key, publicUrl, expiresInSeconds: env.S3_PRESIGNED_EXPIRES_SECONDS });
  }),
);

projectsRouter.post(
  "/",
  authGuard,
  roleGuard("admin"),
  validate({ body: createProjectBodySchema }),
  asyncHandler(async (req, res) => {
    const payload = req.body;

    const project = await prisma.$transaction(async (tx) => {
      const tempCode = `TMP_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
      const created = await tx.project.create({
        data: {
          name: payload.name,
          location: payload.location,
          dateStarted: new Date(payload.dateStarted),
          status: payload.status,
          completionDate: payload.completionDate ? new Date(payload.completionDate) : null,
          thumbnail: payload.thumbnail,
          clientName: payload.client,
          createdById: req.user!.id,
          projectCode: tempCode,
        },
      });

      const code = `PRJ${created.seq.toString().padStart(4, "0")}`;
      return tx.project.update({
        where: { id: created.id },
        data: { projectCode: code },
        include: {
          createdBy: true,
          elements: {
            include: { createdBy: true },
          },
        },
      });
    });

    await prisma.activity.create({
      data: {
        projectId: project.id,
        action: "Project Created",
        description: `Project ${project.name} created`,
        type: "created",
        actorId: req.user!.id,
      },
    });

    return res.status(201).json({ project: mapProjectListItem(project) });
  }),
);

projectsRouter.patch(
  "/:projectId",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: projectIdParamSchema, body: updateProjectBodySchema }),
  asyncHandler(async (req, res) => {
    const payload = req.body;
    const existing = await prisma.project.findUnique({
      where: { id: req.params.projectId },
    });

    if (!existing) {
      throw new HttpError(404, "Project not found");
    }

    const nextName = payload.name ?? existing.name;
    const nextLocation = payload.location ?? existing.location;
    const nextDateStarted = payload.dateStarted ?? toDateOnlyValue(existing.dateStarted)!;
    const nextStatus = payload.status ?? existing.status;
    const nextCompletionDate =
      payload.completionDate !== undefined
        ? payload.completionDate
        : toDateOnlyValue(existing.completionDate);
    const nextThumbnail = payload.thumbnail ?? existing.thumbnail;
    const nextClient = payload.client ?? existing.clientName;

    const changedLines: string[] = [];
    if (nextName !== existing.name) changedLines.push(diffLine("Project Name", existing.name, nextName));
    if (nextClient !== existing.clientName) changedLines.push(diffLine("Client", existing.clientName, nextClient));
    if (nextLocation !== existing.location) changedLines.push(diffLine("Location", existing.location, nextLocation));
    if (nextDateStarted !== toDateOnlyValue(existing.dateStarted)) {
      changedLines.push(
        diffLine("Date Started", toDisplayDate(toDateOnlyValue(existing.dateStarted)), toDisplayDate(nextDateStarted)),
      );
    }
    if (nextStatus !== existing.status) changedLines.push(diffLine("Status", existing.status, nextStatus));
    if (nextCompletionDate !== toDateOnlyValue(existing.completionDate)) {
      changedLines.push(
        diffLine(
          "Completion Date",
          toDisplayDate(toDateOnlyValue(existing.completionDate)),
          toDisplayDate(nextCompletionDate),
        ),
      );
    }
    if (nextThumbnail !== existing.thumbnail) changedLines.push(diffLine("Thumbnail", existing.thumbnail, nextThumbnail));

    const project = await prisma.project.update({
      where: { id: req.params.projectId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.location !== undefined ? { location: payload.location } : {}),
        ...(payload.dateStarted !== undefined ? { dateStarted: new Date(payload.dateStarted) } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.completionDate !== undefined
          ? { completionDate: payload.completionDate ? new Date(payload.completionDate) : null }
          : {}),
        ...(payload.thumbnail !== undefined ? { thumbnail: payload.thumbnail } : {}),
        ...(payload.client !== undefined ? { clientName: payload.client } : {}),
      },
      include: {
        createdBy: true,
        elements: {
          include: { createdBy: true },
        },
      },
    });

    if (changedLines.length > 0) {
      await prisma.activity.create({
        data: {
          projectId: project.id,
          action: "Project Edited",
          description: `Edited project fields:\n${changedLines.join("\n")}`,
          type: "updated",
          actorId: req.user!.id,
        },
      });
    }

    return res.json({ project: mapProjectListItem(project) });
  }),
);

projectsRouter.delete(
  "/:projectId",
  authGuard,
  roleGuard("admin"),
  validate({ params: projectIdParamSchema }),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      select: {
        id: true,
        thumbnail: true,
        documents: {
          select: { s3Key: true },
        },
      },
    });

    if (!project) {
      throw new HttpError(404, "Project not found");
    }

    const objectKeys = new Set(project.documents.map((doc) => doc.s3Key));
    const thumbnailKey = extractS3KeyFromPublicUrl(project.thumbnail);
    if (thumbnailKey) {
      objectKeys.add(thumbnailKey);
    }

    const removalResults = await Promise.allSettled(
      Array.from(objectKeys).map(async (key) => removeObject(key)),
    );

    removalResults.forEach((result, index) => {
      if (result.status === "rejected") {
        const key = Array.from(objectKeys)[index];
        console.warn(`Failed to remove S3 object ${key}:`, result.reason);
      }
    });

    await prisma.project.delete({ where: { id: project.id } });

    return res.status(204).send();
  }),
);
