import express from "express";
import cors from "cors";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes.js";
import { shortLinksRouter } from "./modules/elements/shortLinks.js";
import { prisma } from "./lib/prisma.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  // Public short QR links: /e/:token
  app.use("/e", shortLinksRouter);
  app.use("/api", apiRouter);

  app.use((req, res) => {
    res.status(404).json({ message: "That page or resource could not be found." });
  });

  app.use(errorHandler);

  return app;
}
