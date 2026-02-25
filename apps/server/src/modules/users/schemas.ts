import { z } from "zod";

export const createUserBodySchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["admin", "editor", "client"]),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1),
});

export const listUsersQuerySchema = z.object({
  status: z.enum(["Pending", "Active", "Rejected", "Archived", "All"]).default("All"),
  search: z.string().optional(),
});

export const approveUserBodySchema = z.object({
  role: z.enum(["admin", "editor", "client"]),
});

export const rejectUserBodySchema = z.object({
  reason: z.string().max(200).optional(),
});

export const updateUserRoleBodySchema = z.object({
  role: z.enum(["admin", "editor", "client"]),
});
