import { z } from "zod";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export const elementIdParamSchema = z.object({
  elementId: z.string().min(1),
});

export const progressUpdateParamSchema = z.object({
  progressUpdateId: z.string().min(1),
});

export const progressImageParamSchema = z.object({
  imageId: z.string().min(1),
});

export const progressUploadUrlBodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES, "File must be 25 MB or smaller."),
});

export const createProgressUpdateBodySchema = z
  .object({
    note: z.string().trim().max(2000).default(""),
    images: z
      .array(
        z.object({
          name: z.string().min(1),
          mimeType: z.string().min(1),
          sizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES, "File must be 25 MB or smaller."),
          s3Key: z.string().min(1),
        }),
      )
      .max(1, "Add only one progress image.")
      .default([]),
  })
  .refine((value) => value.note.length > 0 || value.images.length > 0, {
    message: "Add a note or at least one image.",
  });
