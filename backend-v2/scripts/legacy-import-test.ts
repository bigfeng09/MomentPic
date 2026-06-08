import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { openDatabase, type Database } from "../src/db/connection.js";
import { seedAdminUser } from "../src/db/seed.js";
import { importLegacyDb } from "../src/services/legacy-importer.js";

interface CliOptions {
  legacyDbPath?: string;
  targetDbPath?: string;
}

interface TableCount {
  library_roots: number;
  albums: number;
  assets: number;
}

interface V2UserRow {
  username: string;
  role: string;
  password_hash: string;
  password_reset_required: number;
}

interface SampleRow {
  galleryId: string;
  albumId: string;
  assetId: string;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

const coreTables = ["library_roots", "albums", "assets"] as const;

const printHelp = (): void => {
  console.log(`Usage: npm run import:legacy:test -- [--legacy-db <path>] [--target-db <path>]

Options:
  --legacy-db <path>  Legacy SQLite DB. Defaults to data/legacy-real-dryrun.sqlite or MOMENTPIC_LEGACY_DB_PATH.
  --target-db <path>  Isolated v2 import test DB. Defaults to data/momentpic-v2-import-test.sqlite.
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
    if (arg === "--target-db") {
      const value = argv[index + 1];
      if (!value) throw new Error("--target-db requires a path");
      options.targetDbPath = value;
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

const timestampForFile = (): string => new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 17);

const backupExistingTarget = (targetDbPath: string): string[] => {
  fs.mkdirSync(path.dirname(targetDbPath), { recursive: true });
  const timestamp = timestampForFile();
  const moved: string[] = [];
  for (const candidate of [targetDbPath, `${targetDbPath}-wal`, `${targetDbPath}-shm`]) {
    if (!fs.existsSync(candidate)) continue;
    const backupPath = `${candidate}.${timestamp}.bak`;
    fs.renameSync(candidate, backupPath);
    moved.push(backupPath);
  }
  return moved;
};

const readCount = (db: Database, tableName: (typeof coreTables)[number]): number =>
  (db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get() as { total: number }).total;

const readCoreCounts = (db: Database): TableCount => ({
  library_roots: readCount(db, "library_roots"),
  albums: readCount(db, "albums"),
  assets: readCount(db, "assets")
});

const assertEqual = (label: string, actual: number, expected: number): void => {
  if (actual !== expected) throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
};

const assertCoreCounts = (legacyCounts: TableCount, targetCounts: TableCount): void => {
  for (const tableName of coreTables) {
    assertEqual(`target ${tableName}`, targetCounts[tableName], legacyCounts[tableName]);
  }
};

const tableExists = (db: Database | DatabaseSync, tableName: string): boolean =>
  Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName));

const readLegacyUsernames = (legacyDbPath: string): string[] => {
  const db = new DatabaseSync(legacyDbPath, { readOnly: true, enableForeignKeyConstraints: false });
  try {
    if (!tableExists(db, "users")) return [];
    const rows = db.prepare("SELECT username FROM users ORDER BY username").all() as Array<{ username: string }>;
    return rows.map((row) => row.username);
  } finally {
    db.close();
  }
};

const assertUsersAreSafe = (db: Database, expectedAdminUsername: string, legacyUsernames: string[]): V2UserRow[] => {
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (userColumns.some((column) => column.name === "password")) {
    throw new Error("v2 users table unexpectedly contains a plaintext password column");
  }

  const users = db
    .prepare("SELECT username, role, password_hash, password_reset_required FROM users ORDER BY username")
    .all() as unknown as V2UserRow[];
  const admin = users.find((user) => user.username === expectedAdminUsername);
  if (!admin || admin.role !== "admin" || admin.password_reset_required !== 0) {
    throw new Error(`expected usable seed admin user '${expectedAdminUsername}', got: ${users.map((user) => user.username).join(", ") || "none"}`);
  }
  if (!admin.password_hash.startsWith("scrypt$")) throw new Error("seed admin user is not stored as a scrypt hash");

  const unsafeLegacyUsers = legacyUsernames
    .filter((username) => username !== "admin")
    .filter((username) => {
      const user = users.find((candidate) => candidate.username === username);
      return !user || user.password_reset_required !== 1 || !user.password_hash.startsWith("scrypt$");
    });
  if (unsafeLegacyUsers.length > 0) throw new Error(`legacy user(s) not imported as reset-required hash: ${unsafeLegacyUsers.join(", ")}`);
  return users;
};

const readSample = (db: Database): SampleRow => {
  const gallery = db.prepare("SELECT id FROM library_roots ORDER BY id ASC LIMIT 1").get() as { id: string } | undefined;
  const album = db.prepare("SELECT id FROM albums ORDER BY id ASC LIMIT 1").get() as { id: string } | undefined;
  const asset = db.prepare("SELECT id FROM assets ORDER BY id ASC LIMIT 1").get() as { id: string } | undefined;
  if (!gallery || !album || !asset) throw new Error("imported DB does not contain a queryable gallery/album/asset sample");
  return { galleryId: gallery.id, albumId: album.id, assetId: asset.id };
};

const readJson = <T>(body: string): ApiEnvelope<T> => JSON.parse(body) as ApiEnvelope<T>;

const runApiSmoke = async (targetDbPath: string, adminUsername: string, adminPassword: string, sample: SampleRow): Promise<void> => {
  const app = await buildApp({
    dbPath: targetDbPath,
    authSecret: "legacy-import-test-secret",
    adminUsername,
    adminPassword,
    seedDemoData: false
  });
  try {
    const login = await app.inject({
      method: "POST",
      url: "/api/v2/auth/login",
      payload: { username: adminUsername, password: adminPassword }
    });
    if (login.statusCode !== 200) throw new Error(`API login failed: ${login.statusCode} ${login.body}`);
    const setCookie = login.headers["set-cookie"];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    if (!cookieHeader) throw new Error("API login did not set a cookie");
    const authHeader = cookieHeader.split(";")[0] ?? "";

    const galleries = await app.inject({ method: "GET", url: "/api/v2/galleries", headers: { cookie: authHeader } });
    if (galleries.statusCode !== 200) throw new Error(`/api/v2/galleries failed: ${galleries.statusCode} ${galleries.body}`);
    const galleriesPayload = readJson<{ items: unknown[] }>(galleries.body);
    if (galleriesPayload.data.items.length === 0) throw new Error("/api/v2/galleries returned no items");

    const albums = await app.inject({ method: "GET", url: "/api/v2/albums?pageSize=1", headers: { cookie: authHeader } });
    if (albums.statusCode !== 200) throw new Error(`/api/v2/albums failed: ${albums.statusCode} ${albums.body}`);
    const albumsPayload = readJson<{ items: unknown[] }>(albums.body);
    if (albumsPayload.data.items.length === 0) throw new Error("/api/v2/albums returned no items");

    for (const url of [`/api/v2/albums/${sample.albumId}`, `/api/v2/albums/${sample.albumId}/assets?pageSize=1`, `/api/v2/assets/${sample.assetId}`]) {
      const response = await app.inject({ method: "GET", url, headers: { cookie: authHeader } });
      if (response.statusCode !== 200) throw new Error(`${url} failed: ${response.statusCode} ${response.body}`);
    }
  } finally {
    await app.close();
  }
};

try {
  const cli = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const legacyDbPath = cli.legacyDbPath ?? config.legacyDbPath ?? path.resolve(process.cwd(), "data", "legacy-real-dryrun.sqlite");
  const targetDbPath = cli.targetDbPath ?? process.env.MOMENTPIC_IMPORT_TEST_DB_PATH ?? path.resolve(process.cwd(), "data", "momentpic-v2-import-test.sqlite");

  if (!fs.existsSync(legacyDbPath)) throw new Error(`legacy DB does not exist: ${legacyDbPath}`);

  const backups = backupExistingTarget(targetDbPath);
  const startedAtMs = Date.now();
  const summary = importLegacyDb({ legacyDbPath, targetDbPath, dryRun: false });
  const importedSeconds = ((Date.now() - startedAtMs) / 1000).toFixed(1);

  const legacyCounts: TableCount = {
    library_roots: summary.tableCounts.library_roots ?? 0,
    albums: summary.tableCounts.albums ?? 0,
    assets: summary.tableCounts.assets ?? 0
  };
  assertEqual("imported galleries", summary.imported.galleries, legacyCounts.library_roots);
  assertEqual("imported albums", summary.imported.albums, legacyCounts.albums);
  assertEqual("imported assets", summary.imported.assets, legacyCounts.assets);

  const db = openDatabase(targetDbPath);
  let targetCounts: TableCount;
  let users: V2UserRow[];
  let sample: SampleRow;
  let integrityCheck: string;
  try {
    seedAdminUser(db, config);
    targetCounts = readCoreCounts(db);
    assertCoreCounts(legacyCounts, targetCounts);
    const integrity = db.prepare("PRAGMA integrity_check").get() as { integrity_check: string };
    integrityCheck = integrity.integrity_check;
    if (integrityCheck !== "ok") throw new Error(`target DB integrity_check failed: ${integrityCheck}`);
    users = assertUsersAreSafe(db, config.adminUsername, readLegacyUsernames(legacyDbPath));
    sample = readSample(db);
  } finally {
    db.close();
  }

  await runApiSmoke(targetDbPath, config.adminUsername, config.adminPassword, sample);

  console.log("Legacy import test summary:");
  console.log(`  Legacy DB: ${legacyDbPath}`);
  console.log(`  Target v2 DB: ${targetDbPath}`);
  console.log(`  Existing target backups: ${backups.length > 0 ? backups.join(", ") : "none"}`);
  console.log(`  Import duration: ${importedSeconds}s`);
  console.log("  Core table counts:");
  for (const tableName of coreTables) {
    console.log(`    ${tableName}: legacy=${legacyCounts[tableName]} target=${targetCounts[tableName]}`);
  }
  console.log(
    `  Users: ${users.map((user) => `${user.username}:${user.role}:reset=${user.password_reset_required}`).join(", ")}; legacy users require reset`
  );
  console.log(`  Target integrity_check: ${integrityCheck}`);
  console.log(`  API smoke sample: gallery=${sample.galleryId} album=${sample.albumId} asset=${sample.assetId}`);
  console.log("Legacy import test passed");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
