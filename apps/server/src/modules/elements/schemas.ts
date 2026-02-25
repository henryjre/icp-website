import { z } from "zod";

export const projectAndElementParamSchema = z.object({
  projectId: z.string().min(1),
  elementId: z.string().min(1),
});

export const projectOnlyParamSchema = z.object({
  projectId: z.string().min(1),
});

export const createElementBodySchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  status: z.enum(["Casted", "Delivered"]),
  castingDate: z.string().date(),
});

export const updateElementBodySchema = createElementBodySchema.partial();
