import type { Database } from "../db/connection.js";
import type { GalleryDto } from "../types/domain.js";

interface GalleryRow {
  id: string;
  name: string;
  path: string;
  enabled: number;
  album_count: number;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}

const toGalleryDto = (row: GalleryRow): GalleryDto => ({
  id: row.id,
  name: row.name,
  path: row.path,
  enabled: row.enabled === 1,
  albumCount: row.album_count,
  lastScannedAt: row.last_scanned_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class GalleryRepository {
  constructor(private readonly db: Database) {}

  list(): GalleryDto[] {
    const rows = this.db
      .prepare(
        `SELECT lr.*, COUNT(a.id) AS album_count
         FROM library_roots lr
         LEFT JOIN albums a ON a.library_root_id = lr.id
         GROUP BY lr.id
         ORDER BY lr.name COLLATE NOCASE ASC`
      )
      .all() as unknown as GalleryRow[];
    return rows.map(toGalleryDto);
  }
}
