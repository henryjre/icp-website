import crypto from "node:crypto";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "../../lib/prisma.js";
import { hashToken } from "../../lib/hash.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { sendPasswordResetMail } from "../../lib/mail.js";
import {
  createAccessToken,
  createRefreshToken,
  ttlToDate,
  verifyRefreshToken,
} from "../../lib/jwt.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { authGuard } from "../../middleware/authGuard.js";
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from "./schemas.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/httpError.js";

export const authRouter = Router();

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const PASSWORD_RESET_EMAIL_COOLDOWN_MS = 60 * 1000;
const FORGOT_PASSWORD_MESSAGE = "If an active account exists for that email, a password reset link has been sent.";
const INVALID_RESET_TOKEN_MESSAGE = "This password reset link is invalid or has expired.";

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many password reset requests. Try again later." },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many password reset attempts. Try again later." },
});

function toUserDto(user: {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "editor" | "client" | null;
  status: "Pending" | "Active" | "Rejected" | "Archived";
  rejectedReason: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    rejectedReason: user.rejectedReason,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function getLoginBlockedMessage(status: "Pending" | "Active" | "Rejected" | "Archived", reason: string | null) {
  if (status === "Pending") return "Awaiting admin approval";
  if (status === "Rejected") {
    return reason ? `Registration rejected: ${reason}` : "Registration rejected";
  }
  if (status === "Archived") return "Account archived";
  return "Invalid credentials";
}

authRouter.post(
  "/register",
  validate({ body: registerBodySchema }),
  asyncHandler(async (req, res) => {
    const { fullName, email, password, inviteCode } = req.body;

    const normalizedEmail = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const invite = await prisma.inviteCode.findUnique({ where: { code: inviteCode.trim().toUpperCase() } });
    if (!invite) {
      return res.status(400).json({ message: "Invalid invite code" });
    }

    if (invite.status !== "Active") {
      return res.status(403).json({ message: "Invite code is not active" });
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return res.status(403).json({ message: "Invite code has expired" });
    }

    if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
      return res.status(403).json({ message: "Invite code has reached maximum uses" });
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        passwordHash: await hashPassword(password),
        role: null,
        status: "Pending",
        isActive: false,
      },
    });

    await prisma.$transaction([
      prisma.inviteCode.update({
        where: { id: invite.id },
        data: { useCount: { increment: 1 } },
      }),
      prisma.inviteUse.create({
        data: {
          inviteCodeId: invite.id,
          email: normalizedEmail,
          userId: user.id,
        },
      }),
    ]);

    return res.status(201).json({
      message: "Registration submitted. Awaiting admin approval.",
      user: toUserDto(user),
    });
  }),
);

authRouter.post(
  "/login",
  validate({ body: loginBodySchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status !== "Active" || !user.isActive || !user.role) {
      return res.status(403).json({
        message: getLoginBlockedMessage(user.status, user.rejectedReason),
      });
    }

    const accessToken = createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = createRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: ttlToDate(env.JWT_REFRESH_TTL),
      },
    });

    return res.json({
      accessToken,
      refreshToken,
      user: toUserDto(user),
    });
  }),
);

authRouter.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate({ body: forgotPasswordBodySchema }),
  asyncHandler(async (req, res) => {
    const normalizedEmail = req.body.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, status: true, isActive: true },
    });

    if (!user || user.status !== "Active" || !user.isActive) {
      return res.json({ message: FORGOT_PASSWORD_MESSAGE });
    }

    const rawToken = crypto.randomBytes(32).toString("base64url");

    const resetToken = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;

      const now = new Date();
      const cooldownThreshold = new Date(now.getTime() - PASSWORD_RESET_EMAIL_COOLDOWN_MS);
      const recentToken = await tx.passwordResetToken.findFirst({
        where: { userId: user.id, createdAt: { gt: cooldownThreshold } },
        select: { id: true },
      });

      if (recentToken) return null;

      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      });

      return tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
        },
        select: { id: true },
      });
    });

    if (!resetToken) {
      return res.json({ message: FORGOT_PASSWORD_MESSAGE });
    }

    const siteOrigin = (env.PUBLIC_SITE_URL ?? env.VITE_PUBLIC_SITE_URL ?? "http://localhost:5173").replace(/\/+$/, "");
    const resetUrl = `${siteOrigin}/reset-password?token=${encodeURIComponent(rawToken)}`;

    try {
      await sendPasswordResetMail({ to: user.email, resetUrl });
    } catch (error) {
      await prisma.passwordResetToken.deleteMany({ where: { id: resetToken.id } });
      console.error("Failed to send password reset email", error);
    }

    return res.json({ message: FORGOT_PASSWORD_MESSAGE });
  }),
);

authRouter.post(
  "/reset-password",
  resetPasswordLimiter,
  validate({ body: resetPasswordBodySchema }),
  asyncHandler(async (req, res) => {
    const now = new Date();
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(req.body.token) },
      select: { id: true, userId: true, usedAt: true, expiresAt: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
      throw new HttpError(400, INVALID_RESET_TOKEN_MESSAGE);
    }

    const passwordHash = await hashPassword(req.body.password);

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claimed.count !== 1) {
        throw new HttpError(400, INVALID_RESET_TOKEN_MESSAGE);
      }

      const updated = await tx.user.updateMany({
        where: {
          id: resetToken.userId,
          status: "Active",
          isActive: true,
        },
        data: { passwordHash },
      });

      if (updated.count !== 1) {
        throw new HttpError(400, INVALID_RESET_TOKEN_MESSAGE);
      }

      await tx.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });

    return res.json({ message: "Password reset successfully. You can now sign in with your new password." });
  }),
);

authRouter.post(
  "/refresh",
  validate({ body: refreshBodySchema }),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    let claims;
    try {
      claims = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const tokenHash = hashToken(refreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({ message: "Refresh token is expired or revoked" });
    }

    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || user.status !== "Active" || !user.isActive || !user.role) {
      return res.status(401).json({ message: "User unavailable" });
    }

    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const newAccessToken = createAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = createRefreshToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: ttlToDate(env.JWT_REFRESH_TTL),
      },
    });

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: toUserDto(user),
    });
  }),
);

authRouter.post(
  "/logout",
  validate({ body: logoutBodySchema }),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return res.status(204).send();
  }),
);

authRouter.get(
  "/me",
  authGuard,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || user.status !== "Active") {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: toUserDto(user) });
  }),
);
