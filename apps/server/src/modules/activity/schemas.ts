import { z } from "zod";

export const projectIdActivityParamSchema = z.object({
  projectId: z.string().min(1),
});

export const elementIdActivityParamSchema = z.object({
  elementId: z.string().min(1),
});

export const activityQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
});
