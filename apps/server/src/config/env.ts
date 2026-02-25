import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import { resolveDatabaseUrl } from "./database.js";

const cwd = process.cwd();
dotenv.config();
dotenv.config({ path: path.resolve(cwd, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  MASTER_DB_HOST: z.string().min(1).optional(),
  MASTER_DB_PORT: z.coerce.number().int().positive().optional(),
  MASTER_DB_NAME: z.string().min(1).optional(),
  MASTER_DB_USER: z.string().min(1).optional(),
  MASTER_DB_PASSWORD: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PRESIGNED_EXPIRES_SECONDS: z.coerce.number().int().positive().default(900),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  REGISTER_SMTP_FROM: z.string().min(1).optional(),
  INQUIRY_SMTP_FROM: z.string().min(1).optional(),
  CONTACT_EMAIL: z.string().min(1).optional(),
  PUBLIC_SITE_URL: z.string().url().optional(),
  VITE_PUBLIC_SITE_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

let databaseUrl: string;
try {
  databaseUrl = resolveDatabaseUrl(parsed.data);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid database configuration");
  process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

export const env = {
  ...parsed.data,
  DATABASE_URL: databaseUrl,
};
