import { z } from "zod";

export const listInvitesQuerySchema = z.object({
  status: z.enum(["Active", "Archived", "Expired", "All"]).default("All"),
});

export const inviteIdParamSchema = z.object({
  inviteId: z.string().min(1),
});

export const createInviteBodySchema = z.object({
  label: z.string().max(120).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
});

export const sendInviteEmailBodySchema = z.object({
  toEmail: z.string().email(),
  message: z.string().max(1000).optional(),
});
