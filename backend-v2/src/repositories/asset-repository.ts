import type { Database } from "../db/connection.js";
import { pagination } from "../lib/api.js";
import type { AssetDto } from "../types/domain.js";

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
  updatedAt: row.updated_at
});

export class AssetRepository {
  constructor(private readonly db: Database) {}

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
