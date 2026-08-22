import { z } from "zod";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export const projectIdParamSchema = z.object({
  projectId: z.string().min(1),
});

export const createProjectBodySchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  dateStarted: z.string().date(),
  status: z.enum(["Completed", "Ongoing"]),
  completionDate: z.string().date().nullable().optional(),
  thumbnail: z.string().url(),
  client: z.string().min(1),
}).strict();

export const updateProjectBodySchema = createProjectBodySchema.partial().strict();

export const thumbnailUploadBodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES, "File must be 25 MB or smaller."),
});
