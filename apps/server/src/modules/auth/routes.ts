import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { hashToken } from "../../lib/hash.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
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
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
} from "./schemas.js";
import { env } from "../../config/env.js";

export const authRouter = Router();

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
