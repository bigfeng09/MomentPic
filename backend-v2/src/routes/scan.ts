import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { fail, ok } from "../lib/api.js";
import { scanLibraryRoot } from "../services/library-scanner.js";

interface ScanTaskRow {
  id: string;
  status: string;
  dry_run: number;
  gallery_id: string | null;
  created_by: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  albums_discovered: number;
  assets_discovered: number;
}

const toDto = (row: ScanTaskRow) => ({
  taskId: row.id,
  status: row.status,
  dryRun: Boolean(row.dry_run),
  galleryId: row.gallery_id,
  createdBy: row.created_by,
  createdAt: row.created_at,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  error: row.error,
  albumsDiscovered: row.albums_discovered,
  assetsDiscovered: row.assets_discovered
});

export const scanRoutes = async (app: FastifyInstance): Promise<void> => {
  const requireAdmin = (request: { authUser?: { role: string } }, reply: { status: (code: number) => { send: (payload: unknown) => unknown } }) => {
    if (request.authUser?.role === "admin") return true;
    reply.status(403).send(fail(4030, "admin only"));
    return false;
  };

  app.post("/api/v2/scan", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const body = request.body as { dryRun?: unknown; galleryId?: unknown } | undefined;
    const dryRun = body?.dryRun !== false;
    const galleryId = body?.galleryId == null ? null : String(body.galleryId).trim();
    if (galleryId) {
      try {
        const result = await scanLibraryRoot(app.db, app.config, galleryId, dryRun);
        app.db
          .prepare(
            `INSERT INTO scan_tasks (id, status, dry_run, gallery_id, created_by, created_at, started_at, finished_at, albums_discovered, assets_discovered)
             VALUES (?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(result.taskId, dryRun ? 1 : 0, galleryId, request.authUser!.username, new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), result.discovered.albums, result.discovered.assets);
        return ok(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "scan failed";
        const status = message === "gallery not found" ? 404 : 400;
        return reply.status(status).send(fail(status === 404 ? 4004 : 4000, message));
      }
    }
    if (!dryRun) {
      return reply.status(400).send(fail(4000, "galleryId is required for dryRun=false"));
    }
    const taskId = `scan_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();
    const albumFilter = galleryId ? "WHERE library_root_id = ?" : "";
    const albumParams = galleryId ? [galleryId] : [];
    const albums = (app.db.prepare(`SELECT COUNT(*) AS total FROM albums ${albumFilter}`).get(...albumParams) as { total: number }).total;
    const assets = (
      galleryId
        ? (app.db
            .prepare("SELECT COUNT(*) AS total FROM assets WHERE album_id IN (SELECT id FROM albums WHERE library_root_id = ?)")
            .get(galleryId) as { total: number })
        : (app.db.prepare("SELECT COUNT(*) AS total FROM assets").get() as { total: number })
    ).total;
    app.db
      .prepare(
        `INSERT INTO scan_tasks (id, status, dry_run, gallery_id, created_by, created_at, started_at, finished_at, albums_discovered, assets_discovered)
         VALUES (?, 'completed', 1, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(taskId, galleryId, request.authUser!.username, now, now, now, albums, assets);
    return ok({ taskId, status: "completed", dryRun: true, albumsDiscovered: albums, assetsDiscovered: assets });
  });

  app.get("/api/v2/scan/:taskId", async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const row = app.db.prepare("SELECT * FROM scan_tasks WHERE id = ?").get(taskId) as ScanTaskRow | undefined;
    if (!row) return reply.status(404).send(fail(4004, "scan task not found"));
    return ok(toDto(row));
  });

  app.get("/api/v2/scan", async () => {
    const rows = app.db.prepare("SELECT * FROM scan_tasks ORDER BY created_at DESC LIMIT 50").all() as unknown as ScanTaskRow[];
    return ok({ items: rows.map(toDto) });
  });
};
