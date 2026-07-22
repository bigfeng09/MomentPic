import type { Database } from "../db/connection.js";
import { pagination } from "../lib/api.js";
import type { AssetDto, AuthUser } from "../types/domain.js";

export interface SearchAssetsOptions {
  user: AuthUser;
  page: number;
  pageSize: number;
  includeTotal?: boolean;
  galleryId?: string;
  albumId?: string;
  keyword?: string;
  from?: string;
  to?: string;
  extension?: string;
  orientation?: string;
  sortBy?: string;
  sortOrder?: string;
}

interface AssetRow {
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
  album_name?: string;
}

const toAssetDto = (row: AssetRow): AssetDto => ({
  id: row.id,
  albumId: row.album_id,
  name: row.name,
  extension: row.extension,
  sourceType: row.source_type,
  sourcePath: row.source_path,
  relativePath: row.relative_path,
  zipEntryPath: row.zip_entry_path,
  sortIndex: row.sort_index,
  width: row.width,
  height: row.height,
  sizeBytes: row.size_bytes,
  sourceMtime: row.source_mtime,
  thumbnailKey: row.thumbnail_key,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(row.album_name ? { albumName: row.album_name } : {})
});

const assetColumns = `a.id, a.album_id, a.name, a.extension, a.source_type, a.source_path, a.relative_path,
  a.zip_entry_path, a.sort_index, a.width, a.height, a.size_bytes, a.source_mtime, a.thumbnail_key,
  a.created_at, a.updated_at, albums.name AS album_name`;

const sortableColumns: Record<string, string> = {
  date: "COALESCE(a.source_mtime, a.updated_at, a.created_at)",
  name: "a.name COLLATE NOCASE",
  size: "COALESCE(a.size_bytes, 0)"
};

export class AssetRepository {
  constructor(private readonly db: Database) {}

  search(options: SearchAssetsOptions) {
    const filters: string[] = [];
    const params: Array<string | number> = [];
    if (options.user.role !== "admin") {
      filters.push("a.album_id IN (SELECT album_id FROM shared_albums WHERE username = ?)");
      params.push(options.user.username);
    }
    if (options.galleryId) {
      filters.push("albums.library_root_id = ?");
      params.push(options.galleryId);
    }
    if (options.albumId) {
      filters.push("a.album_id = ?");
      params.push(options.albumId);
    }
    if (options.keyword) {
      filters.push("(a.name LIKE ? OR albums.name LIKE ?)");
      const keyword = `%${options.keyword}%`;
      params.push(keyword, keyword);
    }
    const timestamp = "COALESCE(a.source_mtime, a.updated_at, a.created_at)";
    if (options.from) {
      filters.push(`${timestamp} >= ?`);
      params.push(options.from);
    }
    if (options.to) {
      filters.push(`${timestamp} <= ?`);
      params.push(options.to);
    }
    if (options.extension) {
      filters.push("LOWER(a.extension) = LOWER(?)");
      params.push(options.extension.replace(/^\./, ""));
    }
    if (options.orientation === "landscape") filters.push("a.width IS NOT NULL AND a.height IS NOT NULL AND a.width > a.height");
    if (options.orientation === "portrait") filters.push("a.width IS NOT NULL AND a.height IS NOT NULL AND a.height > a.width");
    if (options.orientation === "square") filters.push("a.width IS NOT NULL AND a.height IS NOT NULL AND a.width = a.height");
    const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const orderColumn = sortableColumns[options.sortBy ?? "date"] ?? sortableColumns.date;
    const order = String(options.sortOrder ?? "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
    const offset = (options.page - 1) * options.pageSize;
    const rows = this.db
      .prepare(
        `SELECT ${assetColumns}
         FROM assets a
         JOIN albums ON albums.id = a.album_id
         ${where}
         ORDER BY ${orderColumn} ${order}, a.id ASC
         LIMIT ? OFFSET ?`
      )
      .all(...params, options.pageSize + 1, offset) as unknown as AssetRow[];
    const hasMore = rows.length > options.pageSize;
    const items = hasMore ? rows.slice(0, options.pageSize) : rows;
    const total = options.includeTotal === false
      ? null
      : (this.db.prepare(`SELECT COUNT(*) AS total FROM assets a JOIN albums ON albums.id = a.album_id ${where}`).get(...params) as { total: number }).total;
    return { items: items.map(toAssetDto), pagination: pagination(options.page, options.pageSize, total, hasMore) };
  }

  listByAlbum(albumId: string, page: number, pageSize: number, includeTotal = true) {
    const album = this.db.prepare("SELECT id FROM albums WHERE id = ?").get(albumId) as { id: string } | undefined;
    if (!album) return null;
    const fetchedRows = this.db
      .prepare(
        `SELECT id, album_id, name, extension, source_type, source_path, relative_path, zip_entry_path, sort_index, width, height, size_bytes, source_mtime, thumbnail_key, created_at, updated_at
         FROM assets
         WHERE album_id = ?
         ORDER BY COALESCE(source_mtime, updated_at, created_at) DESC, sort_index ASC, name COLLATE NOCASE ASC, id ASC
         LIMIT ? OFFSET ?`
      )
      .all(albumId, pageSize + 1, (page - 1) * pageSize) as unknown as AssetRow[];
    const hasMore = fetchedRows.length > pageSize;
    const rows = hasMore ? fetchedRows.slice(0, pageSize) : fetchedRows;
    const total = includeTotal
      ? (this.db.prepare("SELECT COUNT(*) AS total FROM assets WHERE album_id = ?").get(albumId) as { total: number }).total
      : null;
    return {
      items: rows.map(toAssetDto),
      pagination: pagination(page, pageSize, total, hasMore)
    };
  }

  findById(assetId: string): AssetDto | null {
    const row = this.db
      .prepare(
        `SELECT id, album_id, name, extension, source_type, source_path, relative_path, zip_entry_path, sort_index, width, height, size_bytes, source_mtime, thumbnail_key, created_at, updated_at
         FROM assets
         WHERE id = ?`
      )
      .get(assetId) as AssetRow | undefined;
    return row ? toAssetDto(row) : null;
  }
}
