import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import { optionalAuthGuard } from "../../middleware/optionalAuthGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import { validate } from "../../middleware/validate.js";
import {
  createElementBodySchema,
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

elementsRouter.get(
  "/:projectId/elements",
  validate({ params: projectOnlyParamSchema }),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId },
      include: {
        elements: {
          include: { createdBy: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      throw new HttpError(404, "Project not found");
    }

    const items = project.elements.map((element) => mapElementListItem(element, project.name));
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

    const element = await prisma.$transaction(async (tx) => {
      const el = await tx.element.create({
        data: {
          projectId: req.params.projectId,
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

    await prisma.activity.create({
      data: {
        projectId: req.params.projectId,
        elementId: element.id,
        action: "Element Created",
        description: `Element "${element.name}" created`,
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

    const changes: string[] = [];
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

    const element = await prisma.element.update({
      where: { id: existing.id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.location !== undefined ? { location: payload.location } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.castingDate !== undefined ? { castingDate: new Date(payload.castingDate) } : {}),
      },
      include: {
        createdBy: true,
      },
    });

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
