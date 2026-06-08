import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadConfig, type AppConfig } from "../src/config.js";
import { applyPathPrefixMap } from "../src/services/path-prefix-mapping.js";

interface CliOptions {
  legacyDbPath?: string;
  targetDbPath?: string;
  backupOnly: boolean;
  backupDir?: string;
  importedDbPath: string;
  archiveSampleLimit: number;
}

interface CheckRow {
  label: string;
  status: "ok" | "warn" | "blocked" | "info";
  detail: string;
}

interface ArchiveSampleRow {
  id: string;
  source_path: string;
}

const defaultLegacyDbPath = "data/legacy-real-dryrun.sqlite";
const defaultImportedDbPath = "data/momentpic-v2-import-test.sqlite";
const defaultArchiveSampleLimit = 20;
const mainSidecarSuffixes = ["", "-wal", "-shm"] as const;
const requiredLegacyTables = ["library_roots", "albums", "assets"] as const;

const printHelp = (): void => {
  console.log(`Usage: npm run preflight:main-import -- [options]

Read-only preflight for the formal MomentPic legacy -> v2 main DB import.
Default mode does not write the target DB and does not run import:legacy.

Options:
  --legacy-db <path>         Legacy SQLite DB. Defaults to MOMENTPIC_LEGACY_DB_PATH or ${defaultLegacyDbPath}.
  --target-db <path>         Target v2 main SQLite DB. Defaults to MOMENTPIC_DB_PATH or data/momentpic-v2.sqlite.
  --imported-db <path>       Isolated import-test DB for archive sample checks. Default: ${defaultImportedDbPath}.
  --archive-limit <n>        Archive source_path samples to check. Default: ${defaultArchiveSampleLimit}.
  --backup-only              Copy target DB, -wal and -shm into a timestamped backup dir; no import.
  --prepare-backup           Alias of --backup-only.
  --backup-dir <path>        Backup root directory. Default: data/main-import-backups.
  --help                     Show this help.
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
    backupOnly: false,
    importedDbPath: defaultImportedDbPath,
    archiveSampleLimit: defaultArchiveSampleLimit
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--legacy-db") {
      options.legacyDbPath = argv[index + 1] ?? "";
      if (!options.legacyDbPath) throw new Error("--legacy-db requires a path");
      index += 1;
      continue;
    }
    if (arg === "--target-db") {
      options.targetDbPath = argv[index + 1] ?? "";
      if (!options.targetDbPath) throw new Error("--target-db requires a path");
      index += 1;
      continue;
    }
    if (arg === "--imported-db") {
      options.importedDbPath = argv[index + 1] ?? "";
      if (!options.importedDbPath) throw new Error("--imported-db requires a path");
      index += 1;
      continue;
    }
    if (arg === "--archive-limit" || arg === "--archive-sample-limit") {
      options.archiveSampleLimit = parsePositiveInteger(arg, argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === "--backup-only" || arg === "--prepare-backup") {
      options.backupOnly = true;
      continue;
    }
    if (arg === "--backup-dir") {
      options.backupDir = argv[index + 1] ?? "";
      if (!options.backupDir) throw new Error("--backup-dir requires a path");
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

const resolveProjectPath = (rawPath: string): string => path.resolve(process.cwd(), rawPath);

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const mib = bytes / 1024 / 1024;
  if (mib < 1024) return `${mib.toFixed(2)} MiB`;
  return `${(mib / 1024).toFixed(2)} GiB`;
};

const timestampForDirectory = (): string => new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

const tableExists = (db: DatabaseSync, tableName: string): boolean =>
  Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));

const readIntegrity = (dbPath: string): string => {
  const db = new DatabaseSync(dbPath, { readOnly: true, enableForeignKeyConstraints: false });
  try {
    const row = db.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    return row.integrity_check;
  } finally {
    db.close();
  }
};

const checkLegacyDb = (legacyDbPath: string): CheckRow[] => {
  const rows: CheckRow[] = [];
  if (!fs.existsSync(legacyDbPath)) {
    rows.push({ label: "legacy DB", status: "blocked", detail: `missing: ${legacyDbPath}` });
    return rows;
  }

  const stat = fs.statSync(legacyDbPath);
  rows.push({ label: "legacy DB", status: "ok", detail: `${legacyDbPath} (${formatBytes(stat.size)})` });

  const db = new DatabaseSync(legacyDbPath, { readOnly: true, enableForeignKeyConstraints: false });
  try {
    const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    rows.push({
      label: "legacy integrity",
      status: integrity.integrity_check === "ok" ? "ok" : "blocked",
      detail: integrity.integrity_check
    });

    const missingTables = requiredLegacyTables.filter((tableName) => !tableExists(db, tableName));
    rows.push({
      label: "legacy required tables",
      status: missingTables.length === 0 ? "ok" : "blocked",
      detail: missingTables.length === 0 ? requiredLegacyTables.join(", ") : `missing: ${missingTables.join(", ")}`
    });

    const tableCounts = requiredLegacyTables
      .filter((tableName) => tableExists(db, tableName))
      .map((tableName) => {
        const result = db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get() as { total: number };
        return `${tableName}=${result.total}`;
      });
    rows.push({ label: "legacy import counts", status: "info", detail: tableCounts.length > 0 ? tableCounts.join(", ") : "not available" });
  } finally {
    db.close();
  }

  return rows;
};

const checkTargetDb = (targetDbPath: string): CheckRow[] => {
  const rows: CheckRow[] = [{ label: "target DB path", status: "info", detail: targetDbPath }];
  for (const suffix of mainSidecarSuffixes) {
    const filePath = `${targetDbPath}${suffix}`;
    const label = suffix ? `target sidecar ${suffix}` : "target main file";
    if (!fs.existsSync(filePath)) {
      rows.push({ label, status: suffix ? "info" : "warn", detail: "not present" });
      continue;
    }
    const stat = fs.statSync(filePath);
    rows.push({ label, status: "ok", detail: `${formatBytes(stat.size)} mtime=${stat.mtime.toISOString()}` });
  }

  if (fs.existsSync(targetDbPath)) {
    try {
      const integrity = readIntegrity(targetDbPath);
      rows.push({
        label: "target integrity",
        status: integrity === "ok" ? "ok" : "blocked",
        detail: integrity
      });
    } catch (error) {
      rows.push({ label: "target integrity", status: "blocked", detail: error instanceof Error ? error.message : String(error) });
    }
  } else {
    rows.push({ label: "target integrity", status: "info", detail: "skipped because target DB does not exist yet" });
  }

  return rows;
};

const nearestExistingDirectory = (directory: string): string | null => {
  let current = path.resolve(directory);
  while (!fs.existsSync(current)) {
    const next = path.dirname(current);
    if (next === current) return null;
    current = next;
  }
  return current;
};

const checkWritableDirectory = (targetDbPath: string): CheckRow[] => {
  const targetDirectory = path.dirname(targetDbPath);
  const existingDirectory = nearestExistingDirectory(targetDirectory);
  if (!existingDirectory) {
    return [{ label: "target directory", status: "blocked", detail: `no existing parent found for ${targetDirectory}` }];
  }

  const rows: CheckRow[] = [];
  rows.push({
    label: "target directory",
    status: existingDirectory === targetDirectory ? "ok" : "warn",
    detail: existingDirectory === targetDirectory ? targetDirectory : `${targetDirectory} missing; nearest existing parent is ${existingDirectory}`
  });

  try {
    fs.accessSync(existingDirectory, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
    rows.push({ label: "target directory permissions", status: "ok", detail: `${existingDirectory} is accessible for read/write/search` });
  } catch (error) {
    rows.push({ label: "target directory permissions", status: "blocked", detail: error instanceof Error ? error.message : String(error) });
  }

  try {
    const stats = fs.statfsSync(existingDirectory);
    const availableBytes = Number(stats.bavail) * Number(stats.bsize);
    rows.push({ label: "target filesystem free space", status: "info", detail: `${formatBytes(availableBytes)} available at ${existingDirectory}` });
  } catch (error) {
    rows.push({ label: "target filesystem free space", status: "warn", detail: error instanceof Error ? error.message : String(error) });
  }

  return rows;
};

const isMountPoint = (mountPath: string): boolean => {
  try {
    const mountTable = fs.readFileSync("/proc/mounts", "utf8");
    return mountTable
      .split("\n")
      .some((line) => line.trim().split(/\s+/)[1]?.replace(/\\040/g, " ") === mountPath);
  } catch {
    return false;
  }
};

const archiveWhereClause = `
  source_type IN ('zip', 'archive')
  OR zip_entry_path IS NOT NULL
  OR LOWER(source_path) LIKE '%.zip'
  OR LOWER(source_path) LIKE '%.cbz'
`;

const readArchiveSamples = (dbPath: string, limit: number): { total: number; samples: ArchiveSampleRow[] } | null => {
  if (!fs.existsSync(dbPath)) return null;
  const db = new DatabaseSync(dbPath, { readOnly: true, enableForeignKeyConstraints: false });
  try {
    if (!tableExists(db, "assets")) return null;
    const total = (db.prepare(`SELECT COUNT(*) AS total FROM assets WHERE ${archiveWhereClause}`).get() as { total: number }).total;
    const samples = db
      .prepare(
        `SELECT id, source_path
         FROM assets
         WHERE ${archiveWhereClause}
           AND source_path IS NOT NULL
           AND TRIM(source_path) != ''
         ORDER BY id ASC
         LIMIT ?`
      )
      .all(limit) as unknown as ArchiveSampleRow[];
    return { total, samples };
  } finally {
    db.close();
  }
};

const canReadFile = (filePath: string): boolean => {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

const checkArchiveReadiness = (config: AppConfig, legacyDbPath: string, importedDbPath: string, sampleLimit: number): CheckRow[] => {
  const rows: CheckRow[] = [];
  rows.push({
    label: "/example/media-root mount",
    status: isMountPoint("/example/media-root") ? "ok" : "blocked",
    detail: fs.existsSync("/example/media-root") ? "/example/media-root exists" : "/example/media-root is not present on this host"
  });

  const sampleSource =
    readArchiveSamples(importedDbPath, sampleLimit) ??
    readArchiveSamples(legacyDbPath, sampleLimit);

  if (!sampleSource) {
    rows.push({ label: "archive samples", status: "warn", detail: "no imported/legacy DB with assets table was available for sample checks" });
    return rows;
  }
  if (sampleSource.total === 0) {
    rows.push({ label: "archive samples", status: "warn", detail: "no archive candidate assets found in the sampled DB" });
    return rows;
  }

  let directReadable = 0;
  let mappedReadable = 0;
  let missing = 0;
  for (const sample of sampleSource.samples) {
    if (canReadFile(sample.source_path)) {
      directReadable += 1;
      continue;
    }
    const mappedCandidates = applyPathPrefixMap(sample.source_path, config.pathPrefixMap);
    if (mappedCandidates.some((candidate) => canReadFile(candidate))) {
      mappedReadable += 1;
      continue;
    }
    missing += 1;
  }

  const readable = directReadable + mappedReadable;
  rows.push({
    label: "archive samples",
    status: readable > 0 ? "ok" : "blocked",
    detail:
      `candidates=${sampleSource.total}; sampled=${sampleSource.samples.length}; ` +
      `direct_readable=${directReadable}; mapped_readable=${mappedReadable}; missing=${missing}`
  });
  if (readable === 0) {
    rows.push({ label: "archive blocker", status: "blocked", detail: "sampled archive files are still not accessible from this host" });
  }

  return rows;
};

const checkEnvironment = (config: AppConfig): CheckRow[] => {
  const mapSummary =
    config.pathPrefixMap.length === 0
      ? "disabled; set MOMENTPIC_PATH_PREFIX_MAP when legacy paths need runtime mapping"
      : config.pathPrefixMap.map((rule) => `${rule.from} -> ${rule.to}`).join("; ");
  return [
    { label: "MOMENTPIC_PATH_PREFIX_MAP", status: "info", detail: mapSummary },
    { label: "MOMENTPIC_THUMBNAIL_CACHE_DIR", status: "info", detail: config.thumbnailCacheDir },
    { label: "MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES", status: "info", detail: `${config.archiveEntryMaxBytes} (${formatBytes(config.archiveEntryMaxBytes)})` }
  ];
};

const copyBackupFiles = (targetDbPath: string, backupRoot: string): CheckRow[] => {
  const existingFiles = mainSidecarSuffixes
    .map((suffix) => ({ suffix, source: `${targetDbPath}${suffix}` }))
    .filter((file) => fs.existsSync(file.source));

  if (existingFiles.length === 0) {
    return [{ label: "backup", status: "info", detail: `no target DB or sidecar files exist for ${targetDbPath}; nothing copied` }];
  }

  const timestamp = timestampForDirectory();
  const backupDirectory = path.join(backupRoot, `main-import-${timestamp}`);
  fs.mkdirSync(backupDirectory, { recursive: true });

  const rows: CheckRow[] = [{ label: "backup directory", status: "ok", detail: backupDirectory }];
  for (const file of existingFiles) {
    const destinationName = `${path.basename(targetDbPath)}${file.suffix}`;
    const destination = path.join(backupDirectory, destinationName);
    fs.copyFileSync(file.source, destination, fs.constants.COPYFILE_EXCL);
    const stat = fs.statSync(destination);
    rows.push({ label: `backup ${file.suffix || "main"}`, status: "ok", detail: `${destination} (${formatBytes(stat.size)})` });
  }
  return rows;
};

const printRows = (title: string, rows: CheckRow[]): void => {
  console.log(`\n== ${title} ==`);
  for (const row of rows) {
    console.log(`[${row.status.toUpperCase()}] ${row.label}: ${row.detail}`);
  }
};

const printNextSteps = (legacyDbPath: string, targetDbPath: string): void => {
  console.log("\n== Manual next-step commands ==");
  console.log("Do not run the import until a planned stop-write window is active and a fresh backup has been made.");
  console.log(
    `1. Prepare backup only:\n   npm run preflight:main-import -- --legacy-db ${shellQuote(legacyDbPath)} --target-db ${shellQuote(targetDbPath)} --backup-only`
  );
  console.log(
    `2. Re-run read-only preflight after backup:\n   npm run preflight:main-import -- --legacy-db ${shellQuote(legacyDbPath)} --target-db ${shellQuote(targetDbPath)}`
  );
  console.log(
    `3. Formal import command for the stop-write window only:\n   MOMENTPIC_DB_PATH=${shellQuote(targetDbPath)} npm run import:legacy -- --legacy-db ${shellQuote(legacyDbPath)}`
  );
};

try {
  const cli = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const legacyDbPath = resolveProjectPath(cli.legacyDbPath ?? config.legacyDbPath ?? defaultLegacyDbPath);
  const targetDbPath = resolveProjectPath(cli.targetDbPath ?? config.dbPath);
  const importedDbPath = resolveProjectPath(cli.importedDbPath);
  const backupRoot = resolveProjectPath(cli.backupDir ?? path.join("data", "main-import-backups"));

  console.log("MomentPic main import preflight");
  console.log(`Mode: ${cli.backupOnly ? "backup-only" : "read-only"}`);
  console.log("Import command will not be executed by this script.");

  printRows("Legacy DB", checkLegacyDb(legacyDbPath));
  printRows("Target DB", checkTargetDb(targetDbPath));
  printRows("Target Directory", checkWritableDirectory(targetDbPath));
  printRows("Runtime Environment", checkEnvironment(config));
  printRows("Archive Readiness", checkArchiveReadiness(config, legacyDbPath, importedDbPath, cli.archiveSampleLimit));

  if (cli.backupOnly) {
    printRows("Backup", copyBackupFiles(targetDbPath, backupRoot));
  } else {
    printRows("Backup", [{ label: "backup mode", status: "info", detail: "not requested; pass --backup-only or --prepare-backup to copy target DB files" }]);
  }

  printNextSteps(legacyDbPath, targetDbPath);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
