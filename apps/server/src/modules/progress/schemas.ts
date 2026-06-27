import { z } from "zod";

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
  sizeBytes: z.number().int().positive(),
});

export const createProgressUpdateBodySchema = z
  .object({
    note: z.string().trim().max(2000).default(""),
    images: z
      .array(
        z.object({
          name: z.string().min(1),
          mimeType: z.string().min(1),
          sizeBytes: z.number().int().positive(),
          s3Key: z.string().min(1),
        }),
      )
      .max(1, "Add only one progress image.")
      .default([]),
  })
  .refine((value) => value.note.length > 0 || value.images.length > 0, {
    message: "Add a note or at least one image.",
  });
