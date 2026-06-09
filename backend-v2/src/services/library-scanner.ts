import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { AppConfig } from "../config.js";
import type { Database } from "../db/connection.js";
import { detectArchiveType, listRootImageEntries } from "./archive-zip.js";
import { assertSafeLibraryPath } from "./library-root-path.js";

interface LibraryRootRow {
  id: string;
  name: string;
  path: string;
  enabled: number;
}

interface ExistingAlbumRow {
  id: string;
  name: string;
  source_type: string;
  source_path: string;
  source_mtime: string | null;
  assets_fingerprint: string | null;
  cover_asset_id: string | null;
  asset_count: number;
}

interface ExistingAssetRow {
  id: string;
  album_id: string;
  source_path: string;
  relative_path: string | null;
  zip_entry_path: string | null;
  sort_index: number;
  size_bytes: number | null;
  source_mtime: string | null;
  width: number | null;
  height: number | null;
  thumbnail_key: string | null;
}

interface ScannedAsset {
  id: string;
  albumId: string;
  name: string;
  extension: string;
  sourceType: "folder" | "zip" | "archive";
  sourcePath: string;
  relativePath: string;
  zipEntryPath: string | null;
  sortIndex: number;
  sizeBytes: number;
  sourceMtime: string;
  width: number | null;
  height: number | null;
  thumbnailKey: string;
  unchanged: boolean;
}

interface ScannedAlbum {
  id: string;
  name: string;
  sourceType: "folder" | "zip" | "archive";
  sourcePath: string;
  relativePath: string;
  sourceMtime: string;
  assetCount: number;
  assetsFingerprint: string;
  coverAssetId: string | null;
  assets: ScannedAsset[];
  unchanged: boolean;
}

interface ExistingScanState {
  albumsById: Map<string, ExistingAlbumRow>;
  assetsById: Map<string, ExistingAssetRow>;
  assetsByAlbumId: Map<string, Map<string, ExistingAssetRow>>;
  loadAssetsForAlbum: (albumId: string) => Map<string, ExistingAssetRow>;
}

interface IncrementalScanStats {
  unchangedAlbums: number;
  unchangedAssets: number;
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
    unchangedAlbums: number;
    unchangedAssets: number;
  };
  counts: {
    found: { albums: number; assets: number };
    new: { albums: number; assets: number };
    updated: { albums: number; assets: number };
    skipped: number;
    unchanged: { albums: number; assets: number };
    errors: number;
  };
  samples: {
    albums: Array<{ id: string; name: string; sourcePath: string; assetCount: number }>;
    assets: Array<{ id: string; albumId: string; name: string; relativePath: string }>;
    skipped: Array<{ path: string; reason: string }>;
  };
}

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".heic", ".heif"]);
const archiveExtensions = new Set([".zip", ".cbz", ".rar", ".cbr", ".7z", ".cb7"]);

const toIso = (mtimeMs: number): string => new Date(mtimeMs).toISOString();

const stableId = (prefix: string, value: string): string =>
  `${prefix}_${crypto.createHash("sha256").update(value).digest("hex").slice(0, 24)}`;

const relativePosix = (root: string, value: string): string => path.relative(root, value).split(path.sep).join("/");

const yieldToEventLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

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
  includeImageMetadata: boolean,
  reuseUnchanged: boolean,
  existing: ExistingScanState,
  incremental: IncrementalScanStats
): Promise<{ album: ScannedAlbum | null; skipped: LibraryScanResult["samples"]["skipped"] }> => {
  const skipped: LibraryScanResult["samples"]["skipped"] = [];
  let dirStat: fs.Stats;
  try {
    dirStat = fs.statSync(albumPath);
  } catch {
    return { album: null, skipped };
  }
  const albumId = stableId("album", `${root.id}:${albumPath}`);
  const existingAlbum = existing.albumsById.get(albumId);
  const sourceMtime = toIso(dirStat.mtimeMs);
  if (reuseUnchanged && existingAlbum?.source_path === albumPath && existingAlbum.source_mtime === sourceMtime && existingAlbum.assets_fingerprint) {
    incremental.unchangedAlbums += 1;
    incremental.unchangedAssets += existingAlbum.asset_count;
    return {
      album: {
        id: albumId,
        name: existingAlbum.name || name,
        sourceType: "folder",
        sourcePath: albumPath,
        relativePath: relativePosix(root.path, albumPath) || ".",
        sourceMtime,
        assetCount: existingAlbum.asset_count,
        assetsFingerprint: existingAlbum.assets_fingerprint,
        coverAssetId: existingAlbum.cover_asset_id,
        assets: [],
        unchanged: true
      },
      skipped
    };
  }
  const files = safeReaddir(albumPath)
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
  if (files.length === 0) return { album: null, skipped };
  const existingAssets = existing.loadAssetsForAlbum(albumId);

  const assets: ScannedAsset[] = [];
  let sortIndex = 1;
  for (const entry of files) {
    if (sortIndex % 10 === 0) await yieldToEventLoop();
    const sourcePath = path.join(albumPath, entry.name);
    try {
      const stat = fs.statSync(sourcePath);
      const relativePath = relativePosix(root.path, sourcePath);
      const assetId = stableId("asset", `${root.id}:${sourcePath}`);
      const sourceMtime = toIso(stat.mtimeMs);
      const existingAsset = existingAssets.get(assetId);
      const unchanged =
        existingAsset?.source_path === sourcePath &&
        existingAsset.relative_path === relativePath &&
        existingAsset.zip_entry_path === null &&
        existingAsset.sort_index === sortIndex &&
        existingAsset.size_bytes === stat.size &&
        existingAsset.source_mtime === sourceMtime;
      if (unchanged) incremental.unchangedAssets += 1;
      const imageMeta =
        unchanged
          ? { width: existingAsset.width, height: existingAsset.height }
          : includeImageMetadata
            ? await readImageMeta(sourcePath)
            : { width: null, height: null };
      assets.push({
        id: assetId,
        albumId,
        name: entry.name,
        extension: path.extname(entry.name).toLowerCase(),
        sourceType: "folder",
        sourcePath,
        relativePath,
        zipEntryPath: null,
        sortIndex,
        sizeBytes: stat.size,
        sourceMtime,
        width: imageMeta.width,
        height: imageMeta.height,
        thumbnailKey: existingAsset?.thumbnail_key ?? `scan/${assetId}`,
        unchanged
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
  const unchanged =
    existingAlbum?.source_path === albumPath &&
    existingAlbum.source_mtime === sourceMtime &&
    existingAlbum.assets_fingerprint === fingerprint &&
    existingAlbum.asset_count === assets.length &&
    assets.every((asset) => asset.unchanged);
  if (unchanged) incremental.unchangedAlbums += 1;
  return {
    album: {
      id: albumId,
      name,
      sourceType: "folder",
      sourcePath: albumPath,
      relativePath: relativePosix(root.path, albumPath) || ".",
      sourceMtime,
      assetCount: assets.length,
      assetsFingerprint: fingerprint,
      coverAssetId: assets[0]?.id ?? null,
      assets,
      unchanged
    },
    skipped
  };
};

const buildArchiveAlbum = async (
  root: LibraryRootRow,
  archivePath: string,
  reuseUnchanged: boolean,
  existing: ExistingScanState,
  incremental: IncrementalScanStats
): Promise<{ album: ScannedAlbum | null; skipped: LibraryScanResult["samples"]["skipped"] }> => {
  const skipped: LibraryScanResult["samples"]["skipped"] = [];
  let stat: fs.Stats;
  try {
    stat = fs.statSync(archivePath);
  } catch {
    return { album: null, skipped };
  }

  const albumId = stableId("album", `${root.id}:${archivePath}`);
  const existingAlbum = existing.albumsById.get(albumId);
  const archiveRelativePath = relativePosix(root.path, archivePath);
  const archiveType = detectArchiveType(archivePath);
  const sourceType = archiveType === "zip" ? "zip" : "archive";
  const sourceMtime = toIso(stat.mtimeMs);
  if (reuseUnchanged && existingAlbum?.source_path === archivePath && existingAlbum.source_mtime === sourceMtime && existingAlbum.assets_fingerprint) {
    incremental.unchangedAlbums += 1;
    incremental.unchangedAssets += existingAlbum.asset_count;
    return {
      album: {
        id: albumId,
        name: existingAlbum.name || path.basename(archivePath, path.extname(archivePath)),
        sourceType,
        sourcePath: archivePath,
        relativePath: archiveRelativePath,
        sourceMtime,
        assetCount: existingAlbum.asset_count,
        assetsFingerprint: existingAlbum.assets_fingerprint,
        coverAssetId: existingAlbum.cover_asset_id,
        assets: [],
        unchanged: true
      },
      skipped
    };
  }

  let entries: Array<{ entryPath: string; sizeBytes: number }>;
  try {
    entries = await listRootImageEntries(archivePath);
  } catch (error) {
    skipped.push({ path: archivePath, reason: error instanceof Error ? error.message : "archive read failed" });
    return { album: null, skipped };
  }
  if (entries.length === 0) return { album: null, skipped };
  const existingAssets = existing.loadAssetsForAlbum(albumId);
  const assets: ScannedAsset[] = entries.map((entry, index) => {
    const assetId = stableId("asset", `${root.id}:${archivePath}#${entry.entryPath}`);
    const existingAsset = existingAssets.get(assetId);
    const unchanged =
      existingAsset?.source_path === archivePath &&
      existingAsset.relative_path === entry.entryPath &&
      existingAsset.zip_entry_path === entry.entryPath &&
      existingAsset.sort_index === index + 1 &&
      existingAsset.size_bytes === entry.sizeBytes &&
      existingAsset.source_mtime === sourceMtime;
    if (unchanged) incremental.unchangedAssets += 1;
    return {
      id: assetId,
      albumId,
      name: path.basename(entry.entryPath),
      extension: path.extname(entry.entryPath).toLowerCase(),
      sourceType,
      sourcePath: archivePath,
      relativePath: entry.entryPath,
      zipEntryPath: entry.entryPath,
      sortIndex: index + 1,
      sizeBytes: entry.sizeBytes,
      sourceMtime,
      width: existingAsset?.width ?? null,
      height: existingAsset?.height ?? null,
      thumbnailKey: existingAsset?.thumbnail_key ?? `scan/${assetId}`,
      unchanged
    };
  });
  const fingerprint = crypto
    .createHash("sha256")
    .update(assets.map((asset) => `${asset.relativePath}:${asset.sizeBytes}:${asset.sourceMtime}`).join("|"))
    .digest("hex");
  const unchanged =
    existingAlbum?.source_path === archivePath &&
    existingAlbum.source_mtime === sourceMtime &&
    existingAlbum.assets_fingerprint === fingerprint &&
    existingAlbum.asset_count === assets.length &&
    assets.every((asset) => asset.unchanged);
  if (unchanged) incremental.unchangedAlbums += 1;
  return {
    album: {
      id: albumId,
      name: path.basename(archivePath, path.extname(archivePath)),
      sourceType,
      sourcePath: archivePath,
      relativePath: archiveRelativePath,
      sourceMtime,
      assetCount: assets.length,
      assetsFingerprint: fingerprint,
      coverAssetId: assets[0]?.id ?? null,
      assets,
      unchanged
    },
    skipped
  };
};

export interface ScanProgress {
  albums: number;
  assets: number;
  phase: "walking" | "known" | "folders" | "archives" | "writing";
}

export interface ScanLibraryRootOptions {
  onProgress?: (progress: ScanProgress) => void;
  includeArchives?: boolean;
  includeImageMetadata?: boolean;
  mode?: "discover" | "incremental" | "known";
}

const scannedAssetCount = (albums: ScannedAlbum[]): number => albums.reduce((sum, album) => sum + album.assetCount, 0);

const isArchiveAlbumRow = (row: ExistingAlbumRow): boolean =>
  row.source_type === "zip" || row.source_type === "archive" || archiveExtensions.has(path.extname(row.source_path).toLowerCase());

const normalizeAlbumSourceType = (row: ExistingAlbumRow): ScannedAlbum["sourceType"] => {
  if (row.source_type === "zip" || row.source_type === "archive") return row.source_type;
  return isArchiveAlbumRow(row) ? (detectArchiveType(row.source_path) === "zip" ? "zip" : "archive") : "folder";
};

const createExistingScanState = (db: Database, albumRows: ExistingAlbumRow[]): ExistingScanState => {
  const assetsById = new Map<string, ExistingAssetRow>();
  const assetsByAlbumId = new Map<string, Map<string, ExistingAssetRow>>();
  const selectAssetsByAlbum = db.prepare(
    `SELECT id, album_id, source_path, relative_path, zip_entry_path, sort_index, size_bytes, source_mtime, width, height, thumbnail_key
     FROM assets
     WHERE album_id = ?`
  );

  const loadAssetsForAlbum = (albumId: string): Map<string, ExistingAssetRow> => {
    const cached = assetsByAlbumId.get(albumId);
    if (cached) return cached;
    const rows = selectAssetsByAlbum.all(albumId) as unknown as ExistingAssetRow[];
    const assets = new Map(rows.map((row) => [row.id, row]));
    assetsByAlbumId.set(albumId, assets);
    for (const row of rows) assetsById.set(row.id, row);
    return assets;
  };

  return {
    albumsById: new Map(albumRows.map((row) => [row.id, row])),
    assetsById,
    assetsByAlbumId,
    loadAssetsForAlbum
  };
};

const scanFilesystem = async (
  root: LibraryRootRow,
  existing: ExistingScanState,
  incremental: IncrementalScanStats,
  options: ScanLibraryRootOptions = {}
): Promise<{ albums: ScannedAlbum[]; skipped: LibraryScanResult["samples"]["skipped"] }> => {
  const skipped: LibraryScanResult["samples"]["skipped"] = [];
  const onlyUnknownAlbums = options.mode === "incremental";
  const reuseUnchanged = options.mode === "known";
  const stat = fs.statSync(root.path);
  if (!stat.isDirectory()) throw new Error("library root path is not a directory");

  const folderCandidates: Array<{ albumPath: string; name: string }> = [];
  const archiveCandidates: string[] = [];
  const pendingDirs = [root.path];
  let pendingDirIndex = 0;
  let dirsVisited = 0;
  while (pendingDirIndex < pendingDirs.length) {
    const dir = pendingDirs[pendingDirIndex]!;
    pendingDirIndex += 1;
    let dirStat: fs.Stats;
    try {
      dirStat = fs.statSync(dir);
    } catch (error) {
      skipped.push({ path: dir, reason: error instanceof Error ? error.message : "directory read failed" });
      continue;
    }
    if (!dirStat.isDirectory()) continue;
    const dirAlbumId = stableId("album", `${root.id}:${dir}`);
    const knownFolder = existing.albumsById.has(dirAlbumId);
    if (!onlyUnknownAlbums || !knownFolder) folderCandidates.push({ albumPath: dir, name: dir === root.path ? root.name : path.basename(dir) });
    for (const entry of safeReaddir(dir).sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        pendingDirs.push(fullPath);
      } else if (options.includeArchives !== false && entry.isFile() && archiveExtensions.has(path.extname(entry.name).toLowerCase())) {
        const archiveAlbumId = stableId("album", `${root.id}:${fullPath}`);
        if (!onlyUnknownAlbums || !existing.albumsById.has(archiveAlbumId)) archiveCandidates.push(fullPath);
      }
    }
    dirsVisited += 1;
    if (dirsVisited % 10 === 0) {
      options.onProgress?.({ albums: folderCandidates.length, assets: 0, phase: "walking" });
      await yieldToEventLoop();
    }
  }

  const albums: ScannedAlbum[] = [];
  let folderAssetsDiscovered = 0;
  let folderCandidateIndex = 0;
  for (const candidate of folderCandidates) {
    const result = await buildAlbum(root, candidate.albumPath, candidate.name, options.includeImageMetadata === true, reuseUnchanged, existing, incremental);
    skipped.push(...result.skipped);
    if (result.album) {
      albums.push(result.album);
      folderAssetsDiscovered += result.album.assetCount;
    }
    folderCandidateIndex += 1;
    if (folderCandidateIndex % 10 === 0) {
      options.onProgress?.({ albums: albums.length, assets: folderAssetsDiscovered, phase: "folders" });
      await yieldToEventLoop();
    }
  }
  let assetsDiscovered = folderAssetsDiscovered;
  for (const archivePath of archiveCandidates) {
    const result = await buildArchiveAlbum(root, archivePath, reuseUnchanged, existing, incremental);
    skipped.push(...result.skipped);
    if (result.album) {
      albums.push(result.album);
      assetsDiscovered += result.album.assetCount;
    }
    options.onProgress?.({ albums: albums.length, assets: assetsDiscovered, phase: "archives" });
    await yieldToEventLoop();
  }
  return { albums, skipped };
};

const scanKnownAlbums = async (
  root: LibraryRootRow,
  albumRows: ExistingAlbumRow[],
  existing: ExistingScanState,
  incremental: IncrementalScanStats,
  options: ScanLibraryRootOptions = {}
): Promise<{ albums: ScannedAlbum[]; skipped: LibraryScanResult["samples"]["skipped"] }> => {
  const skipped: LibraryScanResult["samples"]["skipped"] = [];
  const albums: ScannedAlbum[] = [];
  let assetsDiscovered = 0;
  let index = 0;

  for (const row of albumRows.sort((a, b) => a.source_path.localeCompare(b.source_path, "zh-Hans-CN"))) {
    index += 1;
    let stat: fs.Stats;
    try {
      stat = fs.statSync(row.source_path);
    } catch (error) {
      skipped.push({ path: row.source_path, reason: error instanceof Error ? error.message : "known album path missing" });
      continue;
    }

    const sourceMtime = toIso(stat.mtimeMs);
    if (row.source_mtime === sourceMtime && row.assets_fingerprint) {
      incremental.unchangedAlbums += 1;
      incremental.unchangedAssets += row.asset_count;
      albums.push({
        id: row.id,
        name: row.name,
        sourceType: normalizeAlbumSourceType(row),
        sourcePath: row.source_path,
        relativePath: relativePosix(root.path, row.source_path) || ".",
        sourceMtime,
        assetCount: row.asset_count,
        assetsFingerprint: row.assets_fingerprint,
        coverAssetId: row.cover_asset_id,
        assets: [],
        unchanged: true
      });
      assetsDiscovered += row.asset_count;
    } else if (isArchiveAlbumRow(row)) {
      if (options.includeArchives === false) {
        skipped.push({ path: row.source_path, reason: "archive changed; run full refresh to parse archive entries" });
      } else {
        const result = await buildArchiveAlbum(root, row.source_path, true, existing, incremental);
        skipped.push(...result.skipped);
        if (result.album) {
          albums.push(result.album);
          assetsDiscovered += result.album.assetCount;
        }
      }
    } else if (stat.isDirectory()) {
      const result = await buildAlbum(root, row.source_path, row.name || path.basename(row.source_path), options.includeImageMetadata === true, true, existing, incremental);
      skipped.push(...result.skipped);
      if (result.album) {
        albums.push(result.album);
        assetsDiscovered += result.album.assetCount;
      }
    } else {
      skipped.push({ path: row.source_path, reason: "known album path is not a directory or supported archive" });
    }

    if (index % 25 === 0) {
      options.onProgress?.({ albums: albums.length, assets: assetsDiscovered, phase: "known" });
      await yieldToEventLoop();
    }
  }

  return { albums, skipped };
};

const scanIncremental = async (
  root: LibraryRootRow,
  existing: ExistingScanState,
  incremental: IncrementalScanStats,
  options: ScanLibraryRootOptions = {}
): Promise<{ albums: ScannedAlbum[]; skipped: LibraryScanResult["samples"]["skipped"] }> => {
  return scanFilesystem(root, existing, incremental, { ...options, mode: "incremental", includeArchives: true });
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
  const batchSize = 25;
  const upsertAlbum = db.prepare(
    `INSERT INTO albums (id, library_root_id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count, scan_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       source_type = excluded.source_type,
       source_mtime = excluded.source_mtime,
       assets_fingerprint = excluded.assets_fingerprint,
       cover_asset_id = excluded.cover_asset_id,
       asset_count = excluded.asset_count,
       scan_status = 'ready',
       error_message = NULL,
       updated_at = excluded.updated_at`
  );
  const upsertAsset = db.prepare(
    `INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, zip_entry_path, sort_index, width, height, size_bytes, source_mtime, thumbnail_key, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       album_id = excluded.album_id,
       name = excluded.name,
       extension = excluded.extension,
       source_type = excluded.source_type,
       source_path = excluded.source_path,
       relative_path = excluded.relative_path,
       zip_entry_path = excluded.zip_entry_path,
       sort_index = excluded.sort_index,
       width = excluded.width,
       height = excluded.height,
       size_bytes = excluded.size_bytes,
       source_mtime = excluded.source_mtime,
       thumbnail_key = excluded.thumbnail_key,
       updated_at = excluded.updated_at`
  );
  for (let offset = 0; offset < albums.length; offset += batchSize) {
    const batch = albums.slice(offset, offset + batchSize);
    db.exec("BEGIN");
    try {
      for (const album of batch) {
        if (!album.unchanged) {
          upsertAlbum.run(
            album.id,
            root.id,
            album.name,
            album.sourceType,
            album.sourcePath,
            album.sourceMtime,
            album.assetsFingerprint,
            album.coverAssetId,
            album.assetCount,
            now,
            now
          );
        }
        for (const asset of album.assets) {
          if (asset.unchanged) continue;
          upsertAsset.run(
            asset.id,
            asset.albumId,
            asset.name,
            asset.extension,
            asset.sourceType,
            asset.sourcePath,
            asset.relativePath,
            asset.zipEntryPath,
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
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  db.prepare("UPDATE library_roots SET last_scanned_at = ?, updated_at = ? WHERE id = ?").run(now, now, root.id);
};

const touchLibraryRootScannedAt = (db: Database, root: LibraryRootRow): void => {
  const now = new Date().toISOString();
  db.prepare("UPDATE library_roots SET last_scanned_at = ?, updated_at = ? WHERE id = ?").run(now, now, root.id);
};

export const scanLibraryRoot = async (
  db: Database,
  config: AppConfig,
  galleryId: string,
  dryRun: boolean,
  options: ScanLibraryRootOptions = {}
): Promise<LibraryScanResult> => {
  const root = db.prepare("SELECT id, name, path, enabled FROM library_roots WHERE id = ?").get(galleryId) as LibraryRootRow | undefined;
  if (!root) throw new Error("gallery not found");
  if (root.enabled !== 1) throw new Error("gallery is disabled");
  assertSafeLibraryPath(root.path, config.libraryRootAllowedPrefixes);

  const albumRows = db
    .prepare("SELECT id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count FROM albums WHERE library_root_id = ?")
    .all(root.id) as unknown as ExistingAlbumRow[];
  const existing = createExistingScanState(db, albumRows);
  const incremental: IncrementalScanStats = { unchangedAlbums: 0, unchangedAssets: 0 };
  const { albums, skipped } =
    options.mode === "known"
      ? await scanKnownAlbums(root, albumRows, existing, incremental, options)
      : options.mode === "incremental"
        ? await scanIncremental(root, existing, incremental, options)
        : await scanFilesystem(root, existing, incremental, options);
  const existingAlbumIds = new Set(albumRows.map((row) => row.id));
  const assets = albums.flatMap((album) => album.assets);
  const changedAlbums = albums.filter((album) => !album.unchanged);
  const changedAssets = assets.filter((asset) => !asset.unchanged);
  const assetAlreadyExists = (asset: ScannedAsset): boolean => existing.loadAssetsForAlbum(asset.albumId).has(asset.id);
  const hasCatalogChanges = changedAlbums.length > 0 || changedAssets.length > 0;
  const backupPath = !dryRun && hasCatalogChanges ? backupDatabaseFiles(config) : null;
  if (!dryRun) {
    options.onProgress?.({ albums: changedAlbums.length, assets: changedAssets.length, phase: "writing" });
    if (hasCatalogChanges) upsertScan(db, root, albums);
    else touchLibraryRootScannedAt(db, root);
  }

  return {
    taskId: `scan_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    status: "completed",
    dryRun,
    galleryId: root.id,
    galleryName: root.name,
    rootPath: root.path,
    backupPath,
    discovered: { albums: albums.length, assets: scannedAssetCount(albums) },
    changes: {
      albumsToCreate: albums.filter((album) => !existingAlbumIds.has(album.id)).length,
      albumsToUpdate: changedAlbums.filter((album) => existingAlbumIds.has(album.id)).length,
      assetsToCreate: assets.filter((asset) => !assetAlreadyExists(asset)).length,
      assetsToUpdate: changedAssets.filter((asset) => assetAlreadyExists(asset)).length,
      skippedFiles: skipped.length,
      unchangedAlbums: incremental.unchangedAlbums,
      unchangedAssets: incremental.unchangedAssets
    },
    counts: {
      found: { albums: albums.length, assets: scannedAssetCount(albums) },
      new: {
        albums: albums.filter((album) => !existingAlbumIds.has(album.id)).length,
        assets: assets.filter((asset) => !assetAlreadyExists(asset)).length
      },
      updated: {
        albums: changedAlbums.filter((album) => existingAlbumIds.has(album.id)).length,
        assets: changedAssets.filter((asset) => assetAlreadyExists(asset)).length
      },
      skipped: skipped.length + incremental.unchangedAssets,
      unchanged: { albums: incremental.unchangedAlbums, assets: incremental.unchangedAssets },
      errors: skipped.length
    },
    samples: {
      albums: albums.slice(0, 5).map((album) => ({ id: album.id, name: album.name, sourcePath: album.sourcePath, assetCount: album.assetCount })),
      assets: assets.slice(0, 8).map((asset) => ({ id: asset.id, albumId: asset.albumId, name: asset.name, relativePath: asset.relativePath })),
      skipped: skipped.slice(0, 8)
    }
  };
};
