import fs from "node:fs";
import path from "node:path";
import type { FastifyReply } from "fastify";
import { fail } from "../lib/api.js";
import {
  archiveReadiness,
  isArchiveAsset,
  readArchiveEntryBuffer,
  resolveArchiveEntry,
  openArchiveEntryStream,
  type ArchiveEntryError
} from "./archive-zip.js";
import { resolveReadableAssetPath } from "./path-prefix-mapping.js";
import { getOrCreateArchiveThumbnail, getOrCreateThumbnail, isThumbnailableImageAsset, type ThumbnailResult } from "./thumbnail-cache.js";
import type { AppConfig } from "../config.js";
import type { AssetDto } from "../types/domain.js";

const mimeByExtension: Record<string, string> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp"
};

const normalizedExtension = (extension: string): string => {
  const lower = extension.trim().toLowerCase();
  if (!lower) return "";
  return lower.startsWith(".") ? lower : `.${lower}`;
};

export const contentTypeFor = (asset: AssetDto, entryPath?: string): string => {
  const extension = normalizedExtension(asset.extension) || path.extname(entryPath ?? asset.name).toLowerCase();
  return mimeByExtension[extension] ?? "application/octet-stream";
};

const streamFile = (reply: FastifyReply, filePath: string, stat: fs.Stats, contentType: string) => {
  reply.header("Content-Type", contentType);
  reply.header("Content-Length", String(stat.size));
  return reply.send(fs.createReadStream(filePath));
};

export const sendArchiveError = (reply: FastifyReply, error: ArchiveEntryError) => {
  if (error.status === "not-found") return reply.status(404).send(fail(4003, "asset archive entry not found"));
  if (error.status === "too-large") return reply.status(413).send(fail(4130, "asset archive entry is too large"));
  if (error.status === "invalid-format") return reply.status(415).send(fail(4152, "asset archive is not a readable zip file"));
  if (error.status === "unsupported-entry") return reply.status(415).send(fail(4151, "asset archive entry is unsupported"));
  const readiness = archiveReadiness();
  reply.header("X-MomentPic-Archive-Readiness", readiness.external.status);
  return reply
    .status(501)
    .send(fail(5010, `archive format unavailable; zip/cbz is built in, rar/cbr/7z/cb7 need one of: ${readiness.external.checkedCommands.join(", ")}`));
};

const sendArchiveAssetFile = async (
  reply: FastifyReply,
  asset: AssetDto,
  variant: "original" | "thumbnail"
) => {
  if (variant === "original") {
    const resolved = await resolveArchiveEntry(reply.server.config, asset);
    if (!resolved.ok) return sendArchiveError(reply, resolved);

    reply.header("X-MomentPic-Path-Mapped", resolved.archive.mapped ? "true" : "false");
    reply.header("Content-Type", contentTypeFor(asset, resolved.entryPath));
    reply.header("Content-Length", String(resolved.entry.uncompressedSize));
    const stream = await openArchiveEntryStream(resolved);
    reply.raw.once("close", () => {
      try {
        resolved.zipFile.close();
      } catch {
        // The stream close handler may already have closed the zip file.
      }
    });
    return reply.send(stream);
  }

  if (!isThumbnailableImageAsset(asset)) {
    reply.header("X-MomentPic-Thumbnail-Cache", "fallback");
    reply.header("X-MomentPic-Thumbnail-Fallback", "unsupported");
    return reply.status(415).send(fail(4150, "thumbnail generation unsupported for this asset"));
  }

  const archived = await readArchiveEntryBuffer(reply.server.config, asset);
  if (!("buffer" in archived)) return sendArchiveError(reply, archived);
  reply.header("X-MomentPic-Path-Mapped", archived.archive.mapped ? "true" : "false");

  const thumbnail = await getOrCreateArchiveThumbnail(
    reply.server.config,
    asset,
    {
      archivePath: archived.archive.path,
      archiveStat: archived.archive.stat,
      entryPath: archived.entryPath,
      entrySize: archived.entry.uncompressedSize,
      entryCompressedSize: archived.entry.compressedSize,
      entryCrc32: archived.entry.crc32
    },
    archived.buffer
  );
  const cacheHeader = thumbnail.status === "hit" || thumbnail.status === "generated" ? thumbnail.status : "fallback";
  reply.header("X-MomentPic-Thumbnail-Cache", cacheHeader);
  if (thumbnail.path && thumbnail.stat && thumbnail.contentType) {
    return streamFile(reply, thumbnail.path, thumbnail.stat, thumbnail.contentType);
  }

  reply.header("X-MomentPic-Thumbnail-Fallback", "unsupported");
  return reply.status(415).send(fail(4150, "thumbnail generation unsupported for this archive entry"));
};

export const sendAssetFile = async (
  reply: FastifyReply,
  asset: AssetDto,
  variant: "original" | "thumbnail"
) => {
  if (isArchiveAsset(asset)) {
    return sendArchiveAssetFile(reply, asset, variant);
  }
  if (asset.sourceType !== "folder") {
    return reply.status(501).send(fail(5011, `asset source type not implemented in slice 2: ${asset.sourceType}`));
  }

  const resolved = resolveReadableAssetPath(asset.sourcePath, reply.server.config.pathPrefixMap);
  if (!resolved) {
    return reply.status(404).send(fail(4003, "asset file not found"));
  }

  reply.header("X-MomentPic-Path-Mapped", resolved.mapped ? "true" : "false");

  if (variant === "thumbnail") {
    if (!isThumbnailableImageAsset(asset)) {
      reply.header("X-MomentPic-Thumbnail-Cache", "fallback");
      reply.header("X-MomentPic-Thumbnail-Fallback", "unsupported");
      return reply.status(415).send(fail(4150, "thumbnail generation unsupported for this asset"));
    }

    const thumbnail = await getOrCreateThumbnail(reply.server.config, asset, resolved);
    const cacheHeader = thumbnail.status === "hit" || thumbnail.status === "generated" ? thumbnail.status : "fallback";
    reply.header("X-MomentPic-Thumbnail-Cache", cacheHeader);
    if (thumbnail.path && thumbnail.stat && thumbnail.contentType) {
      return streamFile(reply, thumbnail.path, thumbnail.stat, thumbnail.contentType);
    }

    reply.header("X-MomentPic-Thumbnail-Fallback", "original");
  }

  return streamFile(reply, resolved.path, resolved.stat, contentTypeFor(asset));
};

export interface WarmThumbnailResult {
  status: ThumbnailResult["status"] | "missing" | "unsupported-format";
  pathMapped: boolean | null;
  bytes?: number;
}

export const warmThumbnailForAsset = async (config: AppConfig, asset: AssetDto): Promise<WarmThumbnailResult> => {
  if (!isThumbnailableImageAsset(asset)) return { status: "unsupported", pathMapped: null };

  if (isArchiveAsset(asset)) {
    const archived = await readArchiveEntryBuffer(config, asset);
    if (!("buffer" in archived)) {
      if (archived.status === "not-found") return { status: "missing", pathMapped: null };
      if (archived.status === "unsupported-format") return { status: "unsupported-format", pathMapped: null };
      return { status: "failed", pathMapped: null };
    }
    const thumbnail = await getOrCreateArchiveThumbnail(
      config,
      asset,
      {
        archivePath: archived.archive.path,
        archiveStat: archived.archive.stat,
        entryPath: archived.entryPath,
        entrySize: archived.entry.uncompressedSize,
        entryCompressedSize: archived.entry.compressedSize,
        entryCrc32: archived.entry.crc32
      },
      archived.buffer
    );
    return { status: thumbnail.status, pathMapped: archived.archive.mapped, bytes: thumbnail.stat?.size };
  }

  if (asset.sourceType !== "folder") return { status: "unsupported-format", pathMapped: null };
  const resolved = resolveReadableAssetPath(asset.sourcePath, config.pathPrefixMap);
  if (!resolved) return { status: "missing", pathMapped: null };
  const thumbnail = await getOrCreateThumbnail(config, asset, resolved);
  return { status: thumbnail.status, pathMapped: resolved.mapped, bytes: thumbnail.stat?.size };
};
