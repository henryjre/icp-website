import { z } from "zod";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

export const elementIdParamSchema = z.object({
  elementId: z.string().min(1),
});

export const projectIdParamSchema = z.object({
  projectId: z.string().min(1),
});

export const projectDocumentParamSchema = z.object({
  projectId: z.string().min(1),
  documentId: z.string().min(1),
});

export const documentIdParamSchema = z.object({
  documentId: z.string().min(1),
});

export const uploadUrlBodySchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES, "File must be 25 MB or smaller."),
});

export const finalizeElementDocumentBodySchema = z.object({
  name: z.string().min(1),
  category: z.enum(["TEST_RESULT", "PLAN"]),
  docType: z.enum(["PDF", "DOCX", "XLSX", "DWG", "DXF", "OTHER"]),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES, "File must be 25 MB or smaller."),
  mimeType: z.string().min(1),
  s3Key: z.string().min(1),
  isConfidential: z.boolean().default(false),
});

export const finalizeProjectDocumentBodySchema = z.object({
  name: z.string().min(1),
  category: z.enum(["PROJECT_GENERAL", "PROJECT_PLAN"]),
  docType: z.enum(["PDF", "DOCX", "XLSX", "DWG", "DXF", "OTHER"]),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES, "File must be 25 MB or smaller."),
  mimeType: z.string().min(1),
  s3Key: z.string().min(1),
  isConfidential: z.boolean().default(false),
});

export const updateDocumentBodySchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["TEST_RESULT", "PLAN", "PROJECT_GENERAL", "PROJECT_PLAN"]).optional(),
  docType: z.enum(["PDF", "DOCX", "XLSX", "DWG", "DXF", "OTHER"]).optional(),
  isConfidential: z.boolean().optional(),
});
