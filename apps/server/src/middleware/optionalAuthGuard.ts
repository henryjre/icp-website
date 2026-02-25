import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

export function optionalAuthGuard(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next();
  }

  const token = header.slice("Bearer ".length);

  try {
    const claims = verifyAccessToken(token);
    req.user = {
      id: claims.sub,
      email: claims.email,
      role: claims.role,
    };
  } catch {
    req.user = undefined;
  }

  return next();
}
