import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing bearer token" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const claims = verifyAccessToken(token);
    req.user = {
      id: claims.sub,
      email: claims.email,
      role: claims.role,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
}
