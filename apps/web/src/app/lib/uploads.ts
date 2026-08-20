export class UploadError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
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
