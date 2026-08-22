import type { DocumentType, ProjectDocumentDTO } from "@icp/shared";

export const GENERAL_PLAN_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/gif";
export const DOCUMENT_UPLOAD_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf";
export const MAX_DOCUMENT_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

const IMAGE_EXTENSION_PATTERN = /\.(?:jpe?g|png|webp|gif)$/i;
const PDF_EXTENSION_PATTERN = /\.pdf$/i;
const DOCUMENT_UPLOAD_EXTENSION_PATTERN = /\.(?:pdf|docx?|xlsx?|dwg|dxf)$/i;
const GENERAL_PLAN_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const DOCUMENT_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/vnd.dwg",
  "image/x-dwg",
  "application/acad",
  "application/x-acad",
  "application/autocad_dwg",
  "application/dwg",
  "application/x-dwg",
  "application/dxf",
  "application/x-dxf",
  "image/vnd.dxf",
]);

export function inferDocumentType(file: Pick<File, "name" | "type">): DocumentType {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  if (mimeType.includes("pdf") || fileName.endsWith(".pdf")) return "PDF";
  if (mimeType.includes("word") || fileName.endsWith(".docx")) return "DOCX";
  if (mimeType.includes("sheet") || fileName.endsWith(".xlsx")) return "XLSX";
  if (fileName.endsWith(".dwg")) return "DWG";
  if (fileName.endsWith(".dxf")) return "DXF";
  return "OTHER";
}

export function isSupportedGeneralPlanFile(file: Pick<File, "name" | "type">): boolean {
  return GENERAL_PLAN_MIME_TYPES.has(file.type)
    || PDF_EXTENSION_PATTERN.test(file.name)
    || IMAGE_EXTENSION_PATTERN.test(file.name);
}

export function isSupportedDocumentUpload(file: Pick<File, "name" | "type">): boolean {
  return DOCUMENT_UPLOAD_MIME_TYPES.has(file.type) || DOCUMENT_UPLOAD_EXTENSION_PATTERN.test(file.name);
}

export function isImageDocument(document: Pick<ProjectDocumentDTO, "name" | "mimeType">): boolean {
  return document.mimeType?.startsWith("image/") || IMAGE_EXTENSION_PATTERN.test(document.name);
}
