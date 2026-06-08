import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import sharp from "sharp";
import { ZipFile } from "yazl";
import { buildApp } from "../src/app.js";
import { openDatabase } from "../src/db/connection.js";
import { importLegacyDb } from "../src/services/legacy-importer.js";

const writeZipFile = async (zipPath: string, entries: Array<{ entryPath: string; buffer: Buffer }>): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const zipFile = new ZipFile();
    const output = fs.createWriteStream(zipPath);
    output.once("close", resolve);
    output.once("error", reject);
    zipFile.outputStream.once("error", reject);
    zipFile.outputStream.pipe(output);
    for (const entry of entries) {
      zipFile.addBuffer(entry.buffer, entry.entryPath);
    }
    zipFile.end();
  });
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "momentpic-v2-smoke-"));
const legacyPrefix = path.join(tempDir, "legacy-prefix") + path.sep;
const runtimePrefix = path.join(tempDir, "runtime-prefix") + path.sep;
const app = await buildApp({
  dbPath: path.join(tempDir, "smoke.sqlite"),
  authSecret: "smoke-secret",
  adminPassword: "smoke-admin-password",
  seedDemoData: true,
  pathPrefixMap: [{ from: legacyPrefix, to: runtimePrefix }],
  thumbnailCacheDir: path.join(tempDir, "thumbnail-cache"),
  thumbnailMaxSize: 32
});

const health = await app.inject({ method: "GET", url: "/api/v2/health" });
if (health.statusCode !== 200) throw new Error(`health failed: ${health.statusCode}`);

const rejected = await app.inject({ method: "GET", url: "/api/v2/galleries" });
if (rejected.statusCode !== 401) throw new Error(`expected auth guard, got ${rejected.statusCode}`);

const login = await app.inject({
  method: "POST",
  url: "/api/v2/auth/login",
  payload: { username: "admin", password: "smoke-admin-password" }
});
if (login.statusCode !== 200) throw new Error(`login failed: ${login.statusCode} ${login.body}`);
const setCookie = login.headers["set-cookie"];
const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
if (!cookieHeader) throw new Error("login did not set cookie");

const authHeader = cookieHeader.split(";")[0] ?? "";
const urls = [
  "/api/v2/me",
  "/api/v2/galleries",
  "/api/v2/albums",
  "/api/v2/albums/album-demo",
  "/api/v2/albums/album-demo/assets",
  "/api/v2/assets/asset-demo-1"
];

for (const url of urls) {
  const response = await app.inject({ method: "GET", url, headers: { cookie: authHeader } });
  if (response.statusCode !== 200) throw new Error(`${url} failed: ${response.statusCode} ${response.body}`);
}

const createUser = await app.inject({
  method: "POST",
  url: "/api/v2/users",
  headers: { cookie: authHeader },
  payload: { username: "viewer", password: "viewer123", role: "user" }
});
if (createUser.statusCode !== 200) throw new Error(`create user failed: ${createUser.statusCode} ${createUser.body}`);

const usersList = await app.inject({ method: "GET", url: "/api/v2/users", headers: { cookie: authHeader } });
if (usersList.statusCode !== 200 || !JSON.parse(usersList.body).data.items.some((item: { username: string }) => item.username === "viewer")) {
  throw new Error(`users list smoke failed: ${usersList.statusCode} ${usersList.body}`);
}

const shareAlbum = await app.inject({
  method: "PUT",
  url: "/api/v2/users/viewer/shared-albums/album-demo",
  headers: { cookie: authHeader },
  payload: { shared: true }
});
if (shareAlbum.statusCode !== 200) throw new Error(`share album failed: ${shareAlbum.statusCode} ${shareAlbum.body}`);

const sharedAlbums = await app.inject({
  method: "GET",
  url: "/api/v2/users/viewer/shared-albums",
  headers: { cookie: authHeader }
});
if (sharedAlbums.statusCode !== 200 || !JSON.parse(sharedAlbums.body).data.albumIds.includes("album-demo")) {
  throw new Error(`shared albums smoke failed: ${sharedAlbums.statusCode} ${sharedAlbums.body}`);
}

const favoriteAlbumsPut = await app.inject({
  method: "PUT",
  url: "/api/v2/favorite-albums",
  headers: { cookie: authHeader },
  payload: { items: [{ id: "album-demo" }] }
});
if (favoriteAlbumsPut.statusCode !== 200) throw new Error(`favorite albums put failed: ${favoriteAlbumsPut.statusCode} ${favoriteAlbumsPut.body}`);

const favoriteAlbumsGet = await app.inject({
  method: "GET",
  url: "/api/v2/favorite-albums",
  headers: { cookie: authHeader }
});
if (favoriteAlbumsGet.statusCode !== 200 || JSON.parse(favoriteAlbumsGet.body).data.items.length !== 1) {
  throw new Error(`favorite albums get failed: ${favoriteAlbumsGet.statusCode} ${favoriteAlbumsGet.body}`);
}

const publicShare = await app.inject({
  method: "POST",
  url: "/api/v2/public-shares",
  headers: { cookie: authHeader },
  payload: { type: "album", targetId: "album-demo" }
});
if (publicShare.statusCode !== 200) throw new Error(`public share failed: ${publicShare.statusCode} ${publicShare.body}`);
const publicShareData = JSON.parse(publicShare.body).data as { token: string; url: string };
const publicPage = await app.inject({ method: "GET", url: publicShareData.url });
if (publicPage.statusCode !== 200 || !publicPage.body.includes("Demo Album")) {
  throw new Error(`public share page failed: ${publicPage.statusCode} ${publicPage.body}`);
}

const scan = await app.inject({
  method: "POST",
  url: "/api/v2/scan",
  headers: { cookie: authHeader },
  payload: { dryRun: true }
});
if (scan.statusCode !== 200 || JSON.parse(scan.body).data.status !== "completed") {
  throw new Error(`scan smoke failed: ${scan.statusCode} ${scan.body}`);
}
const scanTaskId = JSON.parse(scan.body).data.taskId;
const scanStatus = await app.inject({ method: "GET", url: `/api/v2/scan/${scanTaskId}`, headers: { cookie: authHeader } });
if (scanStatus.statusCode !== 200 || JSON.parse(scanStatus.body).data.albumsDiscovered < 1) {
  throw new Error(`scan status smoke failed: ${scanStatus.statusCode} ${scanStatus.body}`);
}

const cacheStatus = await app.inject({ method: "GET", url: "/api/v2/cache/thumbnails/status", headers: { cookie: authHeader } });
if (cacheStatus.statusCode !== 200) throw new Error(`cache status failed: ${cacheStatus.statusCode} ${cacheStatus.body}`);
const archiveReadiness = await app.inject({ method: "GET", url: "/api/v2/archive/readiness", headers: { cookie: authHeader } });
if (archiveReadiness.statusCode !== 200 || JSON.parse(archiveReadiness.body).data.zip.status !== "ready") {
  throw new Error(`archive readiness failed: ${archiveReadiness.statusCode} ${archiveReadiness.body}`);
}
const cachePrune = await app.inject({
  method: "POST",
  url: "/api/v2/cache/thumbnails/prune",
  headers: { cookie: authHeader },
  payload: { dryRun: true, maxFiles: 1000 }
});
if (cachePrune.statusCode !== 200) throw new Error(`cache prune failed: ${cachePrune.statusCode} ${cachePrune.body}`);
const cacheWarmup = await app.inject({
  method: "POST",
  url: "/api/v2/cache/thumbnails/warmup",
  headers: { cookie: authHeader },
  payload: { dryRun: true, limit: 10 }
});
if (cacheWarmup.statusCode !== 200 || JSON.parse(cacheWarmup.body).data.status !== "completed" || JSON.parse(cacheWarmup.body).data.dryRun !== true) {
  throw new Error(`cache warmup failed: ${cacheWarmup.statusCode} ${cacheWarmup.body}`);
}

const userLogin = await app.inject({
  method: "POST",
  url: "/api/v2/auth/login",
  payload: { username: "viewer", password: "viewer123" }
});
if (userLogin.statusCode !== 200) throw new Error(`viewer login failed: ${userLogin.statusCode} ${userLogin.body}`);
const userSetCookie = userLogin.headers["set-cookie"];
const userCookieHeader = (Array.isArray(userSetCookie) ? userSetCookie[0] : userSetCookie)?.split(";")[0] ?? "";
const viewerAlbums = await app.inject({ method: "GET", url: "/api/v2/albums", headers: { cookie: userCookieHeader } });
if (viewerAlbums.statusCode !== 200 || JSON.parse(viewerAlbums.body).data.items.length !== 1) {
  throw new Error(`viewer shared album list failed: ${viewerAlbums.statusCode} ${viewerAlbums.body}`);
}

for (const url of ["/api/v2/assets/asset-demo-1/original", "/api/v2/assets/asset-demo-1/thumbnail"]) {
  const response = await app.inject({ method: "GET", url, headers: { cookie: authHeader } });
  if (response.statusCode !== 404) throw new Error(`${url} expected demo file 404, got ${response.statusCode} ${response.body}`);
}

const sampleFile = path.join(tempDir, "sample.jpg");
await sharp({
  create: {
    width: 80,
    height: 40,
    channels: 3,
    background: { r: 80, g: 120, b: 180 }
  }
})
  .jpeg()
  .toFile(sampleFile);
const now = new Date().toISOString();
app.db
  .prepare(
    "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at) VALUES (?, 'album-demo', ?, ?, 'folder', ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
  .run("asset-smoke-file", "sample.jpg", ".jpg", sampleFile, "sample.jpg", 3, 10, 10, fs.statSync(sampleFile).size, "smoke/sample", now, now);

const original = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-file/original",
  headers: { cookie: authHeader }
});
if (original.statusCode !== 200 || original.headers["content-type"] !== "image/jpeg") {
  throw new Error(`original file smoke failed: ${original.statusCode} ${original.body}`);
}
if (original.headers["x-momentpic-path-mapped"] !== "false") {
  throw new Error("original path mapped header should be false");
}

const thumbnail = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-file/thumbnail",
  headers: { cookie: authHeader }
});
if (thumbnail.statusCode !== 200 || thumbnail.headers["content-type"] !== "image/jpeg") {
  throw new Error(`thumbnail file smoke failed: ${thumbnail.statusCode} ${thumbnail.body}`);
}
if (thumbnail.headers["x-momentpic-thumbnail-cache"] !== "generated") {
  throw new Error(`thumbnail should be generated, got ${String(thumbnail.headers["x-momentpic-thumbnail-cache"])}`);
}
if (thumbnail.headers["x-momentpic-path-mapped"] !== "false") {
  throw new Error("thumbnail path mapped header should be false");
}
const generatedThumbnailSize = Number(thumbnail.headers["content-length"]);
if (!Number.isFinite(generatedThumbnailSize) || generatedThumbnailSize <= 0) {
  throw new Error("generated thumbnail should have a positive content length");
}

const cachedThumbnail = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-file/thumbnail",
  headers: { cookie: authHeader }
});
if (cachedThumbnail.statusCode !== 200 || cachedThumbnail.headers["x-momentpic-thumbnail-cache"] !== "hit") {
  throw new Error(
    `cached thumbnail smoke failed: ${cachedThumbnail.statusCode} ${String(cachedThumbnail.headers["x-momentpic-thumbnail-cache"])}`
  );
}
if (Number(cachedThumbnail.headers["content-length"]) !== generatedThumbnailSize) {
  throw new Error("cached thumbnail size should match generated thumbnail size");
}

const publicAssetShare = await app.inject({
  method: "POST",
  url: "/api/v2/public-shares",
  headers: { cookie: authHeader },
  payload: { type: "asset", targetId: "asset-smoke-file" }
});
if (publicAssetShare.statusCode !== 200) throw new Error(`public asset share failed: ${publicAssetShare.statusCode} ${publicAssetShare.body}`);
const publicAssetShareData = JSON.parse(publicAssetShare.body).data as { token: string; url: string };
const publicAssetPage = await app.inject({ method: "GET", url: publicAssetShareData.url });
if (publicAssetPage.statusCode !== 200 || !publicAssetPage.body.includes(`/s/${publicAssetShareData.token}/thumbnail`)) {
  throw new Error(`public asset page failed: ${publicAssetPage.statusCode} ${publicAssetPage.body}`);
}
const publicAssetOriginal = await app.inject({ method: "GET", url: `/s/${publicAssetShareData.token}/original` });
if (publicAssetOriginal.statusCode !== 200 || publicAssetOriginal.headers["content-type"] !== "image/jpeg") {
  throw new Error(`public asset original failed: ${publicAssetOriginal.statusCode} ${publicAssetOriginal.body}`);
}
const publicAssetThumbnail = await app.inject({ method: "GET", url: `/s/${publicAssetShareData.token}/thumbnail` });
if (publicAssetThumbnail.statusCode !== 200 || publicAssetThumbnail.headers["x-momentpic-thumbnail-cache"] !== "hit") {
  throw new Error(
    `public asset thumbnail failed: ${publicAssetThumbnail.statusCode} ${String(publicAssetThumbnail.headers["x-momentpic-thumbnail-cache"])}`
  );
}

const publicAlbumAssetThumbnail = await app.inject({
  method: "GET",
  url: `/s/${publicShareData.token}/assets/asset-smoke-file/thumbnail`
});
if (publicAlbumAssetThumbnail.statusCode !== 200 || publicAlbumAssetThumbnail.headers["x-momentpic-thumbnail-cache"] !== "hit") {
  throw new Error(`public album asset thumbnail failed: ${publicAlbumAssetThumbnail.statusCode} ${publicAlbumAssetThumbnail.body}`);
}

app.db
  .prepare(
    "INSERT INTO albums (id, library_root_id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count, scan_status, created_at, updated_at) VALUES ('album-hidden', 'gallery-demo', 'Hidden Album', 'folder', ?, ?, 'hidden-fp', 'asset-hidden-file', 1, 'ready', ?, ?)"
  )
  .run(path.join(tempDir, "hidden"), now, now, now);
app.db
  .prepare(
    "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at) VALUES (?, 'album-hidden', ?, ?, 'folder', ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
  .run("asset-hidden-file", "hidden.jpg", ".jpg", sampleFile, "hidden.jpg", 1, 10, 10, fs.statSync(sampleFile).size, "smoke/hidden", now, now);
const publicAlbumHiddenAsset = await app.inject({
  method: "GET",
  url: `/s/${publicShareData.token}/assets/asset-hidden-file/thumbnail`
});
if (publicAlbumHiddenAsset.statusCode !== 404) {
  throw new Error(`public album token should not read hidden asset, got ${publicAlbumHiddenAsset.statusCode} ${publicAlbumHiddenAsset.body}`);
}

const cacheWarmupRun = await app.inject({
  method: "POST",
  url: "/api/v2/cache/thumbnails/warmup",
  headers: { cookie: authHeader },
  payload: { dryRun: false, assetIds: ["asset-smoke-file"], limit: 1 }
});
const cacheWarmupRunData = JSON.parse(cacheWarmupRun.body).data as { processed: number; hit: number; errors: number };
if (cacheWarmupRun.statusCode !== 200 || cacheWarmupRunData.processed !== 1 || cacheWarmupRunData.hit !== 1 || cacheWarmupRunData.errors !== 0) {
  throw new Error(`cache warmup run failed: ${cacheWarmupRun.statusCode} ${cacheWarmupRun.body}`);
}

const mappedFile = path.join(runtimePrefix, "mapped.jpg");
fs.mkdirSync(path.dirname(mappedFile), { recursive: true });
await sharp({
  create: {
    width: 90,
    height: 50,
    channels: 3,
    background: { r: 120, g: 80, b: 80 }
  }
})
  .jpeg()
  .toFile(mappedFile);
app.db
  .prepare(
    "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at) VALUES (?, 'album-demo', ?, ?, 'folder', ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
  .run("asset-smoke-mapped-file", "mapped.jpg", ".jpg", path.join(legacyPrefix, "mapped.jpg"), "mapped.jpg", 4, 10, 10, fs.statSync(mappedFile).size, "smoke/mapped", now, now);

const mappedOriginal = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-mapped-file/original",
  headers: { cookie: authHeader }
});
if (mappedOriginal.statusCode !== 200 || mappedOriginal.headers["content-type"] !== "image/jpeg") {
  throw new Error(`mapped original smoke failed: ${mappedOriginal.statusCode} ${mappedOriginal.body}`);
}
if (mappedOriginal.headers["x-momentpic-path-mapped"] !== "true") {
  throw new Error("mapped original path mapped header should be true");
}

const mappedThumbnail = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-mapped-file/thumbnail",
  headers: { cookie: authHeader }
});
if (mappedThumbnail.statusCode !== 200 || mappedThumbnail.headers["x-momentpic-thumbnail-cache"] !== "generated") {
  throw new Error(
    `mapped thumbnail smoke failed: ${mappedThumbnail.statusCode} ${String(mappedThumbnail.headers["x-momentpic-thumbnail-cache"])}`
  );
}
if (mappedThumbnail.headers["x-momentpic-path-mapped"] !== "true") {
  throw new Error("mapped thumbnail path mapped header should be true");
}

const archiveEntryPath = "nested/archive-image.jpg";
const archiveImageBuffer = await sharp({
  create: {
    width: 96,
    height: 54,
    channels: 3,
    background: { r: 70, g: 150, b: 100 }
  }
})
  .jpeg()
  .toBuffer();
const archiveFile = path.join(runtimePrefix, "archives", "images.zip");
fs.mkdirSync(path.dirname(archiveFile), { recursive: true });
await writeZipFile(archiveFile, [{ entryPath: archiveEntryPath, buffer: archiveImageBuffer }]);
app.db
  .prepare(
    "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, zip_entry_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at) VALUES (?, 'album-demo', ?, ?, 'zip', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
  .run(
    "asset-smoke-archive",
    "archive-image.jpg",
    "jpg",
    path.join(legacyPrefix, "archives", "images.zip"),
    "fallback-name.jpg",
    archiveEntryPath,
    5,
    96,
    54,
    archiveImageBuffer.length,
    "smoke/archive",
    now,
    now
  );

const archiveOriginal = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-archive/original",
  headers: { cookie: authHeader }
});
if (archiveOriginal.statusCode !== 200 || archiveOriginal.headers["content-type"] !== "image/jpeg") {
  throw new Error(`archive original smoke failed: ${archiveOriginal.statusCode} ${archiveOriginal.body}`);
}
if (Number(archiveOriginal.headers["content-length"]) !== archiveImageBuffer.length) {
  throw new Error("archive original content length should match the entry size");
}
if (archiveOriginal.headers["x-momentpic-path-mapped"] !== "true") {
  throw new Error("archive original path mapped header should be true");
}

const archiveThumbnail = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-archive/thumbnail",
  headers: { cookie: authHeader }
});
if (archiveThumbnail.statusCode !== 200 || archiveThumbnail.headers["content-type"] !== "image/jpeg") {
  throw new Error(`archive thumbnail smoke failed: ${archiveThumbnail.statusCode} ${archiveThumbnail.body}`);
}
if (archiveThumbnail.headers["x-momentpic-thumbnail-cache"] !== "generated") {
  throw new Error(`archive thumbnail should be generated, got ${String(archiveThumbnail.headers["x-momentpic-thumbnail-cache"])}`);
}
if (archiveThumbnail.headers["x-momentpic-path-mapped"] !== "true") {
  throw new Error("archive thumbnail path mapped header should be true");
}
const generatedArchiveThumbnailSize = Number(archiveThumbnail.headers["content-length"]);
if (!Number.isFinite(generatedArchiveThumbnailSize) || generatedArchiveThumbnailSize <= 0) {
  throw new Error("generated archive thumbnail should have a positive content length");
}

const cachedArchiveThumbnail = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-archive/thumbnail",
  headers: { cookie: authHeader }
});
if (cachedArchiveThumbnail.statusCode !== 200 || cachedArchiveThumbnail.headers["x-momentpic-thumbnail-cache"] !== "hit") {
  throw new Error(
    `cached archive thumbnail smoke failed: ${cachedArchiveThumbnail.statusCode} ${String(cachedArchiveThumbnail.headers["x-momentpic-thumbnail-cache"])}`
  );
}
if (Number(cachedArchiveThumbnail.headers["content-length"]) !== generatedArchiveThumbnailSize) {
  throw new Error("cached archive thumbnail size should match generated archive thumbnail size");
}

app.db
  .prepare(
    "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, zip_entry_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at) VALUES (?, 'album-demo', ?, ?, 'zip', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
  .run(
    "asset-smoke-archive-missing",
    "missing.jpg",
    "jpg",
    archiveFile,
    "missing.jpg",
    "nested/missing.jpg",
    6,
    10,
    10,
    0,
    "smoke/archive-missing",
    now,
    now
  );
const missingArchiveOriginal = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-archive-missing/original",
  headers: { cookie: authHeader }
});
if (missingArchiveOriginal.statusCode !== 404) {
  throw new Error(`missing archive entry should be 404, got ${missingArchiveOriginal.statusCode} ${missingArchiveOriginal.body}`);
}

const invalidArchiveFile = path.join(tempDir, "not-a-zip.zip");
fs.writeFileSync(invalidArchiveFile, "not a zip");
app.db
  .prepare(
    "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, zip_entry_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at) VALUES (?, 'album-demo', ?, ?, 'zip', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
  .run(
    "asset-smoke-invalid-archive",
    "invalid.jpg",
    "jpg",
    invalidArchiveFile,
    "invalid.jpg",
    "invalid.jpg",
    7,
    10,
    10,
    0,
    "smoke/invalid-archive",
    now,
    now
  );
const invalidArchiveOriginal = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-invalid-archive/original",
  headers: { cookie: authHeader }
});
if (invalidArchiveOriginal.statusCode !== 415) {
  throw new Error(`invalid archive should be 415, got ${invalidArchiveOriginal.statusCode} ${invalidArchiveOriginal.body}`);
}

const unsupportedRarFile = path.join(tempDir, "unsupported.rar");
fs.writeFileSync(unsupportedRarFile, "rar placeholder");
app.db
  .prepare(
    "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, zip_entry_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at) VALUES (?, 'album-demo', ?, ?, 'archive', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
  .run(
    "asset-smoke-rar",
    "rar-image.jpg",
    "jpg",
    unsupportedRarFile,
    "rar-image.jpg",
    "rar-image.jpg",
    8,
    10,
    10,
    0,
    "smoke/rar",
    now,
    now
  );
const unsupportedRarOriginal = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-rar/original",
  headers: { cookie: authHeader }
});
if (unsupportedRarOriginal.statusCode !== 501) {
  throw new Error(`unsupported rar should be 501, got ${unsupportedRarOriginal.statusCode} ${unsupportedRarOriginal.body}`);
}
if (!unsupportedRarOriginal.body.includes("rar/cbr/7z/cb7") || !unsupportedRarOriginal.headers["x-momentpic-archive-readiness"]) {
  throw new Error(`unsupported rar should include readiness detail: ${unsupportedRarOriginal.statusCode} ${unsupportedRarOriginal.body}`);
}

const legacyDbPath = path.join(tempDir, "legacy.sqlite");
const legacyDb = new DatabaseSync(legacyDbPath);
legacyDb.exec(`
CREATE TABLE library_roots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL,
  last_scanned_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  library_root_id TEXT NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_path TEXT NOT NULL UNIQUE,
  source_mtime TEXT,
  assets_fingerprint TEXT,
  cover_asset_id TEXT,
  asset_count INTEGER NOT NULL,
  scan_status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE assets (
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
  size_bytes TEXT,
  source_mtime TEXT,
  thumbnail_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE thumbnails (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL UNIQUE,
  cache_key TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE system_config (
  id TEXT PRIMARY KEY DEFAULT 'system_config',
  enable_polling INTEGER NOT NULL DEFAULT 1,
  polling_interval INTEGER NOT NULL DEFAULT 60000,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  preload_before INTEGER NOT NULL DEFAULT 2,
  preload_after INTEGER NOT NULL DEFAULT 3
);
CREATE TABLE users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE shared_albums (
  username TEXT NOT NULL,
  album_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (username, album_id)
);
CREATE TABLE favorite_albums (
  username TEXT NOT NULL,
  album_id TEXT NOT NULL,
  album_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (username, album_id)
);
CREATE TABLE public_shares (
  token TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`);
legacyDb
  .prepare("INSERT INTO library_roots (id, name, path, enabled, last_scanned_at, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)")
  .run("legacy-root", "Legacy Gallery", path.join(tempDir, "legacy-gallery"), now, now, now);
legacyDb
  .prepare(
    "INSERT INTO albums (id, library_root_id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count, scan_status, created_at, updated_at) VALUES (?, ?, ?, 'folder', ?, ?, ?, ?, 1, 'ready', ?, ?)"
  )
  .run("legacy-album", "legacy-root", "Legacy Album", path.join(tempDir, "legacy-gallery", "album"), now, "legacy-fp", "legacy-asset", now, now);
legacyDb
  .prepare(
    "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, sort_index, width, height, size_bytes, source_mtime, thumbnail_key, created_at, updated_at) VALUES (?, ?, ?, ?, 'folder', ?, ?, 1, 20, 30, ?, ?, ?, ?, ?)"
  )
  .run("legacy-asset", "legacy-album", "legacy.jpg", ".jpg", sampleFile, "legacy.jpg", String(fs.statSync(sampleFile).size), now, "legacy/thumb", now, now);
legacyDb.prepare("INSERT INTO users (username, password, role, created_at, updated_at) VALUES ('legacy-user', 'plaintext-not-copied', 'user', ?, ?)").run(now, now);
legacyDb.prepare("INSERT INTO shared_albums (username, album_id, created_at, updated_at) VALUES ('legacy-user', 'legacy-album', ?, ?)").run(now, now);
legacyDb
  .prepare("INSERT INTO favorite_albums (username, album_id, album_json, created_at, updated_at) VALUES ('legacy-user', 'legacy-album', '{}', ?, ?)")
  .run(now, now);
legacyDb
  .prepare("INSERT INTO public_shares (token, type, target_id, created_by, created_at, updated_at) VALUES ('legacy-token', 'album', 'legacy-album', 'legacy-user', ?, ?)")
  .run(now, now);
legacyDb.close();

const dryRun = importLegacyDb({
  legacyDbPath,
  targetDbPath: path.join(tempDir, "import-dry-run-target.sqlite"),
  dryRun: true
});
if (dryRun.tableCounts.library_roots !== 1 || dryRun.tableCounts.albums !== 1 || dryRun.tableCounts.assets !== 1 || dryRun.imported.assets !== 0) {
  throw new Error(`legacy dry-run smoke failed: ${JSON.stringify(dryRun)}`);
}

const importedDbPath = path.join(tempDir, "imported.sqlite");
const imported = importLegacyDb({ legacyDbPath, targetDbPath: importedDbPath, dryRun: false });
if (
  imported.imported.galleries !== 1 ||
  imported.imported.albums !== 1 ||
  imported.imported.assets !== 1 ||
  imported.imported.users !== 1 ||
  imported.imported.sharedAlbums !== 1 ||
  imported.imported.favoriteAlbums !== 1 ||
  imported.imported.publicShares !== 1
) {
  throw new Error(`legacy import smoke failed: ${JSON.stringify(imported)}`);
}
const importedDb = openDatabase(importedDbPath);
const importedAsset = importedDb.prepare("SELECT source_path, size_bytes FROM assets WHERE id = 'legacy-asset'").get() as
  | { source_path: string; size_bytes: number }
  | undefined;
const importedUser = importedDb.prepare("SELECT username, password_hash, password_reset_required FROM users WHERE username = 'legacy-user'").get() as
  | { username: string; password_hash: string; password_reset_required: number }
  | undefined;
const importedShare = importedDb.prepare("SELECT username FROM shared_albums WHERE username = 'legacy-user' AND album_id = 'legacy-album'").get();
const importedFavorite = importedDb.prepare("SELECT username FROM favorite_albums WHERE username = 'legacy-user' AND album_id = 'legacy-album'").get();
const importedPublicShare = importedDb.prepare("SELECT token FROM public_shares WHERE token = 'legacy-token'").get();
importedDb.close();
if (!importedAsset || importedAsset.source_path !== sampleFile || importedAsset.size_bytes !== fs.statSync(sampleFile).size) {
  throw new Error("legacy imported asset mismatch");
}
if (!importedUser || importedUser.password_reset_required !== 1 || importedUser.password_hash.includes("plaintext-not-copied")) {
  throw new Error("legacy user should be imported with reset-required hashed password only");
}
if (!importedShare || !importedFavorite || !importedPublicShare) {
  throw new Error("legacy social tables should be imported");
}

const logout = await app.inject({ method: "POST", url: "/api/v2/auth/logout", headers: { cookie: authHeader } });
if (logout.statusCode !== 200) throw new Error(`logout failed: ${logout.statusCode}`);

await app.close();
console.log("Smoke passed");
