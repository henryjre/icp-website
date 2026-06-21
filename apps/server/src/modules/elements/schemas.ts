import { z } from "zod";

export const projectAndElementParamSchema = z.object({
  projectId: z.string().min(1),
  elementId: z.string().min(1),
});

export const projectOnlyParamSchema = z.object({
  projectId: z.string().min(1),
});

export const createElementBodySchema = z.object({
  batch: z.number().int().positive(),
  serialNumber: z.string().trim().min(1).max(64).regex(/^\d+(?:-\d+)*$/, "Serial number must contain digits separated by single hyphens"),
  name: z.string().min(1),
  location: z.string().min(1),
  status: z.enum(["Casted", "Delivered"]),
  castingDate: z.string().date(),
});

export const updateElementBodySchema = createElementBodySchema.partial().superRefine((value, ctx) => {
  const hasBatch = value.batch !== undefined;
  const hasSerialNumber = value.serialNumber !== undefined;
  if (hasBatch !== hasSerialNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Batch and serial number must be updated together",
      path: hasBatch ? ["serialNumber"] : ["batch"],
    });
  }
});
