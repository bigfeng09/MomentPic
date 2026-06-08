import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { AppConfig } from "../config.js";
import type { Database } from "../db/connection.js";
import { assertSafeLibraryPath } from "./library-root-path.js";

interface LibraryRootRow {
  id: string;
  name: string;
  path: string;
  enabled: number;
}

interface ExistingAlbumRow {
  id: string;
  source_path: string;
}

interface ExistingAssetRow {
  id: string;
  album_id: string;
  source_path: string;
}

interface ScannedAsset {
  id: string;
  albumId: string;
  name: string;
  extension: string;
  sourcePath: string;
  relativePath: string;
  sortIndex: number;
  sizeBytes: number;
  sourceMtime: string;
  width: number | null;
  height: number | null;
  thumbnailKey: string;
}

interface ScannedAlbum {
  id: string;
  name: string;
  sourcePath: string;
  relativePath: string;
  sourceMtime: string;
  assetCount: number;
  assetsFingerprint: string;
  coverAssetId: string | null;
  assets: ScannedAsset[];
}

export interface LibraryScanResult {
  taskId: string;
  status: "completed";
  dryRun: boolean;
  galleryId: string;
  galleryName: string;
  rootPath: string;
  backupPath: string | null;
  discovered: { albums: number; assets: number };
  changes: {
    albumsToCreate: number;
    albumsToUpdate: number;
    assetsToCreate: number;
    assetsToUpdate: number;
    skippedFiles: number;
  };
  samples: {
    albums: Array<{ id: string; name: string; sourcePath: string; assetCount: number }>;
    assets: Array<{ id: string; albumId: string; name: string; relativePath: string }>;
    skipped: Array<{ path: string; reason: string }>;
  };
}

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".heic", ".heif"]);

const toIso = (mtimeMs: number): string => new Date(mtimeMs).toISOString();

const stableId = (prefix: string, value: string): string =>
  `${prefix}_${crypto.createHash("sha256").update(value).digest("hex").slice(0, 24)}`;

const relativePosix = (root: string, value: string): string => path.relative(root, value).split(path.sep).join("/");

const safeReaddir = (dir: string): fs.Dirent[] => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

const readImageMeta = async (filePath: string): Promise<{ width: number | null; height: number | null }> => {
  try {
    const meta = await sharp(filePath, { limitInputPixels: false }).metadata();
    return { width: meta.width ?? null, height: meta.height ?? null };
  } catch {
    return { width: null, height: null };
  }
};

const buildAlbum = async (
  root: LibraryRootRow,
  albumPath: string,
  name: string,
  includeImageMetadata: boolean
): Promise<{ album: ScannedAlbum | null; skipped: LibraryScanResult["samples"]["skipped"] }> => {
  const skipped: LibraryScanResult["samples"]["skipped"] = [];
  let dirStat: fs.Stats;
  try {
    dirStat = fs.statSync(albumPath);
  } catch {
    return { album: null, skipped };
  }
  const files = safeReaddir(albumPath)
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
  if (files.length === 0) return { album: null, skipped };

  const albumId = stableId("album", `${root.id}:${albumPath}`);
  const assets: ScannedAsset[] = [];
  let sortIndex = 1;
  for (const entry of files) {
    const sourcePath = path.join(albumPath, entry.name);
    try {
      const stat = fs.statSync(sourcePath);
      const imageMeta = includeImageMetadata ? await readImageMeta(sourcePath) : { width: null, height: null };
      const relativePath = relativePosix(root.path, sourcePath);
      const assetId = stableId("asset", `${root.id}:${sourcePath}`);
      assets.push({
        id: assetId,
        albumId,
        name: entry.name,
        extension: path.extname(entry.name).toLowerCase(),
        sourcePath,
        relativePath,
        sortIndex,
        sizeBytes: stat.size,
        sourceMtime: toIso(stat.mtimeMs),
        width: imageMeta.width,
        height: imageMeta.height,
        thumbnailKey: `scan/${assetId}`
      });
      sortIndex += 1;
    } catch (error) {
      skipped.push({ path: sourcePath, reason: error instanceof Error ? error.message : "file read failed" });
    }
  }
  if (assets.length === 0) return { album: null, skipped };
  const fingerprint = crypto
    .createHash("sha256")
    .update(assets.map((asset) => `${asset.relativePath}:${asset.sizeBytes}:${asset.sourceMtime}`).join("|"))
    .digest("hex");
  return {
    album: {
      id: albumId,
      name,
      sourcePath: albumPath,
      relativePath: relativePosix(root.path, albumPath) || ".",
      sourceMtime: toIso(dirStat.mtimeMs),
      assetCount: assets.length,
      assetsFingerprint: fingerprint,
      coverAssetId: assets[0]?.id ?? null,
      assets
    },
    skipped
  };
};

const scanFilesystem = async (
  root: LibraryRootRow,
  includeImageMetadata: boolean
): Promise<{ albums: ScannedAlbum[]; skipped: LibraryScanResult["samples"]["skipped"] }> => {
  const skipped: LibraryScanResult["samples"]["skipped"] = [];
  const stat = fs.statSync(root.path);
  if (!stat.isDirectory()) throw new Error("library root path is not a directory");

  const candidates: Array<{ albumPath: string; name: string }> = [{ albumPath: root.path, name: root.name }];
  for (const entry of safeReaddir(root.path).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))) {
    candidates.push({ albumPath: path.join(root.path, entry.name), name: entry.name });
  }

  const albums: ScannedAlbum[] = [];
  for (const candidate of candidates) {
    const result = await buildAlbum(root, candidate.albumPath, candidate.name, includeImageMetadata);
    skipped.push(...result.skipped);
    if (result.album) albums.push(result.album);
  }
  return { albums, skipped };
};

const backupDatabaseFiles = (config: AppConfig): string => {
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const backupDir = path.join(path.dirname(config.dbPath), "scan-backups", `scan-${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  for (const filePath of [config.dbPath, `${config.dbPath}-wal`, `${config.dbPath}-shm`]) {
    if (fs.existsSync(filePath)) fs.copyFileSync(filePath, path.join(backupDir, path.basename(filePath)));
  }
  return backupDir;
};

const upsertScan = (db: Database, root: LibraryRootRow, albums: ScannedAlbum[]): void => {
  const now = new Date().toISOString();
  const upsertAlbum = db.prepare(
    `INSERT INTO albums (id, library_root_id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count, scan_status, created_at, updated_at)
     VALUES (?, ?, ?, 'folder', ?, ?, ?, ?, ?, 'ready', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       source_mtime = excluded.source_mtime,
       assets_fingerprint = excluded.assets_fingerprint,
       cover_asset_id = excluded.cover_asset_id,
       asset_count = excluded.asset_count,
       scan_status = 'ready',
       error_message = NULL,
       updated_at = excluded.updated_at`
  );
  const upsertAsset = db.prepare(
    `INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, sort_index, width, height, size_bytes, source_mtime, thumbnail_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'folder', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       album_id = excluded.album_id,
       name = excluded.name,
       extension = excluded.extension,
       source_path = excluded.source_path,
       relative_path = excluded.relative_path,
       sort_index = excluded.sort_index,
       width = excluded.width,
       height = excluded.height,
       size_bytes = excluded.size_bytes,
       source_mtime = excluded.source_mtime,
       thumbnail_key = excluded.thumbnail_key,
       updated_at = excluded.updated_at`
  );
  db.exec("BEGIN");
  try {
    for (const album of albums) {
      upsertAlbum.run(
        album.id,
        root.id,
        album.name,
        album.sourcePath,
        album.sourceMtime,
        album.assetsFingerprint,
        album.coverAssetId,
        album.assetCount,
        now,
        now
      );
      for (const asset of album.assets) {
        upsertAsset.run(
          asset.id,
          asset.albumId,
          asset.name,
          asset.extension,
          asset.sourcePath,
          asset.relativePath,
          asset.sortIndex,
          asset.width,
          asset.height,
          asset.sizeBytes,
          asset.sourceMtime,
          asset.thumbnailKey,
          now,
          now
        );
      }
    }
    db.prepare("UPDATE library_roots SET last_scanned_at = ?, updated_at = ? WHERE id = ?").run(now, now, root.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};

export const scanLibraryRoot = async (db: Database, config: AppConfig, galleryId: string, dryRun: boolean): Promise<LibraryScanResult> => {
  const root = db.prepare("SELECT id, name, path, enabled FROM library_roots WHERE id = ?").get(galleryId) as LibraryRootRow | undefined;
  if (!root) throw new Error("gallery not found");
  if (root.enabled !== 1) throw new Error("gallery is disabled");
  assertSafeLibraryPath(root.path, config.libraryRootAllowedPrefixes);

  const { albums, skipped } = await scanFilesystem(root, !dryRun);
  const albumRows = db.prepare("SELECT id, source_path FROM albums WHERE library_root_id = ?").all(root.id) as unknown as ExistingAlbumRow[];
  const assetRows = db
    .prepare("SELECT id, album_id, source_path FROM assets WHERE album_id IN (SELECT id FROM albums WHERE library_root_id = ?)")
    .all(root.id) as unknown as ExistingAssetRow[];
  const existingAlbumIds = new Set(albumRows.map((row) => row.id));
  const existingAssetIds = new Set(assetRows.map((row) => row.id));
  const assets = albums.flatMap((album) => album.assets);
  const backupPath = dryRun ? null : backupDatabaseFiles(config);
  if (!dryRun) upsertScan(db, root, albums);

  return {
    taskId: `scan_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    status: "completed",
    dryRun,
    galleryId: root.id,
    galleryName: root.name,
    rootPath: root.path,
    backupPath,
    discovered: { albums: albums.length, assets: assets.length },
    changes: {
      albumsToCreate: albums.filter((album) => !existingAlbumIds.has(album.id)).length,
      albumsToUpdate: albums.filter((album) => existingAlbumIds.has(album.id)).length,
      assetsToCreate: assets.filter((asset) => !existingAssetIds.has(asset.id)).length,
      assetsToUpdate: assets.filter((asset) => existingAssetIds.has(asset.id)).length,
      skippedFiles: skipped.length
    },
    samples: {
      albums: albums.slice(0, 5).map((album) => ({ id: album.id, name: album.name, sourcePath: album.sourcePath, assetCount: album.assetCount })),
      assets: assets.slice(0, 8).map((asset) => ({ id: asset.id, albumId: asset.albumId, name: asset.name, relativePath: asset.relativePath })),
      skipped: skipped.slice(0, 8)
    }
  };
};
