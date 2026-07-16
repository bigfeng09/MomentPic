import fs from "node:fs";
import path from "node:path";
import type { FastifyReply } from "fastify";
import { fail } from "../lib/api.js";
import {
  archiveReadiness,
  isArchiveAsset,
  openArchiveEntryBody,
  readArchiveEntryBuffer,
  resolveArchiveEntry,
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
  ".psd": "image/jpeg",
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

const etagFor = (stat: fs.Stats): string => `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;

const requestHeader = (reply: FastifyReply, name: string): string => {
  const value = reply.request.headers[name];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
};

const isNotModified = (reply: FastifyReply, etag: string, stat: fs.Stats): boolean => {
  const ifNoneMatch = requestHeader(reply, "if-none-match");
  if (ifNoneMatch && ifNoneMatch.split(",").some((value) => value.trim() === etag || value.trim() === "*")) return true;
  if (ifNoneMatch) return false;
  const ifModifiedSince = Date.parse(requestHeader(reply, "if-modified-since"));
  return Number.isFinite(ifModifiedSince) && Math.trunc(stat.mtimeMs / 1000) <= Math.trunc(ifModifiedSince / 1000);
};

const byteRange = (header: string, size: number): { start: number; end: number } | null | "invalid" => {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2]) || size <= 0) return "invalid";
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isInteger(suffix) || suffix <= 0) return "invalid";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(requestedEnd) || start < 0 || start >= size || requestedEnd < start) return "invalid";
  return { start, end: Math.min(size - 1, requestedEnd) };
};

const streamFile = (reply: FastifyReply, filePath: string, stat: fs.Stats, contentType: string, maxAgeSeconds: number) => {
  const etag = etagFor(stat);
  reply.header("Content-Type", contentType);
  reply.header("Cache-Control", `private, max-age=${maxAgeSeconds}, must-revalidate`);
  reply.header("ETag", etag);
  reply.header("Last-Modified", stat.mtime.toUTCString());
  reply.header("Accept-Ranges", "bytes");
  reply.header("X-Content-Type-Options", "nosniff");
  if (isNotModified(reply, etag, stat)) return reply.status(304).send();

  const range = byteRange(requestHeader(reply, "range"), stat.size);
  if (range === "invalid") {
    reply.header("Content-Range", `bytes */${stat.size}`);
    return reply.status(416).send();
  }
  if (range) {
    reply.header("Content-Range", `bytes ${range.start}-${range.end}/${stat.size}`);
    reply.header("Content-Length", String(range.end - range.start + 1));
    return reply.status(206).send(fs.createReadStream(filePath, range));
  }

  reply.header("Content-Length", String(stat.size));
  return reply.send(fs.createReadStream(filePath));
};

export const sendArchiveError = (reply: FastifyReply, error: ArchiveEntryError) => {
  if (error.status === "not-found") return reply.status(404).send(fail(4003, "asset archive entry not found"));
  if (error.status === "too-large") return reply.status(413).send(fail(4130, "asset archive entry is too large"));
  if (error.status === "invalid-format") return reply.status(415).send(fail(4152, "asset archive is not a readable archive file"));
  if (error.status === "unsupported-entry") return reply.status(415).send(fail(4151, "asset archive entry is unsupported"));
  const readiness = archiveReadiness();
  reply.header("X-MomentPic-Archive-Readiness", readiness.external.status);
  return reply
    .status(501)
    .send(fail(5010, `archive format unavailable; expected zip/cbz/rar/cbr/7z/cb7 support from: ${readiness.external.checkedCommands.join(", ")}`));
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
    reply.header("Cache-Control", "private, max-age=300, must-revalidate");
    reply.header("X-Content-Type-Options", "nosniff");
    const body = await openArchiveEntryBody(resolved);
    if (Buffer.isBuffer(body)) {
      reply.header("Content-Length", String(body.length));
      return reply.send(body);
    }
    reply.header("Content-Length", String(resolved.entry.uncompressedSize));
    return reply.send(body);
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
    return streamFile(reply, thumbnail.path, thumbnail.stat, thumbnail.contentType, 86_400);
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
      return streamFile(reply, thumbnail.path, thumbnail.stat, thumbnail.contentType, 86_400);
    }

    reply.header("X-MomentPic-Thumbnail-Fallback", "original");
  }

  return streamFile(reply, resolved.path, resolved.stat, contentTypeFor(asset), 300);
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
