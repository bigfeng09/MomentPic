import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

interface CliOptions {
  legacyDbPath?: string;
  importedDbPath?: string;
  topLimit: number;
  sampleLimit: number;
}

interface CountRow {
  total: number;
}

interface ValueCountRow {
  value: string | null;
  total: number;
}

interface LibraryRootRow {
  id: string;
  name: string;
  path: string | null;
  enabled: number | null;
  album_count: number;
  asset_count: number;
}

interface AlbumScanRow {
  source_type: string | null;
  source_path: string | null;
}

interface AssetScanRow {
  source_type: string | null;
  source_path: string | null;
  relative_path: string | null;
  zip_entry_path: string | null;
  extension: string | null;
  size_bytes: number | string | null;
}

type Counter = Map<string, number>;

const defaultTopLimit = 10;
const defaultSampleLimit = 8;

const printHelp = (): void => {
  console.log(`Usage: npm run check:path-mapping -- --legacy-db <path> [--imported-db <path>]

Summarizes legacy/v2 path fields in read-only mode before a real import.

Options:
  --legacy-db <path>    Required legacy Moment Pic SQLite file.
  --imported-db <path>  Optional isolated v2 import-test SQLite file.
  --top <n>             Top prefix/extension rows to print. Default: ${defaultTopLimit}.
  --samples <n>         Sample path rows to print. Default: ${defaultSampleLimit}.
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
  const options: CliOptions = { topLimit: defaultTopLimit, sampleLimit: defaultSampleLimit };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--legacy-db") {
      options.legacyDbPath = argv[index + 1];
      if (!options.legacyDbPath) throw new Error("--legacy-db requires a path");
      index += 1;
      continue;
    }
    if (arg === "--imported-db") {
      options.importedDbPath = argv[index + 1];
      if (!options.importedDbPath) throw new Error("--imported-db requires a path");
      index += 1;
      continue;
    }
    if (arg === "--top") {
      options.topLimit = parsePositiveInteger("--top", argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--samples") {
      options.sampleLimit = parsePositiveInteger("--samples", argv[index + 1]);
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

const openReadOnlyDb = (dbPath: string): DatabaseSync => {
  const resolved = path.resolve(dbPath);
  if (!fs.existsSync(resolved)) throw new Error(`DB not found: ${resolved}`);
  return new DatabaseSync(resolved, { readOnly: true, enableForeignKeyConstraints: false });
};

const tableExists = (db: DatabaseSync, tableName: string): boolean => {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
  return Boolean(row);
};

const countRows = (db: DatabaseSync, tableName: string): number => {
  if (!tableExists(db, tableName)) return 0;
  return (db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get() as unknown as CountRow).total;
};

const displayValue = (value: string | null | undefined): string => {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : "(empty)";
};

const increment = (counter: Counter, value: string, by = 1): void => {
  counter.set(value, (counter.get(value) ?? 0) + by);
};

const topEntries = (counter: Counter, limit: number): Array<[string, number]> =>
  [...counter.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);

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

const fileExtension = (rawPath: string | null | undefined): string => {
  const parsed = path.posix.extname(String(rawPath ?? "").replace(/\\/g, "/")).toLowerCase();
  return parsed || "(none)";
};

const parseSize = (value: number | string | null): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const mib = bytes / 1024 / 1024;
  if (mib < 1024) return `${mib.toFixed(2)} MiB`;
  return `${(mib / 1024).toFixed(2)} GiB`;
};

const printValueCounts = (title: string, rows: ValueCountRow[]): void => {
  console.log(`  ${title}:`);
  for (const row of rows) {
    console.log(`    ${displayValue(row.value)}: ${row.total}`);
  }
};

const printCounter = (title: string, counter: Counter, limit: number): void => {
  console.log(`  ${title}:`);
  for (const [value, total] of topEntries(counter, limit)) {
    console.log(`    ${value}: ${total}`);
  }
};

const printSamples = (title: string, rows: Array<{ source_path: string | null }>): void => {
  console.log(`  ${title}:`);
  for (const row of rows) {
    console.log(`    - ${displayValue(row.source_path)}`);
  }
};

const scanAlbums = (db: DatabaseSync, topLimit: number, sampleLimit: number): void => {
  const sourceTypeCounts = db
    .prepare(
      `SELECT COALESCE(NULLIF(source_type, ''), '(empty)') AS value, COUNT(*) AS total
       FROM albums
       GROUP BY value
       ORDER BY total DESC, value ASC`
    )
    .all() as unknown as ValueCountRow[];
  printValueCounts("albums.source_type distribution", sourceTypeCounts);

  const prefixCounts: Counter = new Map();
  const archiveCounts: Counter = new Map();
  let emptySourcePath = 0;
  for (const row of db.prepare("SELECT source_type, source_path FROM albums").iterate() as Iterable<AlbumScanRow>) {
    if (!String(row.source_path ?? "").trim()) emptySourcePath += 1;
    increment(prefixCounts, pathPrefix(row.source_path));
    const type = displayValue(row.source_type).toLowerCase();
    const ext = fileExtension(row.source_path);
    const archiveKind = type.includes("zip") || type.includes("archive") || ext === ".zip" ? "zip/archive" : "folder/other";
    increment(archiveCounts, archiveKind);
  }
  printCounter(`albums.source_path prefix Top ${topLimit}`, prefixCounts, topLimit);
  printCounter("albums zip/archive distribution", archiveCounts, topLimit);
  console.log(`  albums empty source_path: ${emptySourcePath}`);

  const albumSamples = db
    .prepare(
      `SELECT source_path
       FROM albums
       WHERE source_path IS NOT NULL AND TRIM(source_path) != ''
       ORDER BY id ASC
       LIMIT ?`
    )
    .all(sampleLimit) as Array<{ source_path: string | null }>;
  printSamples("album.source_path samples", albumSamples);
};

const scanAssets = (db: DatabaseSync, topLimit: number, sampleLimit: number): void => {
  const sourceTypeCounts: Counter = new Map();
  const prefixCounts: Counter = new Map();
  const extensionCounts: Counter = new Map();
  let emptySourcePath = 0;
  let relativePathNonEmpty = 0;
  let zipEntryPathNonEmpty = 0;
  let knownSizes = 0;
  let totalSize = 0;
  let minSize: number | null = null;
  let maxSize: number | null = null;

  for (const row of db
    .prepare("SELECT source_type, source_path, relative_path, zip_entry_path, extension, size_bytes FROM assets")
    .iterate() as Iterable<AssetScanRow>) {
    increment(sourceTypeCounts, displayValue(row.source_type));
    if (!String(row.source_path ?? "").trim()) emptySourcePath += 1;
    increment(prefixCounts, pathPrefix(row.source_path));
    if (String(row.relative_path ?? "").trim()) relativePathNonEmpty += 1;
    if (String(row.zip_entry_path ?? "").trim()) zipEntryPathNonEmpty += 1;
    increment(extensionCounts, displayValue(row.extension).toLowerCase());

    const size = parseSize(row.size_bytes);
    if (size !== null) {
      knownSizes += 1;
      totalSize += size;
      minSize = minSize === null ? size : Math.min(minSize, size);
      maxSize = maxSize === null ? size : Math.max(maxSize, size);
    }
  }

  printCounter("assets.source_type distribution", sourceTypeCounts, topLimit);
  printCounter(`assets.source_path prefix Top ${topLimit}`, prefixCounts, topLimit);
  console.log(`  assets empty source_path: ${emptySourcePath}`);
  console.log(`  assets relative_path non-empty: ${relativePathNonEmpty}`);
  console.log(`  assets zip_entry_path non-empty: ${zipEntryPathNonEmpty}`);
  printCounter(`assets.extension Top ${topLimit}`, extensionCounts, topLimit);
  if (knownSizes > 0 && minSize !== null && maxSize !== null) {
    console.log("  assets.size_bytes stats:");
    console.log(`    known: ${knownSizes}`);
    console.log(`    total: ${formatBytes(totalSize)}`);
    console.log(`    min: ${formatBytes(minSize)}`);
    console.log(`    avg: ${formatBytes(Math.round(totalSize / knownSizes))}`);
    console.log(`    max: ${formatBytes(maxSize)}`);
  } else {
    console.log("  assets.size_bytes stats: no known sizes");
  }

  const folderSamples = db
    .prepare(
      `SELECT source_path
       FROM assets
       WHERE source_type = 'folder' AND source_path IS NOT NULL AND TRIM(source_path) != ''
       ORDER BY id ASC
       LIMIT ?`
    )
    .all(sampleLimit) as Array<{ source_path: string | null }>;
  printSamples("folder asset.source_path samples", folderSamples);
};

const printLibraryRoots = (db: DatabaseSync): void => {
  const rows = db
    .prepare(
      `SELECT lr.id, lr.name, lr.path, lr.enabled,
              COUNT(DISTINCT albums.id) AS album_count,
              COUNT(assets.id) AS asset_count
       FROM library_roots lr
       LEFT JOIN albums ON albums.library_root_id = lr.id
       LEFT JOIN assets ON assets.album_id = albums.id
       GROUP BY lr.id, lr.name, lr.path, lr.enabled
       ORDER BY lr.id ASC`
    )
    .all() as unknown as LibraryRootRow[];

  console.log("  library_roots:");
  for (const row of rows) {
    console.log(`    - id=${row.id} name=${displayValue(row.name)} enabled=${row.enabled ?? "(null)"} albums=${row.album_count} assets=${row.asset_count}`);
    console.log(`      path=${displayValue(row.path)}`);
  }
};

const printDbSummary = (label: string, dbPath: string, options: CliOptions): void => {
  const db = openReadOnlyDb(dbPath);
  try {
    for (const table of ["library_roots", "albums", "assets"]) {
      if (!tableExists(db, table)) throw new Error(`${label} DB is missing required table: ${table}`);
    }

    console.log(`\n== ${label}: ${path.resolve(dbPath)} ==`);
    console.log(`  counts: library_roots=${countRows(db, "library_roots")} albums=${countRows(db, "albums")} assets=${countRows(db, "assets")}`);
    printLibraryRoots(db);
    scanAlbums(db, options.topLimit, options.sampleLimit);
    scanAssets(db, options.topLimit, options.sampleLimit);
  } finally {
    db.close();
  }
};

try {
  const options = parseArgs(process.argv.slice(2));
  if (!options.legacyDbPath) {
    throw new Error("missing --legacy-db <path>");
  }

  printDbSummary("legacy", options.legacyDbPath, options);
  if (options.importedDbPath) {
    printDbSummary("imported", options.importedDbPath, options);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
