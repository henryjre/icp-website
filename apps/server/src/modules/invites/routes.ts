import crypto from "node:crypto";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import { validate } from "../../middleware/validate.js";
import {
  createInviteBodySchema,
  inviteIdParamSchema,
  listInvitesQuerySchema,
  sendInviteEmailBodySchema,
} from "./schemas.js";
import { sendMail } from "../../lib/mail.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/httpError.js";

export const invitesRouter = Router();

function toInviteDto(invite: {
  id: string;
  code: string;
  label: string | null;
  status: "Active" | "Archived" | "Expired";
  expiresAt: Date | null;
  useCount: number;
  maxUses: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { email: string };
}) {
  return {
    id: invite.id,
    code: invite.code,
    label: invite.label,
    status: invite.status,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    useCount: invite.useCount,
    maxUses: invite.maxUses,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
    createdByEmail: invite.createdBy.email,
  };
}

function generateInviteCode(): string {
  return crypto.randomBytes(6).toString("base64url").toUpperCase();
}

function resolveInviteStatus(status: "Active" | "Archived" | "Expired", expiresAt: Date | null) {
  if (status === "Archived") return "Archived";
  if (expiresAt && expiresAt < new Date()) return "Expired";
  return "Active";
}

function buildInviteLink(code: string) {
  const origin = (env.PUBLIC_SITE_URL ?? env.VITE_PUBLIC_SITE_URL ?? "http://localhost:5173").replace(/\/+$/, "");
  return `${origin}/register?code=${encodeURIComponent(code)}`;
}

invitesRouter.get(
  "/",
  authGuard,
  roleGuard("admin"),
  validate({ query: listInvitesQuerySchema }),
  asyncHandler(async (req, res) => {
    const filterStatus = req.query.status ?? "All";

    const invites = await prisma.inviteCode.findMany({
      include: { createdBy: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });

    const mapped = invites.map((invite) => {
      const computedStatus = resolveInviteStatus(invite.status, invite.expiresAt);
      return toInviteDto({ ...invite, status: computedStatus });
    });

    const items = filterStatus === "All"
      ? mapped
      : mapped.filter((item) => item.status === filterStatus);

    return res.json({ items, total: items.length });
  }),
);

invitesRouter.post(
  "/",
  authGuard,
  roleGuard("admin"),
  validate({ body: createInviteBodySchema }),
  asyncHandler(async (req, res) => {
    const code = generateInviteCode();

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        label: req.body.label ?? null,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
        maxUses: req.body.maxUses ?? null,
        createdById: req.user!.id,
      },
      include: { createdBy: { select: { email: true } } },
    });

    return res.status(201).json({
      invite: toInviteDto({ ...invite, status: resolveInviteStatus(invite.status, invite.expiresAt) }),
      inviteLink: buildInviteLink(invite.code),
    });
  }),
);

invitesRouter.patch(
  "/:inviteId/archive",
  authGuard,
  roleGuard("admin"),
  validate({ params: inviteIdParamSchema }),
  asyncHandler(async (req, res) => {
    const invite = await prisma.inviteCode.update({
      where: { id: req.params.inviteId },
      data: {
        status: "Archived",
        archivedById: req.user!.id,
      },
      include: { createdBy: { select: { email: true } } },
    });

    return res.json({ invite: toInviteDto({ ...invite, status: "Archived" }) });
  }),
);

invitesRouter.patch(
  "/:inviteId/unarchive",
  authGuard,
  roleGuard("admin"),
  validate({ params: inviteIdParamSchema }),
  asyncHandler(async (req, res) => {
    const invite = await prisma.inviteCode.update({
      where: { id: req.params.inviteId },
      data: {
        status: "Active",
        archivedById: null,
      },
      include: { createdBy: { select: { email: true } } },
    });

    return res.json({
      invite: toInviteDto({ ...invite, status: resolveInviteStatus(invite.status, invite.expiresAt) }),
    });
  }),
);

invitesRouter.post(
  "/:inviteId/send-email",
  authGuard,
  roleGuard("admin"),
  validate({ params: inviteIdParamSchema, body: sendInviteEmailBodySchema }),
  asyncHandler(async (req, res) => {
    const invite = await prisma.inviteCode.findUnique({ where: { id: req.params.inviteId } });
    if (!invite) {
      throw new HttpError(404, "Invite not found");
    }

    const computedStatus = resolveInviteStatus(invite.status, invite.expiresAt);
    if (computedStatus !== "Active") {
      throw new HttpError(400, "Invite code is not active");
    }

    const link = buildInviteLink(invite.code);
    const customMessage = req.body.message ?? "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#041D9D;padding:32px 36px;">
            <p style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">ICP-FNET Engineering</p>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Registration Invitation</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.7;">You have been invited to create an account on the ICP-FNET Engineering project portal.</p>
            ${customMessage ? `<div style="background:#f8f9ff;border-left:4px solid #041D9D;border-radius:0 8px 8px 0;padding:14px 20px;margin-bottom:16px;"><p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${customMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p></div>` : ""}
            <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.7;">Click the button below to complete your registration. This link is for your use only — please do not share it.</p>
            <a href="${link}" style="display:inline-block;background:#041D9D;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:700;">Accept Invitation</a>
            <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${link}" style="color:#041D9D;word-break:break-all;">${link}</a></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f9ff;border-top:1px solid #e5e7eb;padding:20px 36px;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">This invitation was sent from the ICP-FNET Engineering portal. If you did not expect this email, you can safely ignore it.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const text = [
      "You have been invited to register on the ICP-FNET Engineering project portal.",
      ...(customMessage ? ["", customMessage] : []),
      "",
      `Register here: ${link}`,
    ].join("\n");

    await sendMail({
      to: req.body.toEmail,
      subject: "You are invited to register — ICP-FNET Engineering",
      text,
      html,
    });

    return res.status(204).send();
  }),
);
