import Fastify, { type FastifyInstance } from "fastify";
import { loadConfig, type AppConfig } from "./config.js";
import { openDatabase, type Database } from "./db/connection.js";
import { migrate } from "./db/migrate.js";
import { seed } from "./db/seed.js";
import { fail } from "./lib/api.js";
import { getAuthUser } from "./lib/auth.js";
import { albumRoutes } from "./routes/albums.js";
import { assetRoutes } from "./routes/assets.js";
import { authRoutes } from "./routes/auth.js";
import { cacheRoutes } from "./routes/cache.js";
import { galleryRoutes } from "./routes/galleries.js";
import { healthRoutes } from "./routes/health.js";
import { scanRoutes } from "./routes/scan.js";
import { shareRoutes } from "./routes/shares.js";
import { systemRoutes } from "./routes/system.js";
import { createScanTaskRunner, type ScanTaskRunner } from "./services/scan-task-runner.js";
import { getWebAppHtml } from "./web-app.js";

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig;
    db: Database;
    scanTasks: ScanTaskRunner;
  }
}

const publicPaths = new Set(["/api/v2/health", "/api/v2/auth/login"]);

export const buildApp = async (overrides: Partial<AppConfig> = {}): Promise<FastifyInstance> => {
  const config = loadConfig(overrides);
  const db = openDatabase(config.dbPath);
  migrate(db);
  if (config.seedDemoData) seed(db, config);

  const app = Fastify({ logger: true });
  app.decorate("config", config);
  app.decorate("db", db);
  app.decorate("scanTasks", createScanTaskRunner(db, config));

  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/api/v2/") || publicPaths.has(request.url.split("?")[0] ?? request.url)) return;
    const authUser = getAuthUser(request, config);
    if (!authUser) {
      reply.status(401).send(fail(4010, "unauthorized"));
      return;
    }
    request.authUser = authUser;
  });

  app.addHook("onClose", async () => {
    db.close();
  });

  app.get("/", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(getWebAppHtml());
  });

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(galleryRoutes);
  await app.register(albumRoutes);
  await app.register(assetRoutes);
  await app.register(shareRoutes);
  await app.register(scanRoutes);
  await app.register(cacheRoutes);
  await app.register(systemRoutes);

  return app;
};
