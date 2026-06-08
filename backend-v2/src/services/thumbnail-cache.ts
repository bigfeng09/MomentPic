import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { AppConfig } from "../config.js";
import type { ResolvedAssetPath } from "./path-prefix-mapping.js";
import type { AssetDto } from "../types/domain.js";

export type ThumbnailStatus = "hit" | "generated" | "unsupported" | "failed";

export interface ThumbnailResult {
  status: ThumbnailStatus;
  path?: string;
  stat?: fs.Stats;
  contentType?: string;
}

export interface ArchiveThumbnailSource {
  archivePath: string;
  archiveStat: fs.Stats;
  entryPath: string;
  entrySize: number;
  entryCompressedSize: number;
  entryCrc32: number;
}

const thumbnailableExtensions = new Set([".avif", ".bmp", ".gif", ".heic", ".heif", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"]);

const normalizedExtension = (extension: string): string => {
  const lower = extension.trim().toLowerCase();
  if (!lower) return "";
  return lower.startsWith(".") ? lower : `.${lower}`;
};

export const isThumbnailableImageAsset = (asset: AssetDto): boolean => thumbnailableExtensions.has(normalizedExtension(asset.extension));

const cacheFileForParts = (config: AppConfig, parts: string[]): string => {
  const hash = crypto
    .createHash("sha256")
    .update([...parts, String(config.thumbnailMaxSize), "jpeg"].join("\0"))
    .digest("hex");
  return path.join(config.thumbnailCacheDir, hash.slice(0, 2), `${hash}.jpg`);
};

const cacheFileFor = (config: AppConfig, asset: AssetDto, source: ResolvedAssetPath): string => {
  const mtimeMs = Math.round(source.stat.mtimeMs);
  return cacheFileForParts(config, [asset.id, "file", source.path, String(source.stat.size), String(mtimeMs)]);
};

const archiveCacheFileFor = (config: AppConfig, asset: AssetDto, source: ArchiveThumbnailSource): string => {
  const mtimeMs = Math.round(source.archiveStat.mtimeMs);
  return cacheFileForParts(config, [
    asset.id,
    "archive-entry",
    source.archivePath,
    String(source.archiveStat.size),
    String(mtimeMs),
    source.entryPath,
    String(source.entrySize),
    String(source.entryCompressedSize),
    String(source.entryCrc32)
  ]);
};

const statReadableFile = (filePath: string): fs.Stats | null => {
  try {
    const stat = fs.statSync(filePath);
    return stat.isFile() ? stat : null;
  } catch {
    return null;
  }
};

const writeThumbnail = async (cacheFile: string, input: string | Buffer, maxSize: number): Promise<ThumbnailResult> => {
  const tempFile = `${cacheFile}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    await sharp(input, { failOn: "none" })
      .rotate()
      .resize({
        width: maxSize,
        height: maxSize,
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(tempFile);
    fs.renameSync(tempFile, cacheFile);
    const generatedStat = statReadableFile(cacheFile);
    if (!generatedStat) return { status: "failed" };
    return { status: "generated", path: cacheFile, stat: generatedStat, contentType: "image/jpeg" };
  } catch {
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // Ignore cleanup failures; the response still falls back safely.
    }
    return { status: "failed" };
  }
};

export const getOrCreateThumbnail = async (
  config: AppConfig,
  asset: AssetDto,
  source: ResolvedAssetPath
): Promise<ThumbnailResult> => {
  if (!isThumbnailableImageAsset(asset)) return { status: "unsupported" };

  const cacheFile = cacheFileFor(config, asset, source);
  const cachedStat = statReadableFile(cacheFile);
  if (cachedStat) {
    return { status: "hit", path: cacheFile, stat: cachedStat, contentType: "image/jpeg" };
  }

  return writeThumbnail(cacheFile, source.path, config.thumbnailMaxSize);
};

export const getOrCreateArchiveThumbnail = async (
  config: AppConfig,
  asset: AssetDto,
  source: ArchiveThumbnailSource,
  buffer: Buffer
): Promise<ThumbnailResult> => {
  if (!isThumbnailableImageAsset(asset)) return { status: "unsupported" };

  const cacheFile = archiveCacheFileFor(config, asset, source);
  const cachedStat = statReadableFile(cacheFile);
  if (cachedStat) {
    return { status: "hit", path: cacheFile, stat: cachedStat, contentType: "image/jpeg" };
  }

  return writeThumbnail(cacheFile, buffer, config.thumbnailMaxSize);
};
