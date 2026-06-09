import crypto from "node:crypto";
import type { AppConfig } from "../config.js";
import type { Database } from "../db/connection.js";
import { scanLibraryRoot, type LibraryScanResult, type ScanProgress } from "./library-scanner.js";

export interface ScanTaskRow {
  id: string;
  status: string;
  dry_run: number;
  gallery_id: string | null;
  created_by: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  progress_phase: ScanProgress["phase"] | null;
  fast_scan: number;
  albums_discovered: number;
  assets_discovered: number;
  skipped_files: number;
  unchanged_albums: number;
  unchanged_assets: number;
}

export interface ScanTaskDto {
  taskId: string;
  status: string;
  dryRun: boolean;
  galleryId: string | null;
  createdBy: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  progressPhase: ScanProgress["phase"] | null;
  albumsDiscovered: number;
  assetsDiscovered: number;
  skippedFiles: number;
  unchangedAlbums: number;
  unchangedAssets: number;
}

export interface ScanTaskRunner {
  enqueue(input: { dryRun: boolean; galleryId: string | null; createdBy: string; fast?: boolean }): ScanTaskDto;
  get(taskId: string): ScanTaskDto | null;
  latestActive(): ScanTaskDto | null;
  list(limit?: number): ScanTaskDto[];
}

const toDto = (row: ScanTaskRow): ScanTaskDto => ({
  taskId: row.id,
  status: row.status,
  dryRun: Boolean(row.dry_run),
  galleryId: row.gallery_id,
  createdBy: row.created_by,
  createdAt: row.created_at,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  error: row.error?.startsWith("phase:") || row.error === "mode:fast" ? null : row.error,
  progressPhase: row.progress_phase ?? (row.error?.startsWith("phase:") ? (row.error.slice("phase:".length) as ScanProgress["phase"]) : null),
  albumsDiscovered: row.albums_discovered,
  assetsDiscovered: row.assets_discovered,
  skippedFiles: row.skipped_files,
  unchangedAlbums: row.unchanged_albums,
  unchangedAssets: row.unchanged_assets
});

const scanTaskId = (): string => `scan_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

export const createScanTaskRunner = (db: Database, config: AppConfig): ScanTaskRunner => {
  let processing = false;

  db.prepare(
    `UPDATE scan_tasks
     SET status = 'failed',
         finished_at = ?,
         progress_phase = COALESCE(progress_phase, CASE WHEN error LIKE 'phase:%' THEN substr(error, 7) ELSE NULL END),
         error = CASE
           WHEN error IS NULL OR error LIKE 'phase:%' OR error = 'mode:fast' THEN 'scan interrupted by service restart'
           ELSE error
         END
     WHERE status IN ('queued', 'running')`
  ).run(new Date().toISOString());

  const read = (taskId: string): ScanTaskDto | null => {
    const row = db.prepare("SELECT * FROM scan_tasks WHERE id = ?").get(taskId) as ScanTaskRow | undefined;
    return row ? toDto(row) : null;
  };

  const schedule = (): void => {
    if (processing) return;
    processing = true;
    setImmediate(() => {
      void processQueue();
    });
  };

  const markRunning = (taskId: string): void => {
    db.prepare("UPDATE scan_tasks SET status = 'running', started_at = ? WHERE id = ?").run(new Date().toISOString(), taskId);
  };

  const markFinished = (
    taskId: string,
    status: "completed" | "failed",
    albums: number,
    assets: number,
    skippedFiles: number,
    unchangedAlbums: number,
    unchangedAssets: number,
    error: string | null
  ): void => {
    db.prepare(
      `UPDATE scan_tasks
       SET status = ?, finished_at = ?, error = ?, albums_discovered = ?, assets_discovered = ?,
           skipped_files = ?, unchanged_albums = ?, unchanged_assets = ?
       WHERE id = ?`
    ).run(status, new Date().toISOString(), error, albums, assets, skippedFiles, unchangedAlbums, unchangedAssets, taskId);
  };

  const markProgress = (taskId: string, progress: ScanProgress): void => {
    db.prepare(
      `UPDATE scan_tasks
       SET albums_discovered = ?, assets_discovered = ?, progress_phase = ?
       WHERE id = ? AND status = 'running'`
    ).run(progress.albums, progress.assets, progress.phase, taskId);
  };

  const runTask = async (task: ScanTaskRow): Promise<void> => {
    markRunning(task.id);
    const dryRun = Boolean(task.dry_run);
    const results: LibraryScanResult[] = [];
    const errors: string[] = [];

    if (task.gallery_id) {
      const fastRefresh = task.fast_scan === 1 || task.error === "mode:fast";
      const result = await scanLibraryRoot(db, config, task.gallery_id, dryRun, {
        mode: fastRefresh ? "incremental" : "discover",
        includeArchives: true,
        includeImageMetadata: false,
        onProgress: (progress) => markProgress(task.id, progress)
      });
      results.push(result);
    } else {
      const roots = db.prepare("SELECT id FROM library_roots WHERE enabled = 1 ORDER BY name COLLATE NOCASE ASC, id ASC").all() as Array<{ id: string }>;
      for (const root of roots) {
        try {
          const fastRefresh = task.fast_scan === 1 || task.error === "mode:fast";
          results.push(
            await scanLibraryRoot(db, config, root.id, dryRun, {
              mode: fastRefresh ? "incremental" : "discover",
              includeArchives: true,
              includeImageMetadata: false,
              onProgress: (progress) => {
                const completedAlbums = results.reduce((sum, result) => sum + result.discovered.albums, 0);
                const completedAssets = results.reduce((sum, result) => sum + result.discovered.assets, 0);
                markProgress(task.id, {
                  albums: completedAlbums + progress.albums,
                  assets: completedAssets + progress.assets,
                  phase: progress.phase
                });
              }
            })
          );
        } catch (error) {
          errors.push(`${root.id}: ${error instanceof Error ? error.message : "scan failed"}`);
        }
      }
    }

    const albums = results.reduce((sum, result) => sum + result.discovered.albums, 0);
    const assets = results.reduce((sum, result) => sum + result.discovered.assets, 0);
    const skippedFiles = results.reduce((sum, result) => sum + result.changes.skippedFiles, 0);
    const unchangedAlbums = results.reduce((sum, result) => sum + result.changes.unchangedAlbums, 0);
    const unchangedAssets = results.reduce((sum, result) => sum + result.changes.unchangedAssets, 0);
    if (results.length === 0 && errors.length > 0) {
      markFinished(task.id, "failed", albums, assets, skippedFiles, unchangedAlbums, unchangedAssets, errors.join("; "));
      return;
    }
    markFinished(task.id, "completed", albums, assets, skippedFiles, unchangedAlbums, unchangedAssets, errors.length ? errors.join("; ") : null);
  };

  const processQueue = async (): Promise<void> => {
    try {
      while (true) {
        const task = db.prepare("SELECT * FROM scan_tasks WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1").get() as ScanTaskRow | undefined;
        if (!task) return;
        try {
          await runTask(task);
        } catch (error) {
          markFinished(task.id, "failed", 0, 0, 0, 0, 0, error instanceof Error ? error.message : "scan failed");
        }
      }
    } finally {
      processing = false;
      const remaining = db.prepare("SELECT id FROM scan_tasks WHERE status = 'queued' LIMIT 1").get() as { id: string } | undefined;
      if (remaining) schedule();
    }
  };

  return {
    enqueue(input) {
      const taskId = scanTaskId();
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO scan_tasks (id, status, dry_run, gallery_id, created_by, created_at, error, progress_phase, fast_scan, albums_discovered, assets_discovered, skipped_files, unchanged_albums, unchanged_assets)
         VALUES (?, 'queued', ?, ?, ?, ?, NULL, NULL, ?, 0, 0, 0, 0, 0)`
      ).run(taskId, input.dryRun ? 1 : 0, input.galleryId, input.createdBy, now, input.fast === false ? 0 : 1);
      schedule();
      const task = read(taskId);
      if (!task) throw new Error("scan task create failed");
      return task;
    },
    get: read,
    latestActive() {
      const row = db
        .prepare("SELECT * FROM scan_tasks WHERE status IN ('queued', 'running') ORDER BY created_at DESC LIMIT 1")
        .get() as ScanTaskRow | undefined;
      return row ? toDto(row) : null;
    },
    list(limit = 50) {
      const rows = db.prepare("SELECT * FROM scan_tasks ORDER BY created_at DESC LIMIT ?").all(limit) as unknown as ScanTaskRow[];
      return rows.map(toDto);
    }
  };
};
