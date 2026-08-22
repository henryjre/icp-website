import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodIssue } from "zod";
import { HttpError } from "../utils/httpError.js";

const FIELD_LABELS: Record<string, string> = {
  client: "Client",
  documentId: "Document",
  elementId: "Element",
  elementToken: "Element link",
  email: "Email address",
  expiresAt: "Expiration date",
  fileName: "File name",
  fullName: "Full name",
  inviteCode: "Invite code",
  inviteId: "Invite",
  location: "Location",
  maxUses: "Maximum uses",
  message: "Message",
  mimeType: "File type",
  name: "Name",
  password: "Password",
  projectId: "Project",
  refreshToken: "Session",
  role: "Role",
  s3Key: "Uploaded file",
  serialNumber: "Serial number",
  subject: "Subject",
  toEmail: "Recipient email address",
  token: "Reset link",
  userId: "User",
};

function fieldLabel(issue: ZodIssue) {
  const field = String(issue.path.at(-1) ?? "field");
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function formatZodIssue(issue: ZodIssue) {
  const label = fieldLabel(issue);

  if (issue.code === "invalid_type") {
    return `Please enter ${label.toLowerCase()}.`;
  }

  if (issue.code === "invalid_string") {
    if (issue.validation === "email") {
      return `Please enter a valid ${label.toLowerCase()}.`;
    }
    return issue.message;
  }

  if (issue.code === "too_small" && issue.type === "string") {
    return `${label} must be at least ${issue.minimum} characters.`;
  }

  if (issue.code === "too_big" && issue.type === "string") {
    return `${label} must be ${issue.maximum} characters or less.`;
  }

  if (issue.code === "invalid_enum_value") {
    return `Please choose a valid ${label.toLowerCase()}.`;
  }

  return issue.message;
}

function formatZodError(error: ZodError) {
  return error.issues.map(formatZodIssue)[0] ?? "Please check the form and try again.";
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: formatZodError(err),
      details: err.flatten(),
    });
  }

  if (err instanceof HttpError) {
    if (err.statusCode >= 500) {
      console.error(err);
      return res.status(err.statusCode).json({ message: "Something went wrong on our end. Please try again later." });
    }

    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Resource not found" });
    }
    if (err.code === "P2002") {
      return res.status(409).json({ message: "A record with these details already exists." });
    }
    console.error(err);
    return res.status(400).json({ message: "Unable to save your changes. Please check the information and try again." });
  }

  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}
