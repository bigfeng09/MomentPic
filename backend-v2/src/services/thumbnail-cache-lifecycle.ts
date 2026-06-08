import fs from "node:fs";
import path from "node:path";
import type { AppConfig } from "../config.js";

export interface ThumbnailCacheStatus {
  cacheDir: string;
  exists: boolean;
  files: number;
  bytes: number;
  oldestMtime: string | null;
  newestMtime: string | null;
}

export interface ThumbnailCachePruneResult extends ThumbnailCacheStatus {
  dryRun: boolean;
  deletedFiles: number;
  deletedBytes: number;
  candidates: number;
}

interface CacheFile {
  path: string;
  size: number;
  mtimeMs: number;
}

const listCacheFiles = (dir: string): CacheFile[] => {
  const files: CacheFile[] = [];
  const walk = (current: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".jpg") continue;
      try {
        const stat = fs.statSync(entryPath);
        files.push({ path: entryPath, size: stat.size, mtimeMs: stat.mtimeMs });
      } catch {
        // Ignore files that disappear during status/prune.
      }
    }
  };
  walk(dir);
  return files;
};

const summarize = (cacheDir: string, files: CacheFile[]): ThumbnailCacheStatus => {
  let bytes = 0;
  let oldest = Number.POSITIVE_INFINITY;
  let newest = 0;
  for (const file of files) {
    bytes += file.size;
    oldest = Math.min(oldest, file.mtimeMs);
    newest = Math.max(newest, file.mtimeMs);
  }
  return {
    cacheDir,
    exists: fs.existsSync(cacheDir),
    files: files.length,
    bytes,
    oldestMtime: Number.isFinite(oldest) ? new Date(oldest).toISOString() : null,
    newestMtime: newest > 0 ? new Date(newest).toISOString() : null
  };
};

export const thumbnailCacheStatus = (config: AppConfig): ThumbnailCacheStatus => {
  const files = listCacheFiles(config.thumbnailCacheDir);
  return summarize(config.thumbnailCacheDir, files);
};

export const pruneThumbnailCache = (
  config: AppConfig,
  options: { dryRun: boolean; olderThanDays?: number; maxFiles?: number }
): ThumbnailCachePruneResult => {
  const files = listCacheFiles(config.thumbnailCacheDir).sort((left, right) => left.mtimeMs - right.mtimeMs);
  const cutoff =
    options.olderThanDays && Number.isFinite(options.olderThanDays) && options.olderThanDays > 0
      ? Date.now() - options.olderThanDays * 24 * 60 * 60 * 1000
      : null;
  const keepNewest = options.maxFiles && Number.isFinite(options.maxFiles) && options.maxFiles >= 0 ? Math.trunc(options.maxFiles) : null;
  const overflow = keepNewest === null ? new Set<string>() : new Set(files.slice(0, Math.max(0, files.length - keepNewest)).map((file) => file.path));
  const candidates = files.filter((file) => (cutoff !== null && file.mtimeMs < cutoff) || overflow.has(file.path));

  let deletedFiles = 0;
  let deletedBytes = 0;
  if (!options.dryRun) {
    for (const file of candidates) {
      try {
        fs.unlinkSync(file.path);
        deletedFiles += 1;
        deletedBytes += file.size;
      } catch {
        // Prune is best-effort; status after prune reflects what remains.
      }
    }
  }

  const after = thumbnailCacheStatus(config);
  return {
    ...after,
    dryRun: options.dryRun,
    candidates: candidates.length,
    deletedFiles,
    deletedBytes
  };
};
