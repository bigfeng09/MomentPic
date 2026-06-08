import type { FastifyInstance } from "fastify";
import { ok } from "../lib/api.js";
import { archiveReadiness } from "../services/archive-zip.js";
import { warmThumbnailForAsset } from "../services/asset-file.js";
import { pruneThumbnailCache, thumbnailCacheStatus } from "../services/thumbnail-cache-lifecycle.js";
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
  thumbnailKey: row.thumbnail_key,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const assetSelect =
  "SELECT id, album_id, name, extension, source_type, source_path, relative_path, zip_entry_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at FROM assets";

const clampLimit = (value: unknown): number => {
  const parsed = Number(value ?? 25);
  if (!Number.isFinite(parsed)) return 25;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
};

export const cacheRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v2/cache/thumbnails/status", async () => ok(thumbnailCacheStatus(app.config)));

  app.get("/api/v2/archive/readiness", async () => ok(archiveReadiness()));

  app.post("/api/v2/cache/thumbnails/prune", async (request) => {
    const body = request.body as { dryRun?: unknown; olderThanDays?: unknown; maxFiles?: unknown } | undefined;
    const olderThanDays = body?.olderThanDays == null ? undefined : Number(body.olderThanDays);
    const maxFiles = body?.maxFiles == null ? undefined : Number(body.maxFiles);
    return ok(
      pruneThumbnailCache(app.config, {
        dryRun: body?.dryRun !== false,
        olderThanDays,
        maxFiles
      })
    );
  });

  app.post("/api/v2/cache/thumbnails/warmup", async (request) => {
    const body = request.body as { limit?: unknown; dryRun?: unknown; scope?: unknown; albumId?: unknown; assetIds?: unknown } | undefined;
    const dryRun = body?.dryRun !== false;
    const limit = clampLimit(body?.limit);
    const scope = body?.scope === "assets" ? "assets" : "covers";
    const albumId = body?.albumId == null ? null : String(body.albumId).trim();
    const requestedAssetIds = Array.isArray(body?.assetIds)
      ? Array.from(new Set(body.assetIds.map((id) => String(id ?? "").trim()).filter(Boolean))).slice(0, limit)
      : [];
    const params: string[] = [];
    const albumFilter = albumId ? "AND a.album_id = ?" : "";
    if (albumId) params.push(albumId);
    const rows =
      requestedAssetIds.length > 0
        ? (app.db
            .prepare(`${assetSelect} WHERE id IN (${requestedAssetIds.map(() => "?").join(", ")}) ORDER BY updated_at DESC, id ASC`)
            .all(...requestedAssetIds) as unknown as AssetRow[])
        : scope === "covers"
        ? (app.db
            .prepare(
              `${assetSelect}
               WHERE id IN (
                 SELECT cover_asset_id FROM albums
                 WHERE cover_asset_id IS NOT NULL ${albumId ? "AND id = ?" : ""}
               )
               ORDER BY updated_at DESC, id ASC
               LIMIT ?`
            )
            .all(...(albumId ? [albumId] : []), limit) as unknown as AssetRow[])
        : (app.db
            .prepare(`${assetSelect} a WHERE 1=1 ${albumFilter} ORDER BY a.updated_at DESC, a.id ASC LIMIT ?`)
            .all(...params, limit) as unknown as AssetRow[]);
    const candidates = rows.map(toAssetDto);

    const result = {
      status: "completed",
      dryRun,
      scope,
      limit,
      candidates: candidates.length,
      processed: 0,
      hit: 0,
      generated: 0,
      unsupported: 0,
      missing: 0,
      failed: 0,
      unsupportedFormat: 0,
      pathMapped: 0,
      errors: 0,
      items: candidates.map((asset) => ({ assetId: asset.id, albumId: asset.albumId, name: asset.name }))
    };

    if (dryRun) return ok(result);

    for (const asset of candidates) {
      result.processed += 1;
      const warmed = await warmThumbnailForAsset(app.config, asset);
      if (warmed.pathMapped) result.pathMapped += 1;
      if (warmed.status === "hit") result.hit += 1;
      else if (warmed.status === "generated") result.generated += 1;
      else if (warmed.status === "unsupported") result.unsupported += 1;
      else if (warmed.status === "missing") result.missing += 1;
      else if (warmed.status === "unsupported-format") result.unsupportedFormat += 1;
      else result.failed += 1;
    }
    result.errors = result.missing + result.failed + result.unsupportedFormat;
    return ok({
      ...result,
      items: result.items.slice(0, 20)
    });
  });
};
