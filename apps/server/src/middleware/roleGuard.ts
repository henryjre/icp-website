import type { RequestHandler } from "express";
import type { Role } from "../types/auth.js";

export function roleGuard(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return next();
  };
}
