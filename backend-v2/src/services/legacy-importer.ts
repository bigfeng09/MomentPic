import crypto from "node:crypto";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type { Database } from "../db/connection.js";
import { openDatabase } from "../db/connection.js";
import { migrate } from "../db/migrate.js";
import { hashPassword, normalizeUsername } from "../lib/auth.js";

const legacyTables = [
  "library_roots",
  "albums",
  "assets",
  "thumbnails",
  "system_config",
  "users",
  "shared_albums",
  "favorite_albums",
  "public_shares"
] as const;

const requiredImportTables = ["library_roots", "albums", "assets"] as const;

type LegacyTable = (typeof legacyTables)[number];

interface LegacyLibraryRootRow {
  id: string;
  name: string;
  path: string;
  enabled: number;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LegacyAlbumRow {
  id: string;
  library_root_id: string;
  name: string;
  source_type: string;
  source_path: string;
  source_mtime: string | null;
  assets_fingerprint: string | null;
  cover_asset_id: string | null;
  asset_count: number;
  scan_status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface LegacyAssetRow {
  id: string;
  album_id: string;
  name: string;
  extension: string;
  source_type: string;
  source_path: string;
  relative_path: string | null;
  zip_entry_path: string | null;
  sort_index: number;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  source_mtime: string | null;
  thumbnail_key: string | null;
  created_at: string;
  updated_at: string;
}

interface LegacyUserRow {
  username: string;
  role: "admin" | "user";
  created_at: string;
  updated_at: string;
}

interface LegacySharedAlbumRow {
  username: string;
  album_id: string;
  created_at: string;
  updated_at: string;
}

interface LegacyPublicShareRow {
  token: string;
  type: "album" | "asset";
  target_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LegacyImportOptions {
  legacyDbPath: string;
  targetDbPath: string;
  dryRun: boolean;
}

export interface LegacyImportSummary {
  legacyDbPath: string;
  targetDbPath: string;
  dryRun: boolean;
  tableCounts: Partial<Record<LegacyTable, number>>;
  mappingPlan: string[];
  imported: {
    galleries: number;
    albums: number;
    assets: number;
    users: number;
    sharedAlbums: number;
    favoriteAlbums: number;
    publicShares: number;
  };
}

const countRows = (db: Database, tableName: string): number | null => {
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName) as { name: string } | undefined;
  if (!exists) return null;
  return (db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get() as { total: number }).total;
};

const readTableCounts = (db: Database): Partial<Record<LegacyTable, number>> => {
  const counts: Partial<Record<LegacyTable, number>> = {};
  for (const tableName of legacyTables) {
    const count = countRows(db, tableName);
    if (count !== null) counts[tableName] = count;
  }
  return counts;
};

const assertImportableLegacyDb = (legacyDb: Database, counts: Partial<Record<LegacyTable, number>>): void => {
  const missingTables = requiredImportTables.filter((tableName) => counts[tableName] === undefined);
  if (missingTables.length > 0) {
    throw new Error(`legacy DB is missing required table(s): ${missingTables.join(", ")}`);
  }

  for (const tableName of requiredImportTables) {
    const total = countRows(legacyDb, tableName);
    if (total === null) throw new Error(`legacy DB is missing required table: ${tableName}`);
  }
};

const toNullableText = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));
const toText = (value: unknown, fallback: string): string => {
  const text = toNullableText(value);
  return text && text.length > 0 ? text : fallback;
};
const toInteger = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};
const toNullableInteger = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

const iterateRows = (db: Database, sql: string): Iterable<Record<string, unknown>> =>
  db.prepare(sql).iterate() as Iterable<Record<string, unknown>>;

const mapLibraryRoot = (row: Record<string, unknown>, now: string): LegacyLibraryRootRow => ({
  id: toText(row.id, crypto.randomUUID()),
  name: toText(row.name, "Untitled Gallery"),
  path: toText(row.path, ""),
  enabled: toInteger(row.enabled, 1),
  last_scanned_at: toNullableText(row.last_scanned_at),
  created_at: toText(row.created_at, now),
  updated_at: toText(row.updated_at, now)
});

const mapAlbum = (row: Record<string, unknown>, now: string): LegacyAlbumRow => ({
  id: toText(row.id, crypto.randomUUID()),
  library_root_id: toText(row.library_root_id, ""),
  name: toText(row.name, "Untitled Album"),
  source_type: toText(row.source_type, "folder"),
  source_path: toText(row.source_path, ""),
  source_mtime: toNullableText(row.source_mtime),
  assets_fingerprint: toNullableText(row.assets_fingerprint),
  cover_asset_id: toNullableText(row.cover_asset_id),
  asset_count: toInteger(row.asset_count, 0),
  scan_status: toText(row.scan_status, "ready"),
  error_message: toNullableText(row.error_message),
  created_at: toText(row.created_at, now),
  updated_at: toText(row.updated_at, now)
});

const mapAsset = (row: Record<string, unknown>, now: string): LegacyAssetRow => ({
  id: toText(row.id, crypto.randomUUID()),
  album_id: toText(row.album_id, ""),
  name: toText(row.name, "untitled"),
  extension: toText(row.extension, ""),
  source_type: toText(row.source_type, "folder"),
  source_path: toText(row.source_path, ""),
  relative_path: toNullableText(row.relative_path),
  zip_entry_path: toNullableText(row.zip_entry_path),
  sort_index: toInteger(row.sort_index, 0),
  width: toNullableInteger(row.width),
  height: toNullableInteger(row.height),
  size_bytes: toNullableInteger(row.size_bytes),
  source_mtime: toNullableText(row.source_mtime),
  thumbnail_key: toNullableText(row.thumbnail_key),
  created_at: toText(row.created_at, now),
  updated_at: toText(row.updated_at, now)
});

const mapUser = (row: Record<string, unknown>, now: string): LegacyUserRow | null => {
  const username = normalizeUsername(row.username);
  if (!username) return null;
  return {
    username,
    role: row.role === "admin" ? "admin" : "user",
    created_at: toText(row.created_at, now),
    updated_at: toText(row.updated_at, now)
  };
};

const mapSharedAlbum = (row: Record<string, unknown>, now: string): LegacySharedAlbumRow | null => {
  const username = normalizeUsername(row.username);
  const albumId = toText(row.album_id, "");
  if (!username || !albumId) return null;
  return {
    username,
    album_id: albumId,
    created_at: toText(row.created_at, now),
    updated_at: toText(row.updated_at, now)
  };
};

const mapPublicShare = (row: Record<string, unknown>, now: string): LegacyPublicShareRow | null => {
  const token = toText(row.token, "");
  const targetId = toText(row.target_id, "");
  if (!token || !targetId) return null;
  return {
    token,
    type: row.type === "asset" ? "asset" : "album",
    target_id: targetId,
    created_by: normalizeUsername(row.created_by) || "admin",
    created_at: toText(row.created_at, now),
    updated_at: toText(row.updated_at, now)
  };
};

const tableExists = (db: Database, tableName: string): boolean => countRows(db, tableName) !== null;

const rowExists = (db: Database, sql: string, ...params: string[]): boolean => Boolean(db.prepare(sql).get(...params));

const importRows = (legacyDb: Database, targetDb: Database): LegacyImportSummary["imported"] => {
  const now = new Date().toISOString();
  const insertGallery = targetDb.prepare(
    `INSERT INTO library_roots (id, name, path, enabled, last_scanned_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       path = excluded.path,
       enabled = excluded.enabled,
       last_scanned_at = excluded.last_scanned_at,
       updated_at = excluded.updated_at`
  );
  const insertAlbum = targetDb.prepare(
    `INSERT INTO albums (id, library_root_id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count, scan_status, error_message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       library_root_id = excluded.library_root_id,
       name = excluded.name,
       source_type = excluded.source_type,
       source_path = excluded.source_path,
       source_mtime = excluded.source_mtime,
       assets_fingerprint = excluded.assets_fingerprint,
       cover_asset_id = excluded.cover_asset_id,
       asset_count = excluded.asset_count,
       scan_status = excluded.scan_status,
       error_message = excluded.error_message,
       updated_at = excluded.updated_at`
  );
  const insertAsset = targetDb.prepare(
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
  const insertUser = targetDb.prepare(
    `INSERT INTO users (username, password_hash, role, password_reset_required, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)
     ON CONFLICT(username) DO UPDATE SET
       role = excluded.role,
       updated_at = excluded.updated_at`
  );
  const insertSharedAlbum = targetDb.prepare(
    `INSERT OR IGNORE INTO shared_albums (username, album_id, created_at, updated_at)
     VALUES (?, ?, ?, ?)`
  );
  const insertFavoriteAlbum = targetDb.prepare(
    `INSERT OR IGNORE INTO favorite_albums (username, album_id, created_at, updated_at)
     VALUES (?, ?, ?, ?)`
  );
  const insertPublicShare = targetDb.prepare(
    `INSERT INTO public_shares (token, type, target_id, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       type = excluded.type,
       target_id = excluded.target_id,
       created_by = excluded.created_by,
       updated_at = excluded.updated_at`
  );

  let galleries = 0;
  let albums = 0;
  let assets = 0;
  let users = 0;
  let sharedAlbums = 0;
  let favoriteAlbums = 0;
  let publicShares = 0;

  targetDb.exec("BEGIN;");
  try {
    for (const row of iterateRows(legacyDb, "SELECT * FROM library_roots ORDER BY created_at ASC, id ASC")) {
      const gallery = mapLibraryRoot(row, now);
      insertGallery.run(gallery.id, gallery.name, gallery.path, gallery.enabled, gallery.last_scanned_at, gallery.created_at, gallery.updated_at);
      galleries += 1;
    }

    for (const row of iterateRows(legacyDb, "SELECT * FROM albums ORDER BY created_at ASC, id ASC")) {
      const album = mapAlbum(row, now);
      insertAlbum.run(
        album.id,
        album.library_root_id,
        album.name,
        album.source_type,
        album.source_path,
        album.source_mtime,
        album.assets_fingerprint,
        album.cover_asset_id,
        album.asset_count,
        album.scan_status,
        album.error_message,
        album.created_at,
        album.updated_at
      );
      albums += 1;
    }

    for (const row of iterateRows(legacyDb, "SELECT * FROM assets ORDER BY album_id ASC, sort_index ASC, id ASC")) {
      const asset = mapAsset(row, now);
      insertAsset.run(
        asset.id,
        asset.album_id,
        asset.name,
        asset.extension,
        asset.source_type,
        asset.source_path,
        asset.relative_path,
        asset.zip_entry_path,
        asset.sort_index,
        asset.width,
        asset.height,
        asset.size_bytes,
        asset.source_mtime,
        asset.thumbnail_key,
        asset.created_at,
        asset.updated_at
      );
      assets += 1;
    }

    if (tableExists(legacyDb, "users")) {
      for (const row of iterateRows(legacyDb, "SELECT * FROM users ORDER BY created_at ASC, username ASC")) {
        const user = mapUser(row, now);
        if (!user) continue;
        if (user.username === "admin") continue;
        insertUser.run(user.username, hashPassword(`legacy-reset-required:${crypto.randomUUID()}`), user.role, user.created_at, user.updated_at);
        users += 1;
      }
    }

    if (tableExists(legacyDb, "shared_albums")) {
      for (const row of iterateRows(legacyDb, "SELECT * FROM shared_albums ORDER BY created_at ASC, username ASC, album_id ASC")) {
        const shared = mapSharedAlbum(row, now);
        if (!shared) continue;
        if (
          !rowExists(targetDb, "SELECT 1 FROM users WHERE username = ?", shared.username) ||
          !rowExists(targetDb, "SELECT 1 FROM albums WHERE id = ?", shared.album_id)
        ) {
          continue;
        }
        const result = insertSharedAlbum.run(shared.username, shared.album_id, shared.created_at, shared.updated_at);
        sharedAlbums += Number(result.changes);
      }
    }

    if (tableExists(legacyDb, "favorite_albums")) {
      for (const row of iterateRows(legacyDb, "SELECT * FROM favorite_albums ORDER BY created_at ASC, username ASC, album_id ASC")) {
        const favorite = mapSharedAlbum(row, now);
        if (!favorite) continue;
        if (
          !rowExists(targetDb, "SELECT 1 FROM users WHERE username = ?", favorite.username) ||
          !rowExists(targetDb, "SELECT 1 FROM albums WHERE id = ?", favorite.album_id)
        ) {
          continue;
        }
        const result = insertFavoriteAlbum.run(favorite.username, favorite.album_id, favorite.created_at, favorite.updated_at);
        favoriteAlbums += Number(result.changes);
      }
    }

    if (tableExists(legacyDb, "public_shares")) {
      for (const row of iterateRows(legacyDb, "SELECT * FROM public_shares ORDER BY created_at ASC, token ASC")) {
        const share = mapPublicShare(row, now);
        if (!share) continue;
        insertPublicShare.run(share.token, share.type, share.target_id, share.created_by, share.created_at, share.updated_at);
        publicShares += 1;
      }
    }
    targetDb.exec("COMMIT;");
  } catch (error) {
    targetDb.exec("ROLLBACK;");
    throw error;
  }

  return { galleries, albums, assets, users, sharedAlbums, favoriteAlbums, publicShares };
};

export const importLegacyDb = (options: LegacyImportOptions): LegacyImportSummary => {
  if (!fs.existsSync(options.legacyDbPath)) {
    throw new Error(`legacy DB does not exist: ${options.legacyDbPath}`);
  }

  const legacyDb = new DatabaseSync(options.legacyDbPath, { readOnly: true, enableForeignKeyConstraints: false });
  try {
    const tableCounts = readTableCounts(legacyDb);
    assertImportableLegacyDb(legacyDb, tableCounts);
    const summary: LegacyImportSummary = {
      legacyDbPath: options.legacyDbPath,
      targetDbPath: options.targetDbPath,
      dryRun: options.dryRun,
      tableCounts,
      mappingPlan: [
        "library_roots -> galleries(v2 library_roots)",
        "albums -> albums",
        "assets -> assets",
        "thumbnails -> counted only; thumbnail cache rebuild is deferred",
        "system_config -> counted only; polling/preload tuning is deferred",
        "users -> users with random scrypt hash and password_reset_required=1; legacy plaintext passwords are not copied",
        "shared_albums -> shared_albums",
        "favorite_albums -> favorite_albums by username/album_id; legacy album_json snapshots are not copied",
        "public_shares -> public_shares preserving existing tokens"
      ],
      imported: { galleries: 0, albums: 0, assets: 0, users: 0, sharedAlbums: 0, favoriteAlbums: 0, publicShares: 0 }
    };

    if (options.dryRun) return summary;

    const targetDb = openDatabase(options.targetDbPath);
    try {
      migrate(targetDb);
      summary.imported = importRows(legacyDb, targetDb);
    } finally {
      targetDb.close();
    }

    return summary;
  } finally {
    legacyDb.close();
  }
};
