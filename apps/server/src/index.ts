import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";

const app = createApp();
let isShuttingDown = false;

const server = app.listen(env.PORT, async () => {
  console.log(`API server listening on http://localhost:${env.PORT}`);
  try {
    await prisma.$queryRaw`SELECT 1`;
    if (typeof process.send === "function") {
      process.send("ready");
    }
  } catch (error) {
    console.error("Database readiness check failed during startup", error);
    server.close(() => process.exit(1));
  }
});

async function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received; finishing active requests`);
  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out");
    process.exit(1);
  }, 9_000);
  forceExit.unref();

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } finally {
      clearTimeout(forceExit);
      if (error) {
        console.error("HTTP server shutdown failed", error);
        process.exit(1);
      }
      process.exit(0);
    }
  });

  server.closeIdleConnections?.();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
