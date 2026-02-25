import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/password.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import { validate } from "../../middleware/validate.js";
import {
  approveUserBodySchema,
  createUserBodySchema,
  listUsersQuerySchema,
  rejectUserBodySchema,
  updateUserRoleBodySchema,
  userIdParamSchema,
} from "./schemas.js";
import { HttpError } from "../../utils/httpError.js";

export const usersRouter = Router();

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

async function assertNoDomainDependencies(userId: string) {
  const [projectsCount, elementsCount, documentsCount, activitiesCount, invitesCount] = await Promise.all([
    prisma.project.count({ where: { createdById: userId } }),
    prisma.element.count({ where: { createdById: userId } }),
    prisma.document.count({ where: { uploadedById: userId } }),
    prisma.activity.count({ where: { actorId: userId } }),
    prisma.inviteCode.count({
      where: {
        OR: [{ createdById: userId }, { archivedById: userId }],
      },
    }),
  ]);

  const total = projectsCount + elementsCount + documentsCount + activitiesCount + invitesCount;
  if (total > 0) {
    throw new HttpError(409, "User has related domain records. Archive the user instead of deleting.");
  }
}

usersRouter.get(
  "/me",
  authGuard,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: toUserDto(user) });
  }),
);

usersRouter.post(
  "/",
  authGuard,
  roleGuard("admin"),
  validate({ body: createUserBodySchema }),
  asyncHandler(async (req, res) => {
    const { fullName, email, password, role } = req.body;

    const normalizedEmail = email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const user = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        passwordHash: await hashPassword(password),
        role,
        status: "Active",
        isActive: true,
      },
    });

    return res.status(201).json({ user: toUserDto(user) });
  }),
);

usersRouter.get(
  "/",
  authGuard,
  roleGuard("admin"),
  validate({ query: listUsersQuerySchema }),
  asyncHandler(async (req, res) => {
    const status = (req.query.status as "Pending" | "Active" | "Rejected" | "Archived" | "All") ?? "All";
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;

    const users = await prisma.user.findMany({
      where: {
        ...(status !== "All" ? { status } : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      items: users.map(toUserDto),
      total: users.length,
    });
  }),
);

usersRouter.patch(
  "/:userId/approve",
  authGuard,
  roleGuard("admin"),
  validate({ params: userIdParamSchema, body: approveUserBodySchema }),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        status: "Active",
        isActive: true,
        rejectedReason: null,
      },
    });

    return res.json({ user: toUserDto(user) });
  }),
);

usersRouter.patch(
  "/:userId/reject",
  authGuard,
  roleGuard("admin"),
  validate({ params: userIdParamSchema, body: rejectUserBodySchema }),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        status: "Rejected",
        isActive: false,
        rejectedReason: req.body.reason ?? null,
      },
    });

    return res.json({ user: toUserDto(user) });
  }),
);

usersRouter.patch(
  "/:userId/archive",
  authGuard,
  roleGuard("admin"),
  validate({ params: userIdParamSchema }),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        status: "Archived",
        isActive: false,
      },
    });

    return res.json({ user: toUserDto(user) });
  }),
);

usersRouter.patch(
  "/:userId/role",
  authGuard,
  roleGuard("admin"),
  validate({ params: userIdParamSchema, body: updateUserRoleBodySchema }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!existing) {
      throw new HttpError(404, "User not found");
    }
    if (existing.status !== "Active") {
      throw new HttpError(400, "Role can only be updated for active users");
    }

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { role: req.body.role },
    });
    return res.json({ user: toUserDto(user) });
  }),
);

usersRouter.delete(
  "/:userId",
  authGuard,
  roleGuard("admin"),
  validate({ params: userIdParamSchema }),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (req.user?.id === userId) {
      throw new HttpError(400, "You cannot delete your own account");
    }

    await assertNoDomainDependencies(userId);

    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId } }),
      prisma.inviteUse.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    return res.status(204).send();
  }),
);
