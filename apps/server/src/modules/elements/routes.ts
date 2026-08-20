import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import { optionalAuthGuard } from "../../middleware/optionalAuthGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import { validate } from "../../middleware/validate.js";
import {
  createElementBodySchema,
  elementListQuerySchema,
  projectAndElementParamSchema,
  projectOnlyParamSchema,
  updateElementBodySchema,
} from "./schemas.js";
import { mapElementDetail, mapElementListItem } from "../_shared/mappers.js";
import { HttpError } from "../../utils/httpError.js";
import { toBase62 } from "../../utils/base62.js";

export const elementsRouter = Router();

function canAccessConfidential(role?: "admin" | "editor" | "client") {
  return role === "admin" || role === "editor";
}

function toDateValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const duplicateIdentityMessage = "Batch and serial number already exist for this project";

function isIdentityConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  const target = JSON.stringify(error.meta?.target ?? "");
  return target.includes("batch") && target.includes("serialNumber");
}

elementsRouter.get(
  "/:projectId/elements",
  validate({ params: projectOnlyParamSchema, query: elementListQuerySchema }),
  asyncHandler(async (req, res) => {
    const { page, pageSize, batch, status, search } = req.query as unknown as {
      page: number;
      pageSize: number;
      batch?: number | "unassigned";
      status?: "Casted" | "Delivered";
      search?: string;
    };
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      select: { id: true, name: true },
    });

    if (!project) {
      throw new HttpError(404, "Project not found");
    }

    const where: Prisma.ElementWhereInput = {
      projectId: req.params.projectId,
      ...(batch === "unassigned" ? { batch: null } : batch !== undefined ? { batch } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
              { serialNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, elements] = await prisma.$transaction([
      prisma.element.count({ where }),
      prisma.element.findMany({
        where,
        include: { createdBy: true },
        orderBy: [{ batch: "asc" }, { serialNumber: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const items = elements.map((element) => mapElementListItem(element, project.name));
    return res.json({ items, total, page, pageSize, totalPages });
  }),
);

elementsRouter.get(
  "/:projectId/element-batches",
  validate({ params: projectOnlyParamSchema }),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      select: { id: true },
    });

    if (!project) {
      throw new HttpError(404, "Project not found");
    }

    const groups = await prisma.element.groupBy({
      by: ["batch", "status"],
      where: { projectId: req.params.projectId },
      _count: { _all: true },
      orderBy: { batch: "asc" },
    });

    const summaries = new Map<number | null, { batch: number | null; total: number; delivered: number; casted: number }>();
    for (const group of groups) {
      const current = summaries.get(group.batch) ?? { batch: group.batch, total: 0, delivered: 0, casted: 0 };
      const count = group._count._all;
      current.total += count;
      if (group.status === "Delivered") current.delivered += count;
      if (group.status === "Casted") current.casted += count;
      summaries.set(group.batch, current);
    }

    const items = Array.from(summaries.values())
      .sort((a, b) => {
        if (a.batch === null) return 1;
        if (b.batch === null) return -1;
        return a.batch - b.batch;
      })
      .map((summary) => ({
        key: summary.batch === null ? "unassigned" : String(summary.batch),
        label: summary.batch === null ? "Unassigned" : `Batch ${summary.batch}`,
        ...summary,
      }));

    return res.json({ items, total: items.length });
  }),
);

elementsRouter.get(
  "/:projectId/elements/:elementId",
  optionalAuthGuard,
  validate({ params: projectAndElementParamSchema }),
  asyncHandler(async (req, res) => {
    const element = await prisma.element.findFirst({
      where: {
        id: req.params.elementId,
        projectId: req.params.projectId,
      },
      include: {
        project: true,
        createdBy: true,
        documents: {
          include: { uploadedBy: true },
          orderBy: { createdAt: "desc" },
        },
        progressUpdates: {
          include: { author: true, images: true },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: { actor: true },
          orderBy: { occurredAt: "desc" },
        },
      },
    });

    if (!element) {
      throw new HttpError(404, "Element not found");
    }

    const safeElement = canAccessConfidential(req.user?.role)
      ? element
      : {
          ...element,
          activities: [],
          documents: element.documents.filter((doc) => !doc.isConfidential),
        };

    return res.json({ element: mapElementDetail(safeElement, element.project.name) });
  }),
);

elementsRouter.post(
  "/:projectId/elements",
  authGuard,
  roleGuard("admin"),
  validate({ params: projectOnlyParamSchema, body: createElementBodySchema }),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) {
      throw new HttpError(404, "Project not found");
    }

    const payload = req.body;

    const duplicate = await prisma.element.findFirst({
      where: {
        projectId: req.params.projectId,
        batch: payload.batch,
        serialNumber: payload.serialNumber,
      },
      select: { id: true },
    });
    if (duplicate) throw new HttpError(409, duplicateIdentityMessage);

    let element;
    try {
      element = await prisma.$transaction(async (tx) => {
        const el = await tx.element.create({
          data: {
            projectId: req.params.projectId,
            batch: payload.batch,
            serialNumber: payload.serialNumber,
            name: payload.name,
            location: payload.location,
            status: payload.status,
            castingDate: new Date(payload.castingDate),
            createdById: req.user!.id,
            shortToken: "",
          },
        });
        const token = toBase62(el.seq);
        return tx.element.update({
          where: { id: el.id },
          data: { shortToken: token },
          include: { createdBy: true },
        });
      });
    } catch (error) {
      if (isIdentityConstraintError(error)) throw new HttpError(409, duplicateIdentityMessage);
      throw error;
    }

    await prisma.activity.create({
      data: {
        projectId: req.params.projectId,
        elementId: element.id,
        action: "Element Created",
        description: `Element "${element.name}" created (Batch ${element.batch}, Serial ${element.serialNumber})`,
        type: "created",
        actorId: req.user!.id,
      },
    });

    return res.status(201).json({ element: mapElementListItem(element, project.name) });
  }),
);

elementsRouter.delete(
  "/:projectId/elements/:elementId",
  authGuard,
  roleGuard("admin"),
  validate({ params: projectAndElementParamSchema }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.element.findFirst({
      where: {
        id: req.params.elementId,
        projectId: req.params.projectId,
      },
    });

    if (!existing) {
      throw new HttpError(404, "Element not found");
    }

    await prisma.activity.create({
      data: {
        projectId: req.params.projectId,
        elementId: existing.id,
        action: "Element Deleted",
        description: `Element "${existing.name}" deleted`,
        type: "status",
        actorId: req.user!.id,
      },
    });

    await prisma.element.delete({ where: { id: existing.id } });

    return res.status(204).send();
  }),
);

elementsRouter.patch(
  "/:projectId/elements/:elementId",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: projectAndElementParamSchema, body: updateElementBodySchema }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.element.findFirst({
      where: {
        id: req.params.elementId,
        projectId: req.params.projectId,
      },
      include: {
        project: true,
      },
    });

    if (!existing) {
      throw new HttpError(404, "Element not found");
    }

    const payload = req.body;
    const nextBatch = payload.batch ?? existing.batch;
    const nextSerialNumber = payload.serialNumber ?? existing.serialNumber;

    if ((nextBatch === null) !== (nextSerialNumber === null)) {
      throw new HttpError(400, "Batch and serial number must both be assigned");
    }

    if (nextBatch !== null && nextSerialNumber !== null) {
      const duplicate = await prisma.element.findFirst({
        where: {
          projectId: req.params.projectId,
          batch: nextBatch,
          serialNumber: nextSerialNumber,
          id: { not: existing.id },
        },
        select: { id: true },
      });
      if (duplicate) throw new HttpError(409, duplicateIdentityMessage);
    }

    const changes: string[] = [];
    if (payload.batch !== undefined && payload.batch !== existing.batch) {
      changes.push(`Batch: ${existing.batch ?? "Unassigned"} -> ${payload.batch}`);
    }
    if (payload.serialNumber !== undefined && payload.serialNumber !== existing.serialNumber) {
      changes.push(`Serial Number: ${existing.serialNumber ?? "Unassigned"} -> ${payload.serialNumber}`);
    }
    if (payload.name !== undefined && payload.name !== existing.name) {
      changes.push(`Name: "${existing.name}" -> "${payload.name}"`);
    }
    if (payload.location !== undefined && payload.location !== existing.location) {
      changes.push(`Location: "${existing.location}" -> "${payload.location}"`);
    }
    if (payload.status !== undefined && payload.status !== existing.status) {
      changes.push(`Status: ${existing.status} -> ${payload.status}`);
    }
    if (payload.castingDate !== undefined) {
      const before = toDateValue(existing.castingDate);
      if (payload.castingDate !== before) {
        changes.push(`Casting Date: ${before} -> ${payload.castingDate}`);
      }
    }

    let element;
    try {
      element = await prisma.element.update({
        where: { id: existing.id },
        data: {
          ...(payload.batch !== undefined ? { batch: payload.batch } : {}),
          ...(payload.serialNumber !== undefined ? { serialNumber: payload.serialNumber } : {}),
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.location !== undefined ? { location: payload.location } : {}),
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.castingDate !== undefined ? { castingDate: new Date(payload.castingDate) } : {}),
        },
        include: {
          createdBy: true,
        },
      });
    } catch (error) {
      if (isIdentityConstraintError(error)) throw new HttpError(409, duplicateIdentityMessage);
      throw error;
    }

    await prisma.activity.create({
      data: {
        projectId: req.params.projectId,
        elementId: element.id,
        action: "Element Updated",
        description: changes.length > 0 ? changes.join("; ") : `Element "${element.name}" updated`,
        type: "updated",
        actorId: req.user!.id,
      },
    });

    return res.json({ element: mapElementListItem(element, existing.project.name) });
  }),
);
