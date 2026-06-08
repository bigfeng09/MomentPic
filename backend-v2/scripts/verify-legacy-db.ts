import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadConfig } from "../src/config.js";
import { importLegacyDb } from "../src/services/legacy-importer.js";

interface CliOptions {
  legacyDbPath?: string;
}

const formatBytes = (bytes: number): string => {
  const mib = bytes / 1024 / 1024;
  return `${bytes} bytes (${mib.toFixed(2)} MiB)`;
};

const printHelp = (): void => {
  console.log(`Usage: npm run verify:legacy -- --legacy-db <path>

Checks a local legacy Moment Pic SQLite file before any real import:
  1. verifies the file exists
  2. prints file size and modified time
  3. runs PRAGMA integrity_check in read-only mode
  4. runs the existing legacy importer in dry-run mode

Options:
  --legacy-db <path>  Path to the old Moment Pic SQLite DB. Falls back to MOMENTPIC_LEGACY_DB_PATH.
  --help              Show this help.
`);
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--legacy-db") {
      const value = argv[index + 1];
      if (!value) throw new Error("--legacy-db requires a path");
      options.legacyDbPath = value;
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

const verifySqliteIntegrity = (legacyDbPath: string): void => {
  const db = new DatabaseSync(legacyDbPath, { readOnly: true, enableForeignKeyConstraints: false });
  try {
    const rows = db.prepare("PRAGMA integrity_check;").all() as Array<Record<string, unknown>>;
    const messages = rows.map((row) => String(Object.values(row)[0] ?? ""));
    if (messages.length === 1 && messages[0] === "ok") {
      console.log("SQLite integrity_check: ok");
      return;
    }
    throw new Error(`SQLite integrity_check failed:\n${messages.map((message) => `  - ${message}`).join("\n")}`);
  } finally {
    db.close();
  }
};

const printDryRunSummary = (summary: ReturnType<typeof importLegacyDb>): void => {
  console.log("Legacy import dry-run summary:");
  console.log(`  legacy DB: ${summary.legacyDbPath}`);
  console.log(`  target v2 DB: ${summary.targetDbPath}`);
  console.log("  table counts:");
  for (const [tableName, count] of Object.entries(summary.tableCounts)) {
    console.log(`    ${tableName}: ${count}`);
  }
  console.log("  mapping plan:");
  for (const item of summary.mappingPlan) {
    console.log(`    - ${item}`);
  }
};

try {
  const cli = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const legacyDbPath = cli.legacyDbPath ?? config.legacyDbPath;
  if (!legacyDbPath) {
    throw new Error("missing legacy DB path. Use --legacy-db <path> or MOMENTPIC_LEGACY_DB_PATH.");
  }

  const resolvedLegacyDbPath = path.resolve(legacyDbPath);
  if (!fs.existsSync(resolvedLegacyDbPath)) {
    console.error(`Legacy DB not found: ${resolvedLegacyDbPath}`);
    console.error("Next step: place a local SQLite backup at that path, then rerun this command.");
    console.error("Expected default for real dry-run: data/legacy-real-dryrun.sqlite");
    process.exit(1);
  }

  const stats = fs.statSync(resolvedLegacyDbPath);
  if (!stats.isFile()) {
    throw new Error(`legacy DB path is not a file: ${resolvedLegacyDbPath}`);
  }

  console.log(`Legacy DB: ${resolvedLegacyDbPath}`);
  console.log(`File size: ${formatBytes(stats.size)}`);
  console.log(`Modified: ${stats.mtime.toISOString()}`);

  verifySqliteIntegrity(resolvedLegacyDbPath);

  const summary = importLegacyDb({
    legacyDbPath: resolvedLegacyDbPath,
    targetDbPath: config.dbPath,
    dryRun: true
  });
  printDryRunSummary(summary);
  console.log("Verification complete. No v2 data was written.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
