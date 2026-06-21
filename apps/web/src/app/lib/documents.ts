import type { DocumentType, ProjectDocumentDTO } from "@icp/shared";

export const GENERAL_PLAN_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/gif";

const IMAGE_EXTENSION_PATTERN = /\.(?:jpe?g|png|webp|gif)$/i;
const PDF_EXTENSION_PATTERN = /\.pdf$/i;
const GENERAL_PLAN_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
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

export function isImageDocument(document: Pick<ProjectDocumentDTO, "name" | "mimeType">): boolean {
  return document.mimeType?.startsWith("image/") || IMAGE_EXTENSION_PATTERN.test(document.name);
}
