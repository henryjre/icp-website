import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { authGuard } from "../../middleware/authGuard.js";
import { roleGuard } from "../../middleware/roleGuard.js";
import { validate } from "../../middleware/validate.js";
import { activityQuerySchema, elementIdActivityParamSchema, projectIdActivityParamSchema } from "./schemas.js";
import { mapActivity } from "../_shared/mappers.js";

export const activityRouter = Router();

const projectActivityWhere = (projectId: string): Prisma.ActivityWhereInput => ({
  projectId,
  NOT: {
    elementId: { not: null },
    type: { in: ["updated", "document", "comment"] },
  },
});

activityRouter.get(
  "/projects/:projectId/activity",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: projectIdActivityParamSchema, query: activityQuerySchema }),
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = 10;
    const skip = (page - 1) * pageSize;
    const total = await prisma.activity.count({
      where: projectActivityWhere(req.params.projectId),
    });
    const activities = await prisma.activity.findMany({
      where: projectActivityWhere(req.params.projectId),
      include: { actor: true },
      orderBy: { occurredAt: "desc" },
      skip,
      take: pageSize,
    });

    return res.json({
      items: activities.map(mapActivity),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }),
);

activityRouter.get(
  "/elements/:elementId/activity",
  authGuard,
  roleGuard("admin", "editor"),
  validate({ params: elementIdActivityParamSchema, query: activityQuerySchema }),
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = 10;
    const skip = (page - 1) * pageSize;
    const total = await prisma.activity.count({
      where: { elementId: req.params.elementId },
    });
    const activities = await prisma.activity.findMany({
      where: { elementId: req.params.elementId },
      include: { actor: true },
      orderBy: { occurredAt: "desc" },
      skip,
      take: pageSize,
    });

    return res.json({
      items: activities.map(mapActivity),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  }),
);
