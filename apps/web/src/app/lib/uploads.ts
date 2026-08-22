export class UploadError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

export function getUploadErrorMessage(error: unknown, context = "file"): string {
  if (error instanceof UploadError) {
    if (error.status === 403) {
      return `File storage could not accept this ${context}. Please try again or ask an administrator to check upload access.`;
    }

    if (error.status === 404) {
      return `The upload location for this ${context} was not found. Please try again.`;
    }

    if (error.status === 408 || error.status === 409 || error.status === 410) {
      return `The upload session for this ${context} expired. Please select the file again and retry.`;
    }

    if (error.status === 413) {
      return `This ${context} is too large to upload.`;
    }

    if (error.status && error.status >= 500) {
      return `File storage is unavailable right now. Please try again in a few minutes.`;
    }

    return `Unable to upload this ${context}. Please check your connection and try again.`;
  }

  return `Unable to upload this ${context} right now. Please try again.`;
}

export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: File,
  options?: { acl?: "public-read" | "private"; contentType?: string },
): Promise<void> {
  const contentType = options?.contentType ?? (file.type || "application/octet-stream");
  const headers = new Headers({ "Content-Type": contentType });

  if (options?.acl) {
    headers.set("x-amz-acl", options.acl);
  }

  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: file,
    });
  } catch (error) {
    throw new UploadError(error instanceof Error ? error.message : "Unable to reach file storage");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const detail = body.trim().replace(/\s+/g, " ").slice(0, 180);
    throw new UploadError(
      `File storage rejected the upload (${response.status}${response.statusText ? ` ${response.statusText}` : ""})${detail ? `: ${detail}` : ""}`,
      response.status,
    );
  }
}
