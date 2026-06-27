import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { optionalAuthGuard } from "../../middleware/optionalAuthGuard.js";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import { validate } from "../../middleware/validate.js";
import {
  createProgressUpdateBodySchema,
  elementIdParamSchema,
  progressImageParamSchema,
  progressUpdateParamSchema,
  progressUploadUrlBodySchema,
} from "./schemas.js";
import {
  createPresignedDownloadUrl,
  createPresignedUploadUrl,
  removeObject,
  withS3EnvironmentRoot,
} from "../../lib/s3.js";
import { env } from "../../config/env.js";
import { mapProgressUpdate } from "../_shared/mappers.js";
import { HttpError } from "../../utils/httpError.js";

const MAX_PROGRESS_UPDATES_PER_ELEMENT = 5;

type ProgressImageInput = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  s3Key: string;
};

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Mounted at /elements (element-scoped) and /progress (resource-scoped).
export const elementsProgressRouter = Router();
export const progressRouter = Router();

elementsProgressRouter.get(
  "/:elementId/progress",
  optionalAuthGuard,
  validate({ params: elementIdParamSchema }),
  asyncHandler(async (req, res) => {
    const element = await prisma.element.findUnique({ where: { id: req.params.elementId } });
    if (!element) throw new HttpError(404, "Element not found");

    const updates = await prisma.progressUpdate.findMany({
      where: { elementId: req.params.elementId },
      include: { author: true, images: true },
      orderBy: { createdAt: "desc" },
    });

    const items = updates.map(mapProgressUpdate);
    return res.json({ items, total: items.length });
  }),
);

elementsProgressRouter.post(
  "/:elementId/progress/upload-url",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: elementIdParamSchema, body: progressUploadUrlBodySchema }),
  asyncHandler(async (req, res) => {
    const element = await prisma.element.findUnique({ where: { id: req.params.elementId } });
    if (!element) throw new HttpError(404, "Element not found");
    const progressCount = await prisma.progressUpdate.count({ where: { elementId: element.id } });
    if (progressCount >= MAX_PROGRESS_UPDATES_PER_ELEMENT) {
      throw new HttpError(409, `This element already has the maximum of ${MAX_PROGRESS_UPDATES_PER_ELEMENT} progress updates.`);
    }

    const { fileName, mimeType } = req.body;
    const key = withS3EnvironmentRoot(
      `projects/${element.projectId}/elements/${element.shortToken}/progress/${Date.now()}-${sanitizeName(fileName)}`,
    );
    const uploadUrl = await createPresignedUploadUrl({ key, mimeType });

    return res.json({ uploadUrl, s3Key: key, expiresInSeconds: env.S3_PRESIGNED_EXPIRES_SECONDS });
  }),
);

elementsProgressRouter.post(
  "/:elementId/progress",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: elementIdParamSchema, body: createProgressUpdateBodySchema }),
  asyncHandler(async (req, res) => {
    const element = await prisma.element.findUnique({ where: { id: req.params.elementId } });
    if (!element) throw new HttpError(404, "Element not found");
    const progressCount = await prisma.progressUpdate.count({ where: { elementId: element.id } });
    if (progressCount >= MAX_PROGRESS_UPDATES_PER_ELEMENT) {
      throw new HttpError(409, `This element already has the maximum of ${MAX_PROGRESS_UPDATES_PER_ELEMENT} progress updates.`);
    }

    const payload = req.body;

    const update = await prisma.progressUpdate.create({
      data: {
        projectId: element.projectId,
        elementId: element.id,
        note: payload.note,
        authorId: req.user!.id,
        images: {
          create: payload.images.map((image: ProgressImageInput) => ({
            name: image.name,
            mimeType: image.mimeType,
            sizeBytes: image.sizeBytes,
            s3Key: image.s3Key,
          })),
        },
      },
      include: { author: true, images: true },
    });

    await prisma.activity.create({
      data: {
        projectId: element.projectId,
        elementId: element.id,
        action: "Progress Update",
        description: payload.note.length > 0 ? payload.note : `${update.images.length} photo(s) added`,
        type: "comment",
        actorId: req.user!.id,
      },
    });

    return res.status(201).json({ progressUpdate: mapProgressUpdate(update) });
  }),
);

elementsProgressRouter.delete(
  "/progress/:progressUpdateId",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: progressUpdateParamSchema }),
  asyncHandler(async (req, res) => {
    const update = await prisma.progressUpdate.findUnique({
      where: { id: req.params.progressUpdateId },
      include: { images: true },
    });
    if (!update) throw new HttpError(404, "Progress update not found");

    await Promise.all(update.images.map((image) => removeObject(image.s3Key)));
    await prisma.progressUpdate.delete({ where: { id: update.id } });

    await prisma.activity.create({
      data: {
        projectId: update.projectId,
        elementId: update.elementId,
        action: "Progress Update Deleted",
        description: "A progress update was deleted",
        type: "comment",
        actorId: req.user!.id,
      },
    });

    return res.status(204).send();
  }),
);

progressRouter.get(
  "/images/:imageId/download-url",
  optionalAuthGuard,
  validate({ params: progressImageParamSchema }),
  asyncHandler(async (req, res) => {
    const image = await prisma.progressImage.findUnique({ where: { id: req.params.imageId } });
    if (!image) throw new HttpError(404, "Image not found");

    const downloadUrl = await createPresignedDownloadUrl(image.s3Key);
    return res.json({ downloadUrl, expiresInSeconds: env.S3_PRESIGNED_EXPIRES_SECONDS });
  }),
);
