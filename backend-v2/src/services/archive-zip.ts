import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { PassThrough, type Readable } from "node:stream";
import type { FileHeader } from "node-unrar-js";
import yauzl from "yauzl";
import type { AppConfig } from "../config.js";
import type { AssetDto } from "../types/domain.js";
import { resolveReadableAssetPath, type ResolvedAssetPath } from "./path-prefix-mapping.js";

const require = createRequire(import.meta.url);
const { createExtractorFromFile } = require("node-unrar-js") as typeof import("node-unrar-js");
const { path7za } = require("7zip-bin") as typeof import("7zip-bin");

export type ArchiveEntryErrorStatus = "not-found" | "too-large" | "invalid-format" | "unsupported-format" | "unsupported-entry";
export type ArchiveType = "zip" | "rar" | "7z";

export interface ArchiveEntryError {
  ok: false;
  status: ArchiveEntryErrorStatus;
}

export interface ArchiveImageEntry {
  entryPath: string;
  name: string;
  extension: string;
  sizeBytes: number;
}

export interface ArchiveEntryInfo {
  uncompressedSize: number;
  compressedSize: number;
  crc32: number;
}

export interface ArchiveEntrySuccess {
  ok: true;
  archive: ResolvedAssetPath;
  archiveType: ArchiveType;
  entry: ArchiveEntryInfo;
  entryPath: string;
  zipFile?: yauzl.ZipFile;
  zipEntry?: yauzl.Entry;
}

export type ArchiveEntryResult = ArchiveEntrySuccess | ArchiveEntryError;

export interface ArchiveEntryBuffer {
  archive: ResolvedAssetPath;
  entry: ArchiveEntryInfo;
  entryPath: string;
  buffer: Buffer;
}

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".heic", ".heif", ".psd"]);
const ZIP_UTF8_FLAG = 0x800;
const PSD_MAGIC = Buffer.from([0x38, 0x42, 0x50, 0x53]);
const JPEG_EOI = Buffer.from([0xff, 0xd9]);
const supportedArchiveExtensions = new Set([".zip", ".cbz", ".rar", ".cbr", ".7z", ".cb7"]);
const rarArchiveExtensions = new Set([".rar", ".cbr"]);
const sevenZipArchiveExtensions = new Set([".7z", ".cb7"]);
const sevenZipCommands = ["7z", "7zz", "7za"];
const externalArchiveCommands = ["7zip-bin", ...sevenZipCommands, "node-unrar-js"];

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

const firstExecutable = (commands: string[]): { command: string; path: string } | null => {
  for (const command of commands) {
    const resolved = findExecutable(command);
    if (resolved) return { command, path: resolved };
  }
  return null;
};

const resolveBundledSevenZip = (): { command: string; path: string } | null => {
  if (!path7za) return null;
  try {
    try {
      fs.chmodSync(path7za, 0o755);
    } catch {
      // The Dockerfile fixes this for production; this keeps local installs usable.
    }
    fs.accessSync(path7za, fs.constants.X_OK);
    return { command: "7zip-bin", path: path7za };
  } catch {
    return null;
  }
};

const resolveSevenZip = (): { command: string; path: string } | null => firstExecutable(sevenZipCommands) ?? resolveBundledSevenZip();

const rarProviderAvailable = (): boolean => typeof createExtractorFromFile === "function";

export const archiveReadiness = () => {
  const sevenZip = resolveSevenZip();
  const available = externalArchiveCommands
    .map((command) => {
      if (command === "7zip-bin") return { command, path: resolveBundledSevenZip()?.path ?? null };
      if (command === "node-unrar-js") return { command, path: rarProviderAvailable() ? "npm:node-unrar-js" : null };
      return { command, path: findExecutable(command) };
    })
    .filter((entry): entry is { command: string; path: string } => Boolean(entry.path));
  return {
    zip: { status: "ready", provider: "yauzl", formats: ["zip", "cbz"] },
    rar: {
      status: rarProviderAvailable() ? "ready" : "unavailable",
      provider: rarProviderAvailable() ? "node-unrar-js" : null,
      formats: ["rar", "cbr"]
    },
    sevenZip: {
      status: sevenZip ? "available" : "unavailable",
      provider: sevenZip?.command ?? null,
      path: sevenZip?.path ?? null,
      formats: ["7z", "cb7"]
    },
    external: {
      status: available.length > 0 ? "available" : "unavailable",
      available,
      checkedCommands: externalArchiveCommands,
      formats: ["rar", "cbr", "7z", "cb7"]
    }
  };
};

export const detectArchiveType = (filePath: string): ArchiveType | null => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".zip" || extension === ".cbz") return "zip";
  if (rarArchiveExtensions.has(extension)) return "rar";
  if (sevenZipArchiveExtensions.has(extension)) return "7z";
  return null;
};

export const isArchiveAsset = (asset: AssetDto): boolean =>
  asset.sourceType === "archive" || asset.sourceType === "zip" || Boolean(asset.zipEntryPath);

const decodeZipText = (buffer: Buffer, forceUtf8: boolean): string => {
  const utf8 = buffer.toString("utf8");
  if (forceUtf8) return utf8;
  try {
    const gbk = new TextDecoder("gbk").decode(buffer);
    const utf8ReplacementCount = (utf8.match(/\uFFFD/g) ?? []).length;
    const gbkReplacementCount = (gbk.match(/\uFFFD/g) ?? []).length;
    if (gbkReplacementCount < utf8ReplacementCount) return gbk;
    if (gbkReplacementCount === utf8ReplacementCount && /[\u4e00-\u9fff]/.test(gbk) && !/[\u4e00-\u9fff]/.test(utf8)) return gbk;
  } catch {
    return utf8;
  }
  return utf8;
};

const decodedZipEntryPath = (entry: yauzl.Entry): string => {
  const rawName = entry.fileName as unknown as string | Buffer;
  const nameBuffer = Buffer.isBuffer(rawName) ? rawName : Buffer.from(rawName, "utf8");
  const isUtf8 = (entry.generalPurposeBitFlag & ZIP_UTF8_FLAG) === ZIP_UTF8_FLAG;
  return decodeZipText(nameBuffer, isUtf8);
};

const normalizeArchiveEntryPath = (entryPath: string | null | undefined): string | null => {
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
  if (segments[0] === "__MACOSX") return null;
  return segments.join("/");
};

const requestedEntryPathFor = (asset: AssetDto): string | null =>
  normalizeArchiveEntryPath(asset.zipEntryPath ?? asset.relativePath ?? asset.name);

const openZipFile = (archivePath: string): Promise<yauzl.ZipFile> =>
  new Promise((resolve, reject) => {
    yauzl.open(
      archivePath,
      {
        autoClose: false,
        decodeStrings: false,
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

const closeZipFile = (zipFile: yauzl.ZipFile): void => {
  try {
    zipFile.close();
  } catch {
    // Closing is best-effort; response errors are handled by the caller.
  }
};

const openZipEntryStream = (zipFile: yauzl.ZipFile, entry: yauzl.Entry): Promise<Readable> =>
  new Promise((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error || !stream) {
        reject(error ?? new Error("zip entry stream open failed"));
        return;
      }
      resolve(stream);
    });
  });

const isSupportedImageEntryPath = (entryPath: string): boolean => imageExtensions.has(path.extname(entryPath).toLowerCase());

const sortEntries = (entries: ArchiveImageEntry[]): ArchiveImageEntry[] =>
  entries.sort((a, b) => a.entryPath.localeCompare(b.entryPath, "zh-Hans-CN"));

const selectRootOrNestedEntries = (entries: ArchiveImageEntry[]): ArchiveImageEntry[] => {
  const rootImages = entries.filter((entry) => !entry.entryPath.includes("/"));
  const nestedImages = entries.filter((entry) => entry.entryPath.includes("/"));
  if (rootImages.length === 0 || nestedImages.length === 0) return sortEntries(rootImages.length > 0 ? rootImages : entries);
  const sumSize = (items: ArchiveImageEntry[]) => items.reduce((total, item) => total + item.sizeBytes, 0);
  return sortEntries(sumSize(nestedImages) > sumSize(rootImages) ? nestedImages : rootImages);
};

const listZipImageEntries = async (archivePath: string): Promise<ArchiveImageEntry[]> => {
  const zipFile = await openZipFile(archivePath);
  return new Promise((resolve, reject) => {
    const entries: ArchiveImageEntry[] = [];
    const fail = (error: Error) => {
      closeZipFile(zipFile);
      reject(error);
    };
    zipFile.on("entry", (entry) => {
      const entryPath = normalizeArchiveEntryPath(decodedZipEntryPath(entry));
      if (
        entryPath &&
        !entry.isEncrypted() &&
        entry.canDecodeFileData() &&
        isSupportedImageEntryPath(entryPath)
      ) {
        entries.push({
          entryPath,
          name: path.basename(entryPath),
          extension: path.extname(entryPath).toLowerCase(),
          sizeBytes: entry.uncompressedSize
        });
      }
      zipFile.readEntry();
    });
    zipFile.once("end", () => {
      closeZipFile(zipFile);
      resolve(entries);
    });
    zipFile.once("error", fail);
    zipFile.readEntry();
  });
};

const toRarImageEntry = (header: FileHeader): ArchiveImageEntry | null => {
  const entryPath = normalizeArchiveEntryPath(header.name);
  if (!entryPath || header.flags.directory || header.flags.encrypted || !isSupportedImageEntryPath(entryPath)) return null;
  return {
    entryPath,
    name: path.basename(entryPath),
    extension: path.extname(entryPath).toLowerCase(),
    sizeBytes: header.unpSize
  };
};

const listRarImageEntries = async (archivePath: string): Promise<ArchiveImageEntry[]> => {
  if (!rarProviderAvailable()) throw new Error("rar/cbr archive support is unavailable in this build");
  const extractor = await createExtractorFromFile({ filepath: archivePath });
  const list = extractor.getFileList();
  if (list.arcHeader.flags.volume) throw new Error("rar/cbr multi-volume archive is unsupported");
  const entries: ArchiveImageEntry[] = [];
  for (const header of list.fileHeaders) {
    const entry = toRarImageEntry(header);
    if (entry) entries.push(entry);
  }
  return entries;
};

const decode7zText = (buffer: Buffer): string => buffer.toString("utf8");

const run7zBuffer = async (args: string[]): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const resolved = resolveSevenZip();
    if (!resolved) {
      reject(new Error("7z command unavailable"));
      return;
    }
    const child = spawn(resolved.path, args, { windowsHide: true });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdoutChunks));
        return;
      }
      reject(new Error(`7z command failed (${code}): ${decode7zText(Buffer.concat(stderrChunks)) || args.join(" ")}`));
    });
  });

const open7zStream = async (args: string[]): Promise<Readable> =>
  new Promise((resolve, reject) => {
    const resolved = resolveSevenZip();
    if (!resolved) {
      reject(new Error("7z command unavailable"));
      return;
    }
    const child = spawn(resolved.path, args, { windowsHide: true });
    const stderrChunks: Buffer[] = [];
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.once("error", reject);
    child.once("spawn", () => resolve(child.stdout));
    child.once("close", (code) => {
      if (code !== 0) {
        child.stdout.destroy(new Error(`7z command failed (${code}): ${decode7zText(Buffer.concat(stderrChunks)) || args.join(" ")}`));
      }
    });
  });

const list7zImageEntries = async (archivePath: string): Promise<ArchiveImageEntry[]> => {
  const stdout = await run7zBuffer(["l", "-slt", "-ba", archivePath]);
  const blocks = decode7zText(stdout)
    .split(/\r?\n\r?\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
  const entries: ArchiveImageEntry[] = [];
  for (const block of blocks) {
    let entryPath = "";
    let encrypted = false;
    let isDirectory = false;
    let sizeBytes = 0;
    for (const line of block.split(/\r?\n/)) {
      const separatorIndex = line.indexOf(" = ");
      if (separatorIndex <= 0) continue;
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 3).trim();
      if (key === "Path") entryPath = value;
      if (key === "Encrypted") encrypted = value === "+";
      if (key === "Folder") isDirectory = value === "+";
      if (key === "Attributes" && value.startsWith("D")) isDirectory = true;
      if (key === "Size") sizeBytes = Number.parseInt(value, 10) || 0;
    }
    const normalized = normalizeArchiveEntryPath(entryPath);
    if (!normalized || isDirectory || encrypted || !isSupportedImageEntryPath(normalized)) continue;
    entries.push({
      entryPath: normalized,
      name: path.basename(normalized),
      extension: path.extname(normalized).toLowerCase(),
      sizeBytes
    });
  }
  return entries;
};

export const listRootImageEntries = async (archivePath: string): Promise<ArchiveImageEntry[]> => {
  const archiveType = detectArchiveType(archivePath);
  if (archiveType === "zip") return selectRootOrNestedEntries(await listZipImageEntries(archivePath));
  if (archiveType === "7z") return selectRootOrNestedEntries(await list7zImageEntries(archivePath));
  if (archiveType === "rar") return selectRootOrNestedEntries(await listRarImageEntries(archivePath));
  throw new Error("unsupported archive format");
};

const safeTempArchiveFileName = (entryPath: string): string => {
  const extension = path.extname(entryPath).toLowerCase() || ".bin";
  return `entry${extension}`;
};

const readRarEntryBuffer = async (archivePath: string, entryPath: string, maxBytes: number): Promise<Buffer> => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "momentpic-rar-"));
  const outputName = safeTempArchiveFileName(entryPath);
  const outputPath = path.join(tempDir, outputName);
  try {
    const extractor = await createExtractorFromFile({
      filepath: archivePath,
      targetPath: tempDir,
      filenameTransform: () => outputName
    });
    const extracted = extractor.extract({ files: (header) => normalizeArchiveEntryPath(header.name) === entryPath });
    for (const _file of extracted.files) {
      // Exhaust the lazy iterator so native extractor state is released.
    }
    const stat = fs.statSync(outputPath);
    if (stat.size > maxBytes) throw new Error("archive entry is too large");
    return fs.readFileSync(outputPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const findEmbeddedJpegInPsd = (buffer: Buffer): Buffer | null => {
  const markers = [
    Buffer.from([0xff, 0xd8, 0xff, 0xe1]),
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.from([0xff, 0xd8, 0xff, 0xee]),
    Buffer.from([0xff, 0xd8, 0xff, 0xdb]),
    Buffer.from([0xff, 0xd8])
  ];
  for (const marker of markers) {
    const start = buffer.indexOf(marker);
    const end = buffer.lastIndexOf(JPEG_EOI);
    if (start >= 0 && end > start) {
      const extracted = buffer.subarray(start, end + JPEG_EOI.length);
      if (extracted.length > 100 && extracted.length <= buffer.length) return extracted;
    }
  }
  return null;
};

export const extractJpegFromPsd = (buffer: Buffer): Buffer => {
  if (buffer.subarray(0, 4).equals(PSD_MAGIC)) return findEmbeddedJpegInPsd(buffer) ?? buffer;
  return buffer;
};

const bodyWithPsdDetection = async (stream: Readable): Promise<Readable | Buffer> =>
  new Promise((resolve, reject) => {
    const headChunks: Buffer[] = [];
    let headLength = 0;
    let settled = false;
    const cleanup = () => {
      stream.off("data", onData);
      stream.off("end", onEnd);
      stream.off("error", onError);
    };
    const finish = (body: Readable | Buffer) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(body);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onError = (error: Error) => fail(error);
    const onEnd = () => finish(extractJpegFromPsd(Buffer.concat(headChunks, headLength)));
    const onData = (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      headChunks.push(buffer);
      headLength += buffer.length;
      if (headLength < 4) return;
      const head = Buffer.concat(headChunks, headLength);
      cleanup();
      if (head.subarray(0, 4).equals(PSD_MAGIC)) {
        const chunks = [head];
        stream.on("data", (data) => chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data)));
        stream.once("end", () => finish(extractJpegFromPsd(Buffer.concat(chunks))));
        stream.once("error", fail);
        return;
      }
      const output = new PassThrough();
      output.write(head);
      stream.pipe(output);
      finish(output);
    };
    stream.on("data", onData);
    stream.once("end", onEnd);
    stream.once("error", onError);
  });

export const resolveArchiveEntry = async (config: AppConfig, asset: AssetDto): Promise<ArchiveEntryResult> => {
  const requestedEntryPath = requestedEntryPathFor(asset);
  if (!requestedEntryPath) return { ok: false, status: "not-found" };

  const archive = resolveReadableAssetPath(asset.sourcePath, config.pathPrefixMap);
  if (!archive) return { ok: false, status: "not-found" };
  const archiveType = detectArchiveType(archive.path);
  if (!archiveType) return { ok: false, status: "unsupported-format" };

  if (archiveType === "rar") {
    try {
      const entries = await listRarImageEntries(archive.path);
      const found = entries.find((entry) => entry.entryPath === requestedEntryPath);
      if (!found) return { ok: false, status: "not-found" };
      if (found.sizeBytes > config.archiveEntryMaxBytes) return { ok: false, status: "too-large" };
      return {
        ok: true,
        archive,
        archiveType,
        entryPath: requestedEntryPath,
        entry: { uncompressedSize: found.sizeBytes, compressedSize: 0, crc32: 0 }
      };
    } catch {
      return rarProviderAvailable() ? { ok: false, status: "invalid-format" } : { ok: false, status: "unsupported-format" };
    }
  }

  if (archiveType === "7z") {
    try {
      const entries = await list7zImageEntries(archive.path);
      const found = entries.find((entry) => entry.entryPath === requestedEntryPath);
      if (!found) return { ok: false, status: "not-found" };
      if (found.sizeBytes > config.archiveEntryMaxBytes) return { ok: false, status: "too-large" };
      return {
        ok: true,
        archive,
        archiveType,
        entryPath: requestedEntryPath,
        entry: { uncompressedSize: found.sizeBytes, compressedSize: 0, crc32: 0 }
      };
    } catch {
      return resolveSevenZip() ? { ok: false, status: "invalid-format" } : { ok: false, status: "unsupported-format" };
    }
  }

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
      const normalizedEntryPath = normalizeArchiveEntryPath(decodedZipEntryPath(entry));
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
      finish({
        ok: true,
        archive,
        archiveType,
        zipFile,
        zipEntry: entry,
        entryPath: requestedEntryPath,
        entry: { uncompressedSize: entry.uncompressedSize, compressedSize: entry.compressedSize, crc32: entry.crc32 }
      });
    });
    zipFile.once("end", () => finish({ ok: false, status: "not-found" }));
    zipFile.once("error", () => finish({ ok: false, status: "invalid-format" }));
    zipFile.readEntry();
  });
};

export const openArchiveEntryBody = async (entryResult: ArchiveEntrySuccess): Promise<Readable | Buffer> => {
  if (entryResult.archiveType === "zip") {
    if (!entryResult.zipFile || !entryResult.zipEntry) throw new Error("zip entry is not open");
    try {
      const stream = await openZipEntryStream(entryResult.zipFile, entryResult.zipEntry);
      const close = () => closeZipFile(entryResult.zipFile!);
      stream.once("end", close);
      stream.once("close", close);
      stream.once("error", close);
      return bodyWithPsdDetection(stream);
    } catch (error) {
      closeZipFile(entryResult.zipFile);
      throw error;
    }
  }
  if (entryResult.archiveType === "7z") {
    const stream = await open7zStream(["e", "-so", "-bd", "-y", entryResult.archive.path, entryResult.entryPath]);
    return bodyWithPsdDetection(stream);
  }
  if (entryResult.archiveType === "rar") {
    const buffer = await readRarEntryBuffer(entryResult.archive.path, entryResult.entryPath, entryResult.entry.uncompressedSize);
    return extractJpegFromPsd(buffer);
  }
  throw new Error("archive format unavailable");
};

export const openArchiveEntryStream = async (entryResult: ArchiveEntrySuccess): Promise<Readable> => {
  const body = await openArchiveEntryBody(entryResult);
  if (Buffer.isBuffer(body)) {
    const stream = new PassThrough();
    stream.end(body);
    return stream;
  }
  return body;
};

export const readArchiveEntryBuffer = async (config: AppConfig, asset: AssetDto): Promise<ArchiveEntryBuffer | ArchiveEntryError> => {
  const resolved = await resolveArchiveEntry(config, asset);
  if (!resolved.ok) return resolved;

  try {
    const body = await openArchiveEntryBody(resolved);
    if (Buffer.isBuffer(body)) {
      if (body.length > config.archiveEntryMaxBytes) return { ok: false, status: "too-large" };
      return { archive: resolved.archive, entry: resolved.entry, entryPath: resolved.entryPath, buffer: body };
    }

    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of body) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.length;
      if (total > config.archiveEntryMaxBytes) return { ok: false, status: "too-large" };
      chunks.push(buffer);
    }

    return {
      archive: resolved.archive,
      entry: resolved.entry,
      entryPath: resolved.entryPath,
      buffer: extractJpegFromPsd(Buffer.concat(chunks, total))
    };
  } catch {
    return { ok: false, status: "unsupported-entry" };
  } finally {
    if (resolved.zipFile) closeZipFile(resolved.zipFile);
  }
};
