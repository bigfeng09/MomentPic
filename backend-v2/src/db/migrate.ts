import { loadConfig } from "../config.js";
import { openDatabase, type Database } from "./connection.js";
import { schemaSql } from "./schema.js";

const ensureColumn = (db: Database, tableName: string, columnName: string, definition: string): void => {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (rows.some((row) => row.name === columnName)) return;
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
};

export const migrate = (db: Database): void => {
  db.exec(schemaSql);
  ensureColumn(db, "users", "password_reset_required", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "scan_tasks", "progress_phase", "TEXT");
  ensureColumn(db, "scan_tasks", "fast_scan", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "scan_tasks", "skipped_files", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "scan_tasks", "unchanged_albums", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "scan_tasks", "unchanged_assets", "INTEGER NOT NULL DEFAULT 0");
  const now = new Date().toISOString();
  db.prepare("INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) VALUES (1, 'initial_v2_schema', ?)").run(now);
  db.prepare(
    "INSERT OR IGNORE INTO system_config (id, created_at, updated_at) VALUES ('system_config', ?, ?)"
  ).run(now, now);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const db = openDatabase(config.dbPath);
  migrate(db);
  db.close();
  console.log(`Migrated ${config.dbPath}`);
}
