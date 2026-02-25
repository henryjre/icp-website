import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { optionalAuthGuard } from "../../middleware/optionalAuthGuard.js";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import { validate } from "../../middleware/validate.js";
import {
  documentIdParamSchema,
  elementIdParamSchema,
  finalizeElementDocumentBodySchema,
  finalizeProjectDocumentBodySchema,
  projectDocumentParamSchema,
  projectIdParamSchema,
  updateDocumentBodySchema,
  uploadUrlBodySchema,
} from "./schemas.js";
import { createPresignedDownloadUrl, createPresignedUploadUrl, removeObject, withS3EnvironmentRoot } from "../../lib/s3.js";
import { env } from "../../config/env.js";
import { mapDocument } from "../_shared/mappers.js";
import { HttpError } from "../../utils/httpError.js";

function canAccessConfidential(role?: "admin" | "editor" | "client") {
  return role === "admin" || role === "editor";
}

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export const elementsDocumentsRouter = Router();
export const projectsDocumentsRouter = Router();
export const documentsRouter = Router();

elementsDocumentsRouter.get(
  "/:elementId/documents",
  optionalAuthGuard,
  validate({ params: elementIdParamSchema }),
  asyncHandler(async (req, res) => {
    const element = await prisma.element.findUnique({ where: { id: req.params.elementId } });
    if (!element) throw new HttpError(404, "Element not found");

    const docs = await prisma.document.findMany({
      where: { elementId: req.params.elementId, scope: "ELEMENT" },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    });

    const items = docs
      .filter((doc) => !doc.isConfidential || canAccessConfidential(req.user?.role))
      .map(mapDocument);

    return res.json({ items, total: items.length });
  }),
);

elementsDocumentsRouter.post(
  "/:elementId/documents/upload-url",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: elementIdParamSchema, body: uploadUrlBodySchema }),
  asyncHandler(async (req, res) => {
    const element = await prisma.element.findUnique({ where: { id: req.params.elementId } });
    if (!element) throw new HttpError(404, "Element not found");

    const { fileName, mimeType } = req.body;
    const key = withS3EnvironmentRoot(
      `projects/${element.projectId}/elements/${element.shortToken}/${Date.now()}-${sanitizeName(fileName)}`,
    );
    const uploadUrl = await createPresignedUploadUrl({ key, mimeType });

    return res.json({ uploadUrl, s3Key: key, expiresInSeconds: env.S3_PRESIGNED_EXPIRES_SECONDS });
  }),
);

elementsDocumentsRouter.post(
  "/:elementId/documents",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: elementIdParamSchema, body: finalizeElementDocumentBodySchema }),
  asyncHandler(async (req, res) => {
    const element = await prisma.element.findUnique({ where: { id: req.params.elementId } });
    if (!element) throw new HttpError(404, "Element not found");

    const payload = req.body;

    const document = await prisma.document.create({
      data: {
        projectId: element.projectId,
        elementId: element.id,
        scope: "ELEMENT",
        category: payload.category,
        name: payload.name,
        docType: payload.docType,
        sizeBytes: payload.sizeBytes,
        mimeType: payload.mimeType,
        s3Key: payload.s3Key,
        isConfidential: payload.isConfidential,
        uploadedById: req.user!.id,
      },
      include: { uploadedBy: true },
    });

    await prisma.activity.create({
      data: {
        projectId: element.projectId,
        elementId: element.id,
        action: "Document Uploaded",
        description: `Document ${document.name} uploaded`,
        type: "document",
        actorId: req.user!.id,
      },
    });

    return res.status(201).json({ document: mapDocument(document) });
  }),
);

projectsDocumentsRouter.get(
  "/:projectId/documents",
  authGuard,
  validate({ params: projectIdParamSchema }),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) throw new HttpError(404, "Project not found");

    const docs = await prisma.document.findMany({
      where: { projectId: req.params.projectId, scope: "PROJECT" },
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    });

    const items = docs
      .filter((doc) => !doc.isConfidential || canAccessConfidential(req.user?.role))
      .map(mapDocument);

    return res.json({ items, total: items.length });
  }),
);

projectsDocumentsRouter.post(
  "/:projectId/documents/upload-url",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: projectIdParamSchema, body: uploadUrlBodySchema }),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) throw new HttpError(404, "Project not found");

    const { fileName, mimeType } = req.body;
    const projectFolder = project.projectCode || project.id;
    const key = withS3EnvironmentRoot(
      `projects/${projectFolder}/project-docs/${Date.now()}-${sanitizeName(fileName)}`,
    );
    const uploadUrl = await createPresignedUploadUrl({ key, mimeType });

    return res.json({ uploadUrl, s3Key: key, expiresInSeconds: env.S3_PRESIGNED_EXPIRES_SECONDS });
  }),
);

projectsDocumentsRouter.post(
  "/:projectId/documents",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: projectIdParamSchema, body: finalizeProjectDocumentBodySchema }),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    if (!project) throw new HttpError(404, "Project not found");

    const payload = req.body;
    let replacedPlanName: string | null = null;

    if (payload.category === "PROJECT_PLAN") {
      const existingPlan = await prisma.document.findFirst({
        where: {
          projectId: project.id,
          scope: "PROJECT",
          category: "PROJECT_PLAN",
        },
      });

      if (existingPlan) {
        replacedPlanName = existingPlan.name;
        await removeObject(existingPlan.s3Key);
        await prisma.document.delete({ where: { id: existingPlan.id } });
      }
    }

    const document = await prisma.document.create({
      data: {
        projectId: project.id,
        elementId: null,
        scope: "PROJECT",
        category: payload.category,
        name: payload.name,
        docType: payload.docType,
        sizeBytes: payload.sizeBytes,
        mimeType: payload.mimeType,
        s3Key: payload.s3Key,
        isConfidential: payload.isConfidential,
        uploadedById: req.user!.id,
      },
      include: { uploadedBy: true },
    });

    if (payload.category === "PROJECT_PLAN") {
      await prisma.activity.create({
        data: {
          projectId: project.id,
          action: "Project Edited",
          description: replacedPlanName
            ? `General Plan: ${replacedPlanName} -> ${document.name}`
            : `General Plan: None -> ${document.name}`,
          type: "updated",
          actorId: req.user!.id,
        },
      });
    } else {
      await prisma.activity.create({
        data: {
          projectId: project.id,
          action: "Project Document Uploaded",
          description: `Project document ${document.name} uploaded`,
          type: "document",
          actorId: req.user!.id,
        },
      });
    }

    return res.status(201).json({ document: mapDocument(document) });
  }),
);

projectsDocumentsRouter.get(
  "/:projectId/documents/:documentId/download-url",
  authGuard,
  validate({ params: projectDocumentParamSchema }),
  asyncHandler(async (req, res) => {
    const document = await prisma.document.findFirst({
      where: { id: req.params.documentId, projectId: req.params.projectId, scope: "PROJECT" },
    });
    if (!document) throw new HttpError(404, "Document not found");

    if (document.isConfidential && !canAccessConfidential(req.user?.role)) {
      throw new HttpError(403, "You do not have access to this confidential document");
    }

    const downloadUrl = await createPresignedDownloadUrl(document.s3Key);
    return res.json({ downloadUrl, expiresInSeconds: env.S3_PRESIGNED_EXPIRES_SECONDS });
  }),
);

projectsDocumentsRouter.patch(
  "/:projectId/documents/:documentId",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: projectDocumentParamSchema, body: updateDocumentBodySchema }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.document.findFirst({
      where: { id: req.params.documentId, projectId: req.params.projectId, scope: "PROJECT" },
    });
    if (!existing) throw new HttpError(404, "Document not found");

    const payload = req.body;
    if (payload.category && payload.category !== "PROJECT_GENERAL" && payload.category !== "PROJECT_PLAN") {
      throw new HttpError(400, "Project documents must use PROJECT_GENERAL or PROJECT_PLAN category");
    }

    const document = await prisma.document.update({
      where: { id: existing.id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.category !== undefined ? { category: payload.category } : {}),
        ...(payload.docType !== undefined ? { docType: payload.docType } : {}),
        ...(payload.isConfidential !== undefined ? { isConfidential: payload.isConfidential } : {}),
      },
      include: { uploadedBy: true },
    });

    return res.json({ document: mapDocument(document) });
  }),
);

projectsDocumentsRouter.delete(
  "/:projectId/documents/:documentId",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: projectDocumentParamSchema }),
  asyncHandler(async (req, res) => {
    const document = await prisma.document.findFirst({
      where: { id: req.params.documentId, projectId: req.params.projectId, scope: "PROJECT" },
    });
    if (!document) throw new HttpError(404, "Document not found");

    await removeObject(document.s3Key);
    await prisma.document.delete({ where: { id: document.id } });
    await prisma.activity.create({
      data: {
        projectId: req.params.projectId,
        action: "Project Document Deleted",
        description: `Project document ${document.name} deleted`,
        type: "document",
        actorId: req.user!.id,
      },
    });
    return res.status(204).send();
  }),
);

documentsRouter.get(
  "/:documentId/download-url",
  optionalAuthGuard,
  validate({ params: documentIdParamSchema }),
  asyncHandler(async (req, res) => {
    const document = await prisma.document.findUnique({ where: { id: req.params.documentId } });
    if (!document) throw new HttpError(404, "Document not found");

    if (document.isConfidential && !canAccessConfidential(req.user?.role)) {
      throw new HttpError(403, "You do not have access to this confidential document");
    }

    const downloadUrl = await createPresignedDownloadUrl(document.s3Key);
    return res.json({ downloadUrl, expiresInSeconds: env.S3_PRESIGNED_EXPIRES_SECONDS });
  }),
);

documentsRouter.patch(
  "/:documentId",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: documentIdParamSchema, body: updateDocumentBodySchema }),
  asyncHandler(async (req, res) => {
    const payload = req.body;

    const document = await prisma.document.update({
      where: { id: req.params.documentId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.category !== undefined ? { category: payload.category } : {}),
        ...(payload.docType !== undefined ? { docType: payload.docType } : {}),
        ...(payload.isConfidential !== undefined ? { isConfidential: payload.isConfidential } : {}),
      },
      include: { uploadedBy: true },
    });

    return res.json({ document: mapDocument(document) });
  }),
);

documentsRouter.delete(
  "/:documentId",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: documentIdParamSchema }),
  asyncHandler(async (req, res) => {
    const document = await prisma.document.findUnique({ where: { id: req.params.documentId } });
    if (!document) throw new HttpError(404, "Document not found");

    await removeObject(document.s3Key);
    await prisma.document.delete({ where: { id: document.id } });

    if (document.elementId) {
      await prisma.activity.create({
        data: {
          projectId: document.projectId,
          elementId: document.elementId,
          action: "Document Deleted",
          description: `Document "${document.name}" deleted`,
          type: "document",
          actorId: req.user!.id,
        },
      });
    }

    return res.status(204).send();
  }),
);
