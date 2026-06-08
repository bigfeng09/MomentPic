import path from "node:path";
import fs from "node:fs";
import type { Readable } from "node:stream";
import yauzl from "yauzl";
import type { AppConfig } from "../config.js";
import { resolveReadableAssetPath, type ResolvedAssetPath } from "./path-prefix-mapping.js";
import type { AssetDto } from "../types/domain.js";

export type ArchiveEntryErrorStatus = "not-found" | "too-large" | "invalid-format" | "unsupported-format" | "unsupported-entry";

export interface ArchiveEntryError {
  ok: false;
  status: ArchiveEntryErrorStatus;
}

export interface ArchiveEntrySuccess {
  ok: true;
  archive: ResolvedAssetPath;
  zipFile: yauzl.ZipFile;
  entry: yauzl.Entry;
  entryPath: string;
}

export type ArchiveEntryResult = ArchiveEntrySuccess | ArchiveEntryError;

export interface ArchiveEntryBuffer {
  archive: ResolvedAssetPath;
  entry: yauzl.Entry;
  entryPath: string;
  buffer: Buffer;
}

const supportedArchiveExtensions = new Set([".zip", ".cbz"]);
const explicitlyUnsupportedArchiveExtensions = new Set([".rar", ".cbr", ".7z", ".cb7"]);
const externalArchiveCommands = ["7z", "7zz", "7za", "unrar", "bsdtar", "unar"];

const findExecutable = (command: string): string | null => {
  const pathEnv = process.env.PATH ?? "";
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, command);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // Try the next PATH entry.
    }
  }
  return null;
};

export const archiveReadiness = () => {
  const available = externalArchiveCommands
    .map((command) => ({ command, path: findExecutable(command) }))
    .filter((entry): entry is { command: string; path: string } => Boolean(entry.path));
  return {
    zip: { status: "ready", provider: "yauzl", formats: ["zip", "cbz"] },
    external: {
      status: available.length > 0 ? "available" : "unavailable",
      available,
      checkedCommands: externalArchiveCommands,
      formats: ["rar", "cbr", "7z", "cb7"]
    }
  };
};

export const isArchiveAsset = (asset: AssetDto): boolean =>
  asset.sourceType === "archive" || asset.sourceType === "zip" || Boolean(asset.zipEntryPath);

const normalizeZipEntryPath = (entryPath: string | null | undefined): string | null => {
  if (!entryPath) return null;
  const normalizedSeparators = entryPath.replace(/\\/g, "/").replace(/^\.\/+/, "");
  if (
    !normalizedSeparators ||
    normalizedSeparators.includes("\0") ||
    normalizedSeparators.startsWith("/") ||
    /^[A-Za-z]:\//.test(normalizedSeparators) ||
    normalizedSeparators.endsWith("/")
  ) {
    return null;
  }

  const segments = normalizedSeparators.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  return segments.join("/");
};

const requestedEntryPathFor = (asset: AssetDto): string | null =>
  normalizeZipEntryPath(asset.zipEntryPath ?? asset.relativePath ?? asset.name);

const openZipFile = (archivePath: string): Promise<yauzl.ZipFile> =>
  new Promise((resolve, reject) => {
    yauzl.open(
      archivePath,
      {
        autoClose: false,
        decodeStrings: true,
        lazyEntries: true,
        strictFileNames: false,
        validateEntrySizes: true
      },
      (error, zipFile) => {
        if (error || !zipFile) {
          reject(error ?? new Error("zip open failed"));
          return;
        }
        resolve(zipFile);
      }
    );
  });

const openEntryStream = (zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Readable> =>
  new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error ?? new Error("zip entry stream open failed"));
        return;
      }
      resolve(stream);
    });
  });

const closeZipFile = (zipFile: yauzl.ZipFile): void => {
  try {
    zipFile.close();
  } catch {
    // Closing is best-effort; response errors are handled by the caller.
  }
};

const isSupportedZipSource = (asset: AssetDto, archivePath: string): boolean => {
  const sourceType = asset.sourceType.toLowerCase();
  const archiveExtension = path.extname(archivePath).toLowerCase();
  return sourceType === "zip" || supportedArchiveExtensions.has(archiveExtension) || Boolean(asset.zipEntryPath);
};

export const resolveArchiveEntry = async (config: AppConfig, asset: AssetDto): Promise<ArchiveEntryResult> => {
  const requestedEntryPath = requestedEntryPathFor(asset);
  if (!requestedEntryPath) return { ok: false, status: "not-found" };

  const archive = resolveReadableAssetPath(asset.sourcePath, config.pathPrefixMap);
  if (!archive) return { ok: false, status: "not-found" };
  if (explicitlyUnsupportedArchiveExtensions.has(path.extname(archive.path).toLowerCase())) {
    return { ok: false, status: "unsupported-format" };
  }
  if (!isSupportedZipSource(asset, archive.path)) return { ok: false, status: "unsupported-format" };

  let zipFile: yauzl.ZipFile;
  try {
    zipFile = await openZipFile(archive.path);
  } catch {
    return { ok: false, status: "invalid-format" };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: ArchiveEntryResult) => {
      if (settled) return;
      settled = true;
      zipFile.removeAllListeners("entry");
      zipFile.removeAllListeners("end");
      zipFile.removeAllListeners("error");
      if (!result.ok) closeZipFile(zipFile);
      resolve(result);
    };

    zipFile.on("entry", (entry) => {
      const normalizedEntryPath = normalizeZipEntryPath(entry.fileName);
      if (normalizedEntryPath !== requestedEntryPath) {
        zipFile.readEntry();
        return;
      }

      if (entry.isEncrypted() || !entry.canDecodeFileData()) {
        finish({ ok: false, status: "unsupported-entry" });
        return;
      }

      if (entry.uncompressedSize > config.archiveEntryMaxBytes) {
        finish({ ok: false, status: "too-large" });
        return;
      }

      finish({ ok: true, archive, zipFile, entry, entryPath: requestedEntryPath });
    });
    zipFile.once("end", () => finish({ ok: false, status: "not-found" }));
    zipFile.once("error", () => finish({ ok: false, status: "invalid-format" }));
    zipFile.readEntry();
  });
};

export const openArchiveEntryStream = async (entryResult: ArchiveEntrySuccess): Promise<Readable> => {
  try {
    const stream = await openEntryStream(entryResult.zipFile, entryResult.entry);
    const close = () => closeZipFile(entryResult.zipFile);
    stream.once("end", close);
    stream.once("close", close);
    stream.once("error", close);
    return stream;
  } catch (error) {
    closeZipFile(entryResult.zipFile);
    throw error;
  }
};

export const readArchiveEntryBuffer = async (config: AppConfig, asset: AssetDto): Promise<ArchiveEntryBuffer | ArchiveEntryError> => {
  const resolved = await resolveArchiveEntry(config, asset);
  if (!resolved.ok) return resolved;

  try {
    const stream = await openEntryStream(resolved.zipFile, resolved.entry);
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > config.archiveEntryMaxBytes) return { ok: false, status: "too-large" };
      chunks.push(buffer);
    }

    return {
      archive: resolved.archive,
      entry: resolved.entry,
      entryPath: resolved.entryPath,
      buffer: Buffer.concat(chunks, total)
    };
  } catch {
    return { ok: false, status: "unsupported-entry" };
  } finally {
    closeZipFile(resolved.zipFile);
  }
};
