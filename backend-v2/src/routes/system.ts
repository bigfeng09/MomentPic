import type { FastifyInstance, FastifyRequest } from "fastify";
import { fail, ok } from "../lib/api.js";
import { archiveReadiness } from "../services/archive-zip.js";
import { thumbnailCacheStatus } from "../services/thumbnail-cache-lifecycle.js";

interface SystemConfigRow {
  enable_polling: number;
  polling_interval: number;
  preload_before: number;
  preload_after: number;
  updated_at: string;
}

interface CurrentUserRow {
  username: string;
  role: string;
  password_reset_required: number;
  created_at: string;
  updated_at: string;
}

const backendUrlFor = (request: FastifyRequest): string => {
  const forwardedProto = String(request.headers["x-forwarded-proto"] ?? "").split(",")[0]?.trim();
  const proto = forwardedProto || (request.protocol === "https" ? "https" : "http");
  const host = request.headers.host || `127.0.0.1:${request.server.config.port}`;
  return `${proto}://${host}`;
};

export const systemRoutes = async (app: FastifyInstance): Promise<void> => {
  const requireAdmin = (request: { authUser?: { role: string } }, reply: { status: (code: number) => { send: (payload: unknown) => unknown } }) => {
    if (request.authUser?.role === "admin") return true;
    reply.status(403).send(fail(4030, "admin only"));
    return false;
  };

  const readSystemConfig = (): SystemConfigRow | undefined =>
    app.db
      .prepare("SELECT enable_polling, polling_interval, preload_before, preload_after, updated_at FROM system_config WHERE id = 'system_config'")
      .get() as SystemConfigRow | undefined;

  app.get("/api/v2/system/status", async (request) => {
    const systemConfig = readSystemConfig();
    const currentUser = app.db
      .prepare("SELECT username, role, password_reset_required, created_at, updated_at FROM users WHERE username = ?")
      .get(request.authUser!.username) as CurrentUserRow | undefined;
    const counts = {
      galleries: (app.db.prepare("SELECT COUNT(*) AS total FROM library_roots").get() as { total: number }).total,
      albums: (app.db.prepare("SELECT COUNT(*) AS total FROM albums").get() as { total: number }).total,
      assets: (app.db.prepare("SELECT COUNT(*) AS total FROM assets").get() as { total: number }).total,
      users: request.authUser!.role === "admin" ? (app.db.prepare("SELECT COUNT(*) AS total FROM users").get() as { total: number }).total : undefined,
      publicShares:
        request.authUser!.role === "admin" ? (app.db.prepare("SELECT COUNT(*) AS total FROM public_shares").get() as { total: number }).total : undefined
    };
    const latestScan = app.db.prepare("SELECT id, status, dry_run, created_at, finished_at FROM scan_tasks ORDER BY created_at DESC LIMIT 1").get() as
      | { id: string; status: string; dry_run: number; created_at: string; finished_at: string | null }
      | undefined;

    return ok({
      backendUrl: backendUrlFor(request),
      health: { status: "ok", version: "v2" },
      user: currentUser
        ? {
            username: currentUser.username,
            role: currentUser.role,
            passwordResetRequired: Boolean(currentUser.password_reset_required),
            createdAt: currentUser.created_at,
            updatedAt: currentUser.updated_at
          }
        : request.authUser,
      systemConfig: systemConfig
        ? {
            enablePolling: Boolean(systemConfig.enable_polling),
            pollingInterval: systemConfig.polling_interval,
            preloadBefore: systemConfig.preload_before,
            preloadAfter: systemConfig.preload_after,
            updatedAt: systemConfig.updated_at
          }
        : null,
      archiveReadiness: archiveReadiness(),
      cacheStatus: thumbnailCacheStatus(app.config),
      counts,
      scan: latestScan
        ? {
            taskId: latestScan.id,
            status: latestScan.status,
            dryRun: Boolean(latestScan.dry_run),
            createdAt: latestScan.created_at,
            finishedAt: latestScan.finished_at
          }
        : null,
      runtime: {
        thumbnailMaxSize: app.config.thumbnailMaxSize,
        archiveEntryMaxBytes: app.config.archiveEntryMaxBytes,
        cookieTtlSeconds: app.config.cookieTtlSeconds,
        seedDemoData: app.config.seedDemoData,
        pathPrefixMapRules: app.config.pathPrefixMap.length
      }
    });
  });

  app.patch("/api/v2/system/config", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const body = request.body as { preloadBefore?: unknown; preloadAfter?: unknown } | undefined;
    const parsePreload = (value: unknown, label: string): number => {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 5) throw new Error(`${label} must be an integer from 0 to 5`);
      return parsed;
    };

    try {
      const preloadBefore = parsePreload(body?.preloadBefore, "preloadBefore");
      const preloadAfter = parsePreload(body?.preloadAfter, "preloadAfter");
      const now = new Date().toISOString();
      app.db
        .prepare(
          `INSERT INTO system_config (id, enable_polling, polling_interval, preload_before, preload_after, created_at, updated_at)
           VALUES ('system_config', 1, 60000, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             preload_before = excluded.preload_before,
             preload_after = excluded.preload_after,
             updated_at = excluded.updated_at`
        )
        .run(preloadBefore, preloadAfter, now, now);
      const systemConfig = readSystemConfig();
      return ok(
        systemConfig
          ? {
              enablePolling: Boolean(systemConfig.enable_polling),
              pollingInterval: systemConfig.polling_interval,
              preloadBefore: systemConfig.preload_before,
              preloadAfter: systemConfig.preload_after,
              updatedAt: systemConfig.updated_at
            }
          : null
      );
    } catch (error) {
      return reply.status(400).send(fail(4000, error instanceof Error ? error.message : "system config update failed"));
    }
  });
};
