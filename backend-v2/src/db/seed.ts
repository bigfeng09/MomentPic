import { loadConfig, type AppConfig } from "../config.js";
import { hashPassword } from "../lib/auth.js";
import { openDatabase, type Database } from "./connection.js";
import { migrate } from "./migrate.js";

export const seedAdminUser = (db: Database, config: AppConfig): void => {
  const now = new Date().toISOString();
  const passwordHash = hashPassword(config.adminPassword);

  db.prepare(
    "INSERT INTO users (username, password_hash, role, created_at, updated_at) VALUES (?, ?, 'admin', ?, ?) ON CONFLICT(username) DO NOTHING"
  ).run(config.adminUsername, passwordHash, now, now);
};

export const seed = (db: Database, config: AppConfig): void => {
  const now = new Date().toISOString();
  seedAdminUser(db, config);

  db.prepare(
    "INSERT OR IGNORE INTO library_roots (id, name, path, enabled, last_scanned_at, created_at, updated_at) VALUES ('gallery-demo', 'Demo Gallery', '/demo/moment-pic', 1, ?, ?, ?)"
  ).run(now, now, now);

  db.prepare(
    "INSERT OR IGNORE INTO albums (id, library_root_id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count, scan_status, created_at, updated_at) VALUES ('album-demo', 'gallery-demo', 'Demo Album', 'folder', '/demo/moment-pic/demo-album', ?, 'seed-v1', 'asset-demo-1', 2, 'ready', ?, ?)"
  ).run(now, now, now);

  const insertAsset = db.prepare(
    "INSERT OR IGNORE INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at) VALUES (?, 'album-demo', ?, ?, 'folder', ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertAsset.run("asset-demo-1", "page-001.jpg", ".jpg", "/demo/moment-pic/demo-album/page-001.jpg", "demo-album/page-001.jpg", 1, 1200, 1800, 456789, "seed/asset-demo-1", now, now);
  insertAsset.run("asset-demo-2", "page-002.jpg", ".jpg", "/demo/moment-pic/demo-album/page-002.jpg", "demo-album/page-002.jpg", 2, 1200, 1800, 445566, "seed/asset-demo-2", now, now);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const db = openDatabase(config.dbPath);
  migrate(db);
  seed(db, config);
  db.close();
  console.log(`Seeded ${config.dbPath}`);
}
