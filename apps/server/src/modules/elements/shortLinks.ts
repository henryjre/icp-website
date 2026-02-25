import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import { HttpError } from "../../utils/httpError.js";

export const shortLinksRouter = Router();
export const shortLookupRouter = Router();

const tokenParamSchema = z.object({ token: z.string().min(1) });
const projectCodeParamSchema = z.object({ projectCode: z.string().trim().regex(/^PRJ\d+$/) });
const projectElementParamSchema = z.object({
  projectCode: z.string().trim().regex(/^PRJ\d+$/),
  elementToken: z.string().trim().min(1),
});

function isPRoute(baseUrl: string): boolean {
  return /\/p$/.test(baseUrl);
}

function isERoute(baseUrl: string): boolean {
  return /\/e$/.test(baseUrl);
}

shortLinksRouter.get(
  "/:projectCode/e/:elementToken",
  validate({ params: projectElementParamSchema }),
  asyncHandler(async (req, res, next) => {
    if (!isPRoute(req.baseUrl)) {
      return next("route");
    }

    const element = await prisma.element.findFirst({
      where: {
        shortToken: req.params.elementToken,
        project: { projectCode: req.params.projectCode },
      },
      select: { id: true, projectId: true },
    });

    if (!element) {
      throw new HttpError(404, "Element not found");
    }

    const siteUrl = (process.env.PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
    const destination = `${siteUrl}/projects/${req.params.projectCode}/e/${req.params.elementToken}`;
    res.redirect(302, destination);
  }),
);

shortLinksRouter.get(
  "/:projectCode",
  validate({ params: projectCodeParamSchema }),
  asyncHandler(async (req, res, next) => {
    if (!isPRoute(req.baseUrl)) {
      return next("route");
    }

    const project = await prisma.project.findUnique({
      where: { projectCode: req.params.projectCode },
      select: { id: true },
    });

    if (!project) {
      throw new HttpError(404, "Project not found");
    }

    const siteUrl = (process.env.PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
    const destination = `${siteUrl}/projects/${req.params.projectCode}`;
    res.redirect(302, destination);
  }),
);

shortLinksRouter.get(
  "/:token",
  validate({ params: tokenParamSchema }),
  asyncHandler(async (req, res, next) => {
    if (!isERoute(req.baseUrl)) {
      return next("route");
    }

    const element = await prisma.element.findUnique({
      where: { shortToken: req.params.token },
      select: {
        shortToken: true,
        project: { select: { projectCode: true } },
      },
    });

    if (!element) {
      throw new HttpError(404, "Short link not found");
    }

    if (!element.project.projectCode) {
      throw new HttpError(404, "Project short link not available");
    }

    const siteUrl = (process.env.PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
    const destination = `${siteUrl}/projects/${element.project.projectCode}/e/${element.shortToken}`;
    res.redirect(302, destination);
  }),
);

shortLookupRouter.get(
  "/projects/:projectCode",
  validate({ params: projectCodeParamSchema }),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { projectCode: req.params.projectCode },
      select: { id: true, projectCode: true },
    });

    if (!project) {
      throw new HttpError(404, "Project not found");
    }

    res.json({
      projectId: project.id,
      projectCode: project.projectCode,
    });
  }),
);

shortLookupRouter.get(
  "/projects/:projectCode/elements/:elementToken",
  validate({ params: projectElementParamSchema }),
  asyncHandler(async (req, res) => {
    const element = await prisma.element.findFirst({
      where: {
        shortToken: req.params.elementToken,
        project: { projectCode: req.params.projectCode },
      },
      select: { id: true, projectId: true, shortToken: true },
    });

    if (!element) {
      throw new HttpError(404, "Element not found");
    }

    res.json({
      projectId: element.projectId,
      elementId: element.id,
      elementToken: element.shortToken,
      projectCode: req.params.projectCode,
    });
  }),
);

shortLookupRouter.get(
  "/elements/:token",
  validate({ params: tokenParamSchema }),
  asyncHandler(async (req, res) => {
    const element = await prisma.element.findUnique({
      where: { shortToken: req.params.token },
      select: {
        id: true,
        projectId: true,
        shortToken: true,
        project: { select: { projectCode: true } },
      },
    });

    if (!element || !element.project.projectCode) {
      throw new HttpError(404, "Short link not found");
    }

    res.json({
      projectId: element.projectId,
      elementId: element.id,
      elementToken: element.shortToken,
      projectCode: element.project.projectCode,
    });
  }),
);
