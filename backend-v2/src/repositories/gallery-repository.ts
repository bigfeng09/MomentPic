import type { Database } from "../db/connection.js";
import { assertSafeLibraryPath } from "../services/library-root-path.js";
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

const slugFromPath = (value: string): string => {
  const segments = value.replace(/\\/g, "/").split("/").filter(Boolean);
  const base = segments.at(-1) ?? "gallery";
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "gallery";
};

const displayNameFromPath = (value: string): string => {
  const segments = value.replace(/\\/g, "/").split("/").filter(Boolean);
  return segments.at(-1) || value;
};

export class GalleryRepository {
  constructor(private readonly db: Database) {}

  list(): GalleryDto[] {
    const rows = this.db
      .prepare(
        `SELECT lr.*, COUNT(a.id) AS album_count
         FROM library_roots lr
         LEFT JOIN albums a ON a.library_root_id = lr.id
         GROUP BY lr.id
         ORDER BY lr.updated_at DESC, lr.created_at DESC, lr.name COLLATE NOCASE ASC, lr.id ASC`
      )
      .all() as unknown as GalleryRow[];
    return rows.map(toGalleryDto);
  }

  findById(id: string): GalleryDto | null {
    const row = this.db
      .prepare(
        `SELECT lr.*, COUNT(a.id) AS album_count
         FROM library_roots lr
         LEFT JOIN albums a ON a.library_root_id = lr.id
         WHERE lr.id = ?
         GROUP BY lr.id`
      )
      .get(id) as unknown as GalleryRow | undefined;
    return row ? toGalleryDto(row) : null;
  }

  create(input: { name?: unknown; path?: unknown; allowedPrefixes: string[] }): GalleryDto {
    const libraryPath = assertSafeLibraryPath(input.path, input.allowedPrefixes);
    const name = String(input.name ?? "").trim() || displayNameFromPath(libraryPath);
    if (!name) throw new Error("name required");
    if (name.length > 120) throw new Error("name is too long");

    const existing = this.db.prepare("SELECT * FROM library_roots WHERE path = ?").get(libraryPath) as GalleryRow | undefined;
    if (existing) throw new Error("library path already exists");

    const now = new Date().toISOString();
    const baseId = slugFromPath(libraryPath);
    let id = baseId;
    let suffix = 2;
    while (this.db.prepare("SELECT 1 FROM library_roots WHERE id = ?").get(id)) {
      id = `${baseId}-${suffix}`;
      suffix++;
    }

    this.db
      .prepare("INSERT INTO library_roots (id, name, path, enabled, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)")
      .run(id, name, libraryPath, now, now);
    const created = this.db
      .prepare(
        `SELECT lr.*, COUNT(a.id) AS album_count
         FROM library_roots lr
         LEFT JOIN albums a ON a.library_root_id = lr.id
         WHERE lr.id = ?
         GROUP BY lr.id`
      )
      .get(id) as unknown as GalleryRow;
    return toGalleryDto(created);
  }

  update(id: string, input: { name?: unknown; enabled?: unknown }): GalleryDto | null {
    const existing = this.findById(id);
    if (!existing) return null;
    const name = input.name === undefined ? existing.name : String(input.name ?? "").trim();
    if (!name) throw new Error("name required");
    if (name.length > 120) throw new Error("name is too long");
    const enabled = input.enabled === undefined ? existing.enabled : Boolean(input.enabled);
    const now = new Date().toISOString();
    this.db.prepare("UPDATE library_roots SET name = ?, enabled = ?, updated_at = ? WHERE id = ?").run(name, enabled ? 1 : 0, now, id);
    return this.findById(id);
  }
}
