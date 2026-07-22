import crypto from "node:crypto";
import type { Database } from "../db/connection.js";
import { hashPassword, normalizeUsername, verifyPassword } from "../lib/auth.js";
import type { AlbumDto, AuthUser } from "../types/domain.js";

interface AlbumRow {
  id: string;
  library_root_id: string;
  name: string;
  source_type: string;
  source_path: string;
  cover_asset_id: string | null;
  asset_count: number;
  scan_status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface PublicShareRow {
  token: string;
  type: "album" | "asset";
  target_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  password_hash: string | null;
  allow_original: number;
}

export interface PublicShareDto {
  token: string;
  type: "album" | "asset";
  targetId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  expiresAt: string | null;
  passwordProtected: boolean;
  allowOriginal: boolean;
}

export interface PublicShareOptions {
  expiresAt?: string | null;
  password?: string;
  allowOriginal?: boolean;
}

const toAlbumDto = (row: AlbumRow): AlbumDto => ({
  id: row.id,
  galleryId: row.library_root_id,
  name: row.name,
  sourceType: row.source_type,
  sourcePath: row.source_path,
  coverAssetId: row.cover_asset_id,
  assetCount: row.asset_count,
  scanStatus: row.scan_status,
  errorMessage: row.error_message,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const publicShareDto = (row: PublicShareRow): PublicShareDto => ({
  token: row.token,
  type: row.type,
  targetId: row.target_id,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  url: `/s/${row.token}`,
  expiresAt: row.expires_at,
  passwordProtected: Boolean(row.password_hash),
  allowOriginal: Boolean(row.allow_original)
});

const makeToken = (): string => crypto.randomBytes(18).toString("base64url");
const publicShareColumns =
  "token, type, target_id, created_by, created_at, updated_at, expires_at, password_hash, allow_original";

export class ShareRepository {
  constructor(private readonly db: Database) {}

  listFavoriteAlbums(user: AuthUser): AlbumDto[] {
    const accessFilter =
      user.role === "admin" ? "" : "AND fa.album_id IN (SELECT album_id FROM shared_albums WHERE username = ?)";
    const params = user.role === "admin" ? [user.username] : [user.username, user.username];
    const rows = this.db
      .prepare(
        `SELECT a.id, a.library_root_id, a.name, a.source_type, a.source_path, a.cover_asset_id, a.asset_count, a.scan_status, a.error_message, a.created_at, a.updated_at
         FROM favorite_albums fa
         JOIN albums a ON a.id = fa.album_id
         WHERE fa.username = ? ${accessFilter}
         ORDER BY fa.updated_at DESC, a.name COLLATE NOCASE ASC`
      )
      .all(...params) as unknown as AlbumRow[];
    return rows.map(toAlbumDto);
  }

  replaceFavoriteAlbums(user: AuthUser, albumIds: string[]): AlbumDto[] {
    const uniqueAlbumIds = Array.from(new Set(albumIds.map((id) => id.trim()).filter(Boolean)));
    const now = new Date().toISOString();
    this.db.exec("BEGIN;");
    try {
      this.db.prepare("DELETE FROM favorite_albums WHERE username = ?").run(user.username);
      const insert = this.db.prepare(
        "INSERT OR IGNORE INTO favorite_albums (username, album_id, created_at, updated_at) VALUES (?, ?, ?, ?)"
      );
      for (const albumId of uniqueAlbumIds) {
        if (this.canUserAccessAlbum(user, albumId)) insert.run(user.username, albumId, now, now);
      }
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
    return this.listFavoriteAlbums(user);
  }

  setFavoriteAlbum(user: AuthUser, albumId: string, favorite: boolean): void {
    if (!this.canUserAccessAlbum(user, albumId)) throw new Error("album not shared with current user");
    const now = new Date().toISOString();
    if (favorite) {
      this.db
        .prepare(
          `INSERT INTO favorite_albums (username, album_id, created_at, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(username, album_id) DO UPDATE SET updated_at = excluded.updated_at`
        )
        .run(user.username, albumId, now, now);
    } else {
      this.db.prepare("DELETE FROM favorite_albums WHERE username = ? AND album_id = ?").run(user.username, albumId);
    }
  }

  listSharedAlbumIds(usernameInput: unknown): string[] {
    const username = normalizeUsername(usernameInput);
    const rows = this.db
      .prepare("SELECT album_id FROM shared_albums WHERE username = ? ORDER BY updated_at DESC, album_id ASC")
      .all(username) as Array<{ album_id: string }>;
    return rows.map((row) => row.album_id);
  }

  listSharedAlbums(usernameInput: unknown): AlbumDto[] {
    const username = normalizeUsername(usernameInput);
    const rows = this.db
      .prepare(
        `SELECT a.id, a.library_root_id, a.name, a.source_type, a.source_path, a.cover_asset_id, a.asset_count, a.scan_status, a.error_message, a.created_at, a.updated_at
         FROM shared_albums sa
         JOIN albums a ON a.id = sa.album_id
         WHERE sa.username = ?
         ORDER BY sa.updated_at DESC, a.name COLLATE NOCASE ASC`
      )
      .all(username) as unknown as AlbumRow[];
    return rows.map(toAlbumDto);
  }

  replaceSharedAlbums(usernameInput: unknown, albumIds: string[]): string[] {
    const username = normalizeUsername(usernameInput);
    if (!username) throw new Error("username required");
    const uniqueAlbumIds = Array.from(new Set(albumIds.map((id) => id.trim()).filter(Boolean)));
    const now = new Date().toISOString();
    this.db.exec("BEGIN;");
    try {
      this.db.prepare("DELETE FROM shared_albums WHERE username = ?").run(username);
      const insert = this.db.prepare("INSERT OR IGNORE INTO shared_albums (username, album_id, created_at, updated_at) VALUES (?, ?, ?, ?)");
      for (const albumId of uniqueAlbumIds) insert.run(username, albumId, now, now);
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
    return this.listSharedAlbumIds(username);
  }

  setSharedAlbum(usernameInput: unknown, albumId: string, shared: boolean): void {
    const username = normalizeUsername(usernameInput);
    if (!username || !albumId) throw new Error("username and albumId required");
    const now = new Date().toISOString();
    if (shared) {
      this.db
        .prepare(
          `INSERT INTO shared_albums (username, album_id, created_at, updated_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(username, album_id) DO UPDATE SET updated_at = excluded.updated_at`
        )
        .run(username, albumId, now, now);
    } else {
      this.db.prepare("DELETE FROM shared_albums WHERE username = ? AND album_id = ?").run(username, albumId);
    }
  }

  canUserAccessAlbum(user: AuthUser, albumId: string): boolean {
    if (user.role === "admin") return Boolean(this.db.prepare("SELECT 1 AS ok FROM albums WHERE id = ?").get(albumId));
    return Boolean(
      this.db.prepare("SELECT 1 AS ok FROM shared_albums WHERE username = ? AND album_id = ?").get(user.username, albumId)
    );
  }

  listPublicShares(user: AuthUser): PublicShareDto[] {
    const rows = user.role === "admin"
      ? (this.db.prepare(`SELECT ${publicShareColumns} FROM public_shares ORDER BY updated_at DESC`).all() as unknown as PublicShareRow[])
      : (this.db
          .prepare(`SELECT ${publicShareColumns} FROM public_shares WHERE created_by = ? ORDER BY updated_at DESC`)
          .all(user.username) as unknown as PublicShareRow[]);
    return rows.map(publicShareDto);
  }

  findOrCreatePublicShare(
    typeInput: unknown,
    targetIdInput: unknown,
    user: AuthUser,
    options: PublicShareOptions = {}
  ): PublicShareDto {
    const type = typeInput === "asset" ? "asset" : "album";
    const targetId = String(targetIdInput ?? "").trim();
    if (!targetId) throw new Error("targetId required");
    if (type === "album" && !this.canUserAccessAlbum(user, targetId)) throw new Error("album not shared with current user");
    if (type === "asset") {
      const row = this.db.prepare("SELECT album_id FROM assets WHERE id = ?").get(targetId) as { album_id: string } | undefined;
      if (!row || !this.canUserAccessAlbum(user, row.album_id)) throw new Error("asset not shared with current user");
    }

    const existing = this.db
      .prepare(`SELECT ${publicShareColumns} FROM public_shares WHERE type = ? AND target_id = ? AND created_by = ?`)
      .get(type, targetId, user.username) as PublicShareRow | undefined;
    const now = new Date().toISOString();
    const expiresAt = options.expiresAt === undefined ? (existing?.expires_at ?? null) : options.expiresAt;
    if (expiresAt && !Number.isFinite(Date.parse(expiresAt))) throw new Error("invalid share expiry");
    const passwordHash = options.password === undefined
      ? (existing?.password_hash ?? null)
      : (options.password.trim() ? hashPassword(options.password) : null);
    const allowOriginal = options.allowOriginal ?? (existing ? Boolean(existing.allow_original) : true);
    if (existing) {
      this.db
        .prepare("UPDATE public_shares SET expires_at = ?, password_hash = ?, allow_original = ?, updated_at = ? WHERE token = ?")
        .run(expiresAt, passwordHash, allowOriginal ? 1 : 0, now, existing.token);
      return this.findPublicShare(existing.token)!;
    }

    const token = makeToken();
    this.db
      .prepare(
        "INSERT INTO public_shares (token, type, target_id, created_by, created_at, updated_at, expires_at, password_hash, allow_original) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(token, type, targetId, user.username, now, now, expiresAt, passwordHash, allowOriginal ? 1 : 0);
    return this.findPublicShare(token)!;
  }

  deletePublicShare(token: string, user: AuthUser): boolean {
    const existing = this.findPublicShare(token);
    if (!existing) return false;
    if (user.role !== "admin" && existing.createdBy !== user.username) throw new Error("cannot delete share created by another user");
    const result = this.db.prepare("DELETE FROM public_shares WHERE token = ?").run(token);
    return result.changes > 0;
  }

  findPublicShare(token: string): PublicShareDto | null {
    const row = this.db
      .prepare(`SELECT ${publicShareColumns} FROM public_shares WHERE token = ?`)
      .get(token) as PublicShareRow | undefined;
    return row ? publicShareDto(row) : null;
  }

  isPublicShareExpired(share: PublicShareDto): boolean {
    return Boolean(share.expiresAt && Date.parse(share.expiresAt) <= Date.now());
  }

  verifyPublicSharePassword(token: string, passwordInput: unknown): boolean {
    const row = this.db
      .prepare("SELECT password_hash FROM public_shares WHERE token = ?")
      .get(token) as { password_hash: string | null } | undefined;
    if (!row) return false;
    if (!row.password_hash) return true;
    const password = String(passwordInput ?? "");
    return password.length > 0 && verifyPassword(password, row.password_hash);
  }
}
