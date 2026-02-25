import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      details: err.flatten(),
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Resource not found" });
    }
    return res.status(400).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}
