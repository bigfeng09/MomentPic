export const schemaSql = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  password_reset_required INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS library_roots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_scanned_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  library_root_id TEXT NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_path TEXT NOT NULL UNIQUE,
  source_mtime TEXT,
  assets_fingerprint TEXT,
  cover_asset_id TEXT,
  asset_count INTEGER NOT NULL DEFAULT 0,
  scan_status TEXT NOT NULL DEFAULT 'ready',
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (library_root_id) REFERENCES library_roots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  album_id TEXT NOT NULL,
  name TEXT NOT NULL,
  extension TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_path TEXT NOT NULL,
  relative_path TEXT,
  zip_entry_path TEXT,
  sort_index INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  source_mtime TEXT,
  thumbnail_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS thumbnails (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  cache_key TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_config (
  id TEXT PRIMARY KEY DEFAULT 'system_config',
  enable_polling INTEGER NOT NULL DEFAULT 1,
  polling_interval INTEGER NOT NULL DEFAULT 60000,
  preload_before INTEGER NOT NULL DEFAULT 2,
  preload_after INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shared_albums (
  username TEXT NOT NULL,
  album_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (username, album_id),
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS favorite_albums (
  username TEXT NOT NULL,
  album_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (username, album_id),
  FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public_shares (
  token TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_tasks (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  dry_run INTEGER NOT NULL DEFAULT 1,
  gallery_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  error TEXT,
  albums_discovered INTEGER NOT NULL DEFAULT 0,
  assets_discovered INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_albums_library_root_id ON albums (library_root_id);
CREATE INDEX IF NOT EXISTS idx_albums_name ON albums (name);
CREATE INDEX IF NOT EXISTS idx_albums_updated_at ON albums (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_album_id ON assets (album_id);
CREATE INDEX IF NOT EXISTS idx_assets_album_sort ON assets (album_id, sort_index);
CREATE INDEX IF NOT EXISTS idx_assets_thumbnail_key ON assets (thumbnail_key);
CREATE INDEX IF NOT EXISTS idx_shared_albums_username ON shared_albums (username, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_albums_username ON favorite_albums (username, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_shares_target ON public_shares (type, target_id);
CREATE INDEX IF NOT EXISTS idx_scan_tasks_created_at ON scan_tasks (created_at DESC);
`;
