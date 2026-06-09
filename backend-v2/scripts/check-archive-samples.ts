import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import sharp from "sharp";
import { loadConfig, type AppConfig } from "../src/config.js";
import { readArchiveEntryBuffer } from "../src/services/archive-zip.js";
import { applyPathPrefixMap, resolveReadableAssetPath } from "../src/services/path-prefix-mapping.js";
import type { AssetDto } from "../src/types/domain.js";

interface CliOptions {
  legacyDbPath: string;
  importedDbPath: string;
  topLimit: number;
  sampleLimit: number;
}

interface ArchiveAssetRow {
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
  size_bytes: number | string | null;
  source_mtime: string | null;
  thumbnail_key: string | null;
  created_at: string;
  updated_at: string;
}

interface ValueCountRow {
  value: string | null;
  total: number;
}

interface SizeStats {
  known: number;
  total: number;
  min: number | null;
  max: number | null;
}

type Counter = Map<string, number>;

const defaultLegacyDbPath = "data/legacy-real-dryrun.sqlite";
const defaultImportedDbPath = "data/momentpic-v2-import-test.sqlite";
const defaultTopLimit = 8;
const defaultSampleLimit = 20;

const printHelp = (): void => {
  console.log(`Usage: npm run check:archive-samples -- [--legacy-db <path>] [--imported-db <path>]

Read-only local validation for legacy/imported zip/archive asset samples.

Options:
  --legacy-db <path>    Legacy Moment Pic SQLite file. Default: ${defaultLegacyDbPath}
  --imported-db <path>  Isolated v2 import-test SQLite file. Default: ${defaultImportedDbPath}
  --top <n>             Top aggregate rows to print. Default: ${defaultTopLimit}
  --limit <n>           Archive samples to verify from the imported DB when present. Default: ${defaultSampleLimit}
  --help                Show this help.
`);
};

const parsePositiveInteger = (label: string, value: string | undefined): number => {
  if (!value) throw new Error(`${label} requires a value`);
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer`);
  return parsed;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    legacyDbPath: defaultLegacyDbPath,
    importedDbPath: defaultImportedDbPath,
    topLimit: defaultTopLimit,
    sampleLimit: defaultSampleLimit
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--legacy-db") {
      options.legacyDbPath = argv[index + 1] ?? "";
      if (!options.legacyDbPath) throw new Error("--legacy-db requires a path");
      index += 1;
      continue;
    }
    if (arg === "--imported-db") {
      options.importedDbPath = argv[index + 1] ?? "";
      if (!options.importedDbPath) throw new Error("--imported-db requires a path");
      index += 1;
      continue;
    }
    if (arg === "--top") {
      options.topLimit = parsePositiveInteger("--top", argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--limit" || arg === "--samples") {
      options.sampleLimit = parsePositiveInteger(arg, argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`unknown argument: ${arg}`);
  }

  return options;
};

const openReadOnlyDb = (dbPath: string): DatabaseSync | null => {
  const resolved = path.resolve(dbPath);
  if (!fs.existsSync(resolved)) return null;
  return new DatabaseSync(resolved, { readOnly: true, enableForeignKeyConstraints: false });
};

const tableExists = (db: DatabaseSync, tableName: string): boolean =>
  Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));

const displayValue = (value: string | null | undefined): string => {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : "(empty)";
};

const parseSize = (value: number | string | null): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const updateSizeStats = (stats: SizeStats, size: number | null): void => {
  if (size === null) return;
  stats.known += 1;
  stats.total += size;
  stats.min = stats.min === null ? size : Math.min(stats.min, size);
  stats.max = stats.max === null ? size : Math.max(stats.max, size);
};

const increment = (counter: Counter, value: string, by = 1): void => {
  counter.set(value, (counter.get(value) ?? 0) + by);
};

const topEntries = (counter: Counter, limit: number): Array<[string, number]> =>
  [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const mib = bytes / 1024 / 1024;
  if (mib < 1024) return `${mib.toFixed(2)} MiB`;
  return `${(mib / 1024).toFixed(2)} GiB`;
};

const formatSizeStats = (stats: SizeStats): string => {
  if (stats.known === 0 || stats.min === null || stats.max === null) return "known=0";
  return `known=${stats.known} min=${formatBytes(stats.min)} avg=${formatBytes(Math.round(stats.total / stats.known))} max=${formatBytes(stats.max)}`;
};

const pathPrefix = (rawPath: string | null | undefined): string => {
  const trimmed = String(rawPath ?? "").trim();
  if (!trimmed) return "(empty)";
  const normalized = trimmed.replace(/\\/g, "/").replace(/\/+/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return normalized.startsWith("/") ? "/" : normalized;

  const depth = normalized.startsWith("/") ? 5 : 3;
  const prefix = parts.slice(0, Math.min(depth, parts.length)).join("/");
  return normalized.startsWith("/") ? `/${prefix}` : prefix;
};

const basenameOnly = (rawPath: string): string => {
  const normalized = rawPath.replace(/\\/g, "/");
  return path.posix.basename(normalized) || "(empty)";
};

const entryLabel = (asset: AssetDto): string => {
  const candidate = asset.zipEntryPath ?? asset.relativePath ?? asset.name;
  const normalized = candidate.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts.slice(Math.max(0, parts.length - 2)).join("/") || displayValue(candidate);
};

const isThumbnailCandidate = (asset: AssetDto): boolean => {
  const extension = `.${asset.extension.replace(/^\./, "").toLowerCase()}`;
  return [".avif", ".bmp", ".gif", ".heic", ".heif", ".jpeg", ".jpg", ".png", ".tif", ".tiff", ".webp"].includes(extension);
};

const verifyThumbnailInMemory = async (config: AppConfig, buffer: Buffer): Promise<boolean> => {
  try {
    const output = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({
        width: config.thumbnailMaxSize,
        height: config.thumbnailMaxSize,
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return output.length > 0;
  } catch {
    return false;
  }
};

const toAssetDto = (row: ArchiveAssetRow): AssetDto => ({
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
  sizeBytes: parseSize(row.size_bytes),
  sourceMtime: row.source_mtime,
  thumbnailKey: row.thumbnail_key,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const printCounter = (title: string, counter: Counter, limit: number): void => {
  console.log(`  ${title}:`);
  for (const [value, total] of topEntries(counter, limit)) {
    console.log(`    ${value}: ${total}`);
  }
};

const printValueCounts = (title: string, rows: ValueCountRow[]): void => {
  console.log(`  ${title}:`);
  for (const row of rows) {
    console.log(`    ${displayValue(row.value)}: ${row.total}`);
  }
};

const archiveWhereClause = `
  source_type IN ('zip', 'archive')
  OR zip_entry_path IS NOT NULL
  OR LOWER(source_path) LIKE '%.zip'
  OR LOWER(source_path) LIKE '%.cbz'
`;

const summarizeDb = (label: string, dbPath: string, topLimit: number): DatabaseSync | null => {
  const db = openReadOnlyDb(dbPath);
  const resolved = path.resolve(dbPath);
  if (!db) {
    console.log(`\n== ${label}: ${resolved} ==`);
    console.log("  status: blocked; DB file is missing");
    return null;
  }

  try {
    if (!tableExists(db, "assets")) {
      console.log(`\n== ${label}: ${resolved} ==`);
      console.log("  status: blocked; assets table is missing");
      db.close();
      return null;
    }

    console.log(`\n== ${label}: ${resolved} ==`);
    const sourceTypeRows = db
      .prepare(
        `SELECT COALESCE(NULLIF(source_type, ''), '(empty)') AS value, COUNT(*) AS total
         FROM assets
         GROUP BY value
         ORDER BY total DESC, value ASC`
      )
      .all() as unknown as ValueCountRow[];
    printValueCounts("assets.source_type distribution", sourceTypeRows);

    const archiveTotal = (db.prepare(`SELECT COUNT(*) AS total FROM assets WHERE ${archiveWhereClause}`).get() as { total: number }).total;
    console.log(`  archive candidate assets: ${archiveTotal}`);

    const pathPrefixes: Counter = new Map();
    const entryFieldCounts: Counter = new Map([
      ["zip_entry_path", 0],
      ["relative_path", 0],
      ["name_only", 0],
      ["missing_all", 0]
    ]);
    const sourceSizeStats: SizeStats = { known: 0, total: 0, min: null, max: null };

    for (const row of db
      .prepare(
        `SELECT source_path, zip_entry_path, relative_path, name, size_bytes
         FROM assets
         WHERE ${archiveWhereClause}`
      )
      .iterate() as Iterable<Pick<ArchiveAssetRow, "source_path" | "zip_entry_path" | "relative_path" | "name" | "size_bytes">>) {
      increment(pathPrefixes, pathPrefix(row.source_path));
      if (String(row.zip_entry_path ?? "").trim()) increment(entryFieldCounts, "zip_entry_path");
      else if (String(row.relative_path ?? "").trim()) increment(entryFieldCounts, "relative_path");
      else if (String(row.name ?? "").trim()) increment(entryFieldCounts, "name_only");
      else increment(entryFieldCounts, "missing_all");
      updateSizeStats(sourceSizeStats, parseSize(row.size_bytes));
    }

    printCounter(`archive source_path prefix Top ${topLimit}`, pathPrefixes, topLimit);
    printCounter("entry path fallback availability", entryFieldCounts, topLimit);
    console.log(`  assets.size_bytes among archive candidates: ${formatSizeStats(sourceSizeStats)}`);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
};

const readArchiveSamples = (db: DatabaseSync, limit: number): AssetDto[] =>
  (
    db
      .prepare(
        `SELECT id, album_id, name, extension, source_type, source_path, relative_path, zip_entry_path, sort_index, width, height, size_bytes, source_mtime, thumbnail_key, created_at, updated_at
         FROM assets
         WHERE ${archiveWhereClause}
           AND source_path IS NOT NULL
           AND TRIM(source_path) != ''
         ORDER BY id ASC
         LIMIT ?`
      )
      .all(limit) as unknown as ArchiveAssetRow[]
  ).map(toAssetDto);

const printPathPrefixMap = (config: AppConfig): void => {
  console.log("\n== Runtime path prefix map ==");
  if (config.pathPrefixMap.length === 0) {
    console.log("  no mapping rules configured");
    return;
  }
  for (const rule of config.pathPrefixMap) {
    console.log(`  ${rule.from} -> ${rule.to}`);
  }
};

const verifySamples = async (config: AppConfig, samples: AssetDto[]): Promise<void> => {
  console.log(`\n== Archive sample verification (limit=${samples.length}) ==`);
  if (samples.length === 0) {
    console.log("  status: blocked; no archive candidate samples were found");
    return;
  }

  const counters: Counter = new Map([
    ["archive_path_readable", 0],
    ["archive_path_missing", 0],
    ["archive_path_mapped", 0],
    ["entry_readable", 0],
    ["entry_not_found", 0],
    ["entry_too_large", 0],
    ["invalid_zip", 0],
    ["unsupported_format", 0],
    ["unsupported_entry", 0],
    ["thumbnail_candidate", 0],
    ["thumbnail_memory_ok", 0],
    ["thumbnail_memory_failed", 0]
  ]);
  const sourcePrefixes: Counter = new Map();
  const entrySizeStats: SizeStats = { known: 0, total: 0, min: null, max: null };
  const missingExamples: string[] = [];
  const readableExamples: string[] = [];

  for (const sample of samples) {
    increment(sourcePrefixes, pathPrefix(sample.sourcePath));
    const mappedCandidates = applyPathPrefixMap(sample.sourcePath, config.pathPrefixMap);
    const archive = resolveReadableAssetPath(sample.sourcePath, config.pathPrefixMap);
    if (!archive) {
      increment(counters, "archive_path_missing");
      if (missingExamples.length < 5) {
        const candidateCount = 1 + mappedCandidates.length;
        missingExamples.push(`${sample.id} archive=${basenameOnly(sample.sourcePath)} candidates=${candidateCount} entry=${entryLabel(sample)}`);
      }
      continue;
    }

    increment(counters, "archive_path_readable");
    if (archive.mapped) increment(counters, "archive_path_mapped");

    const entry = await readArchiveEntryBuffer(config, sample);
    if ("buffer" in entry) {
      increment(counters, "entry_readable");
      updateSizeStats(entrySizeStats, entry.entry.uncompressedSize);
      if (isThumbnailCandidate(sample)) {
        increment(counters, "thumbnail_candidate");
        if (await verifyThumbnailInMemory(config, entry.buffer)) increment(counters, "thumbnail_memory_ok");
        else increment(counters, "thumbnail_memory_failed");
      }
      if (readableExamples.length < 5) {
        readableExamples.push(
          `${sample.id} archive=${basenameOnly(entry.archive.path)} mapped=${entry.archive.mapped} entry=${entryLabel(sample)} bytes=${entry.buffer.length}`
        );
      }
      continue;
    }

    if (entry.status === "not-found") increment(counters, "entry_not_found");
    else if (entry.status === "too-large") increment(counters, "entry_too_large");
    else if (entry.status === "invalid-format") increment(counters, "invalid_zip");
    else if (entry.status === "unsupported-format") increment(counters, "unsupported_format");
    else increment(counters, "unsupported_entry");
  }

  printCounter("sample source_path prefix Top", sourcePrefixes, 8);
  printCounter("verification result counts", counters, counters.size);
  console.log(`  readable entry size stats: ${formatSizeStats(entrySizeStats)}`);

  if (readableExamples.length > 0) {
    console.log("  readable examples:");
    for (const example of readableExamples) console.log(`    - ${example}`);
  }
  if (missingExamples.length > 0) {
    console.log("  missing archive examples:");
    for (const example of missingExamples) console.log(`    - ${example}`);
  }

  const readable = counters.get("entry_readable") ?? 0;
  const missing = counters.get("archive_path_missing") ?? 0;
  if (readable === 0 && missing === samples.length) {
    console.log("  blocked: no sampled archive file was accessible from this host");
  } else if (readable === 0) {
    console.log("  blocked: sampled archive paths were not readable or entries could not be read");
  } else {
    console.log("  original validation: passed for readable entries via archive-zip service buffer read");
    console.log("  thumbnail validation: readable image entries were decoded/resized in memory with the same sharp settings");
  }
};

try {
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  console.log("MomentPic archive sample check (read-only)");
  console.log(`archive entry max bytes: ${formatBytes(config.archiveEntryMaxBytes)}`);
  printPathPrefixMap(config);

  const legacyDb = summarizeDb("legacy", options.legacyDbPath, options.topLimit);
  const importedDb = summarizeDb("imported", options.importedDbPath, options.topLimit);
  const sampleDb = importedDb ?? legacyDb;
  if (!sampleDb) {
    console.log("\nblocked: neither legacy nor imported DB is available for archive sample verification");
  } else {
    await verifySamples(config, readArchiveSamples(sampleDb, options.sampleLimit));
  }

  importedDb?.close();
  if (legacyDb && legacyDb !== importedDb) legacyDb.close();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
