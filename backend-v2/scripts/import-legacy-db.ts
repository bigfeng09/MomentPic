import { loadConfig } from "../src/config.js";
import { importLegacyDb } from "../src/services/legacy-importer.js";

interface CliOptions {
  legacyDbPath?: string;
  dryRun: boolean;
}

const printHelp = (): void => {
  console.log(`Usage: npm run import:legacy -- --legacy-db <path> [--dry-run]

Options:
  --legacy-db <path>  Path to the old Moment Pic SQLite DB. Falls back to MOMENTPIC_LEGACY_DB_PATH.
  --dry-run           Print table counts and mapping plan without writing the v2 DB.
  --help              Show this help.
`);
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = { dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
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

const printSummary = (summary: ReturnType<typeof importLegacyDb>): void => {
  console.log(`Legacy DB: ${summary.legacyDbPath}`);
  console.log(`Target v2 DB: ${summary.targetDbPath}`);
  console.log(`Mode: ${summary.dryRun ? "dry-run" : "import"}`);
  console.log("Table counts:");
  for (const [tableName, count] of Object.entries(summary.tableCounts)) {
    console.log(`  ${tableName}: ${count}`);
  }
  console.log("Mapping plan:");
  for (const item of summary.mappingPlan) {
    console.log(`  - ${item}`);
  }
  if (!summary.dryRun) {
    console.log("Imported/upserted:");
    console.log(`  galleries: ${summary.imported.galleries}`);
    console.log(`  albums: ${summary.imported.albums}`);
    console.log(`  assets: ${summary.imported.assets}`);
    console.log(`  users: ${summary.imported.users}`);
    console.log(`  sharedAlbums: ${summary.imported.sharedAlbums}`);
    console.log(`  favoriteAlbums: ${summary.imported.favoriteAlbums}`);
    console.log(`  publicShares: ${summary.imported.publicShares}`);
  }
};

try {
  const cli = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const legacyDbPath = cli.legacyDbPath ?? config.legacyDbPath;
  if (!legacyDbPath) throw new Error("missing legacy DB path. Use --legacy-db <path> or MOMENTPIC_LEGACY_DB_PATH.");
  const summary = importLegacyDb({
    legacyDbPath,
    targetDbPath: config.dbPath,
    dryRun: cli.dryRun
  });
  printSummary(summary);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
