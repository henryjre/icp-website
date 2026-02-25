import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import dotenv from "dotenv";
import { resolveDatabaseUrl } from "../config/database.js";

const cwd = process.cwd();
dotenv.config();
dotenv.config({ path: path.resolve(cwd, "../../.env") });

try {
  process.env.DATABASE_URL = resolveDatabaseUrl({
    DATABASE_URL: process.env.DATABASE_URL,
    MASTER_DB_HOST: process.env.MASTER_DB_HOST,
    MASTER_DB_PORT: process.env.MASTER_DB_PORT,
    MASTER_DB_NAME: process.env.MASTER_DB_NAME,
    MASTER_DB_USER: process.env.MASTER_DB_USER,
    MASTER_DB_PASSWORD: process.env.MASTER_DB_PASSWORD,
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Unable to resolve database URL");
  process.exit(1);
}

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Usage: tsx src/scripts/prisma.ts <prisma args>");
  process.exit(1);
}

const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve("prisma/build/index.js");
const child = spawn(process.execPath, [prismaCliPath, ...prismaArgs], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
