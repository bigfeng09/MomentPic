import type { Database } from "../db/connection.js";
import { pagination } from "../lib/api.js";
import type { AlbumDto, AuthUser } from "../types/domain.js";

export interface ListAlbumsOptions {
  galleryId?: string;
  keyword?: string;
  sortBy?: string;
  sortOrder?: string;
  user?: AuthUser;
  includeTotal?: boolean;
  page: number;
  pageSize: number;
}

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

const sortableColumns: Record<string, string> = {
  name: "name",
  createdAt: "created_at",
  updatedAt: "updated_at",
  assetCount: "asset_count"
};

export class AlbumRepository {
  constructor(private readonly db: Database) {}

  list(options: ListAlbumsOptions) {
    const filters: string[] = [];
    const params: Array<string | number> = [];
    if (options.galleryId) {
      filters.push("library_root_id = ?");
      params.push(options.galleryId);
    }
    if (options.keyword) {
      filters.push("name LIKE ?");
      params.push(`%${options.keyword}%`);
    }
    if (options.user && options.user.role !== "admin") {
      filters.push("id IN (SELECT album_id FROM shared_albums WHERE username = ?)");
      params.push(options.user.username);
    }
    const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const sortColumn = sortableColumns[options.sortBy ?? "updatedAt"] ?? "updated_at";
    const sortOrder = String(options.sortOrder ?? "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
    const offset = (options.page - 1) * options.pageSize;
    const fetchedRows = this.db
      .prepare(
        `SELECT id, library_root_id, name, source_type, source_path, cover_asset_id, asset_count, scan_status, error_message, created_at, updated_at
         FROM albums
         ${where}
         ORDER BY ${sortColumn} ${sortOrder}, id ASC
         LIMIT ? OFFSET ?`
      )
      .all(...params, options.pageSize + 1, offset) as unknown as AlbumRow[];
    const hasMore = fetchedRows.length > options.pageSize;
    const rows = hasMore ? fetchedRows.slice(0, options.pageSize) : fetchedRows;
    const total = options.includeTotal === false
      ? null
      : (this.db.prepare(`SELECT COUNT(*) AS total FROM albums ${where}`).get(...params) as { total: number }).total;
    return {
      items: rows.map(toAlbumDto),
      pagination: pagination(options.page, options.pageSize, total, hasMore)
    };
  }

  findById(albumId: string): AlbumDto | null {
    const row = this.db
      .prepare(
        "SELECT id, library_root_id, name, source_type, source_path, cover_asset_id, asset_count, scan_status, error_message, created_at, updated_at FROM albums WHERE id = ?"
      )
      .get(albumId) as AlbumRow | undefined;
    return row ? toAlbumDto(row) : null;
  }

  canAccessAlbum(albumId: string, user: AuthUser | undefined): boolean {
    if (!user) return false;
    if (user.role === "admin") return true;
    const row = this.db
      .prepare("SELECT 1 AS ok FROM shared_albums WHERE username = ? AND album_id = ?")
      .get(user.username, albumId) as { ok: number } | undefined;
    return Boolean(row);
  }
}
