import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: false,
});

export function getS3EnvironmentRoot(): "production" | "development" {
  return env.NODE_ENV === "production" ? "production" : "development";
}

export function withS3EnvironmentRoot(key: string): string {
  const root = getS3EnvironmentRoot();
  const normalized = key.replace(/^\/+/, "");
  return `${root}/${normalized}`;
}

export async function createPresignedUploadUrl(input: {
  key: string;
  mimeType: string;
  acl?: "public-read" | "private";
}): Promise<string> {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: input.key,
      ContentType: input.mimeType,
      ACL: input.acl,
    }),
    { expiresIn: env.S3_PRESIGNED_EXPIRES_SECONDS },
  );
}

export async function createPresignedDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
    { expiresIn: env.S3_PRESIGNED_EXPIRES_SECONDS },
  );
}

export async function removeObject(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
  );
}

export function createPublicObjectUrl(key: string): string {
  const base = env.S3_PUBLIC_BASE_URL.replace(/\/+$/, "");
  return `${base}/${key}`;
}
