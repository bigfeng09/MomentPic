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

const waitForScanTask = async (
  appInstance: Awaited<ReturnType<typeof buildApp>>,
  taskId: string,
  cookie: string
): Promise<{ status: string; dryRun: boolean; albumsDiscovered: number; assetsDiscovered: number; error?: string | null }> => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const healthDuringScan = await appInstance.inject({ method: "GET", url: "/api/v2/health" });
    if (healthDuringScan.statusCode !== 200) throw new Error(`health blocked during scan: ${healthDuringScan.statusCode} ${healthDuringScan.body}`);
    const status = await appInstance.inject({ method: "GET", url: `/api/v2/scan/${taskId}`, headers: { cookie } });
    if (status.statusCode !== 200) throw new Error(`scan status failed: ${status.statusCode} ${status.body}`);
    const data = JSON.parse(status.body).data as {
      status: string;
      dryRun: boolean;
      albumsDiscovered: number;
      assetsDiscovered: number;
      error?: string | null;
      progressPhase?: string | null;
    };
    if (data.status === "running" && data.error != null) throw new Error(`running scan returned error: ${status.body}`);
    if (data.progressPhase && !["walking", "folders", "archives", "writing"].includes(data.progressPhase)) {
      throw new Error(`scan returned invalid progressPhase: ${status.body}`);
    }
    if (data.status === "completed") return data;
    if (data.status === "failed") throw new Error(`scan task failed: ${status.body}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`scan task did not finish: ${taskId}`);
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "momentpic-v2-smoke-"));
const legacyPrefix = path.join(tempDir, "legacy-prefix") + path.sep;
const runtimePrefix = path.join(tempDir, "runtime-prefix") + path.sep;

const noDemoDbPath = path.join(tempDir, "no-demo.sqlite");
const noDemoApp = await buildApp({
  dbPath: noDemoDbPath,
  authSecret: "no-demo-secret",
  adminUsername: "admin",
  adminPassword: "no-demo-admin-password",
  seedDemoData: false,
  pathPrefixMap: [],
  thumbnailCacheDir: path.join(tempDir, "no-demo-thumbnail-cache"),
  libraryRootAllowedPrefixes: [tempDir]
});
const noDemoLogin = await noDemoApp.inject({
  method: "POST",
  url: "/api/v2/auth/login",
  payload: { username: "admin", password: "no-demo-admin-password" }
});
if (noDemoLogin.statusCode !== 200) {
  throw new Error(`admin login with demo seed disabled failed: ${noDemoLogin.statusCode} ${noDemoLogin.body}`);
}
const noDemoCounts = noDemoApp.db
  .prepare("SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM library_roots) AS libraryRoots")
  .get() as { users: number; libraryRoots: number };
if (noDemoCounts.users !== 1 || noDemoCounts.libraryRoots !== 0) {
  throw new Error(`demo-disabled startup seeded unexpected rows: ${JSON.stringify(noDemoCounts)}`);
}
await noDemoApp.close();

const app = await buildApp({
  dbPath: path.join(tempDir, "smoke.sqlite"),
  authSecret: "smoke-secret",
  adminPassword: "smoke-admin-password",
  seedDemoData: true,
  pathPrefixMap: [{ from: legacyPrefix, to: runtimePrefix }],
  thumbnailCacheDir: path.join(tempDir, "thumbnail-cache"),
  thumbnailMaxSize: 32,
  libraryRootAllowedPrefixes: [tempDir, "/demo"]
});

const health = await app.inject({ method: "GET", url: "/api/v2/health" });
if (health.statusCode !== 200) throw new Error(`health failed: ${health.statusCode}`);

const webRoot = await app.inject({ method: "GET", url: "/" });
if (
  webRoot.statusCode !== 200 ||
  !String(webRoot.headers["content-type"]).includes("text/html") ||
  !webRoot.body.includes('id="login-screen"') ||
  !webRoot.body.includes('id="album-grid"') ||
  !webRoot.body.includes('id="settings-view"') ||
  !webRoot.body.includes('id="gallery-add-panel"') ||
  !webRoot.body.includes('id="library-roots-panel"') ||
  !webRoot.body.includes('id="all-albums-filter-btn"') ||
  !webRoot.body.includes('id="favorite-filter-btn"') ||
  !webRoot.body.includes("全部相册") ||
  !webRoot.body.includes("我的收藏") ||
  !webRoot.body.includes("最近下载/最近更新优先") ||
  !webRoot.body.includes('id="home-refresh-scan-btn"') ||
  !webRoot.body.includes('id="home-full-scan-btn"') ||
  !webRoot.body.includes('id="home-scan-status"') ||
  !webRoot.body.includes('id="action-menu"') ||
  !webRoot.body.includes('id="share-dialog"') ||
  !webRoot.body.includes("/api/v2/system/status") ||
  !webRoot.body.includes("/api/v2/system/config") ||
  !webRoot.body.includes("/api/v2/auth/login") ||
  !webRoot.body.includes("/api/v2/galleries") ||
  !webRoot.body.includes("/api/v2/scan/") ||
  !webRoot.body.includes("/api/v2/favorite-albums") ||
  !webRoot.body.includes("/api/v2/albums?page=1&pageSize=50") ||
  !webRoot.body.includes("预加载图片数量") ||
  !webRoot.body.includes("分享给普通账户") ||
  !webRoot.body.includes("分享 \" + state.selectedShareAlbumIds.size + \" 个相册") ||
  !webRoot.body.includes("全选当前结果") ||
  !webRoot.body.includes("清空选择") ||
  !webRoot.body.includes("compositionstart") ||
  !webRoot.body.includes("compositionend") ||
  !webRoot.body.includes("输入关键词搜索全库相册") ||
  !webRoot.body.includes("结果最多显示前 50 条") ||
  !webRoot.body.includes("默认显示收藏相册最新 50 个") ||
  webRoot.body.includes("默认最近更新前 50 个相册") ||
  webRoot.body.includes("默认显示最近更新前 50 个相册") ||
  !webRoot.body.includes('id="viewer-prev-zone"') ||
  !webRoot.body.includes('id="viewer-next-zone"') ||
  !webRoot.body.includes("changeViewerAsset") ||
  !webRoot.body.includes("zoomViewerAt") ||
  !webRoot.body.includes("--viewer-zoom") ||
  !webRoot.body.includes('addEventListener("wheel"') ||
  !webRoot.body.includes("图片操作") ||
  !webRoot.body.includes("下载到本地") ||
  !webRoot.body.includes("生成公开分享链接") ||
  !webRoot.body.includes("真实扫描导入") ||
  !webRoot.body.includes("增量刷新") ||
  !webRoot.body.includes("全量刷新") ||
  !webRoot.body.includes("用于发现新增相册文件夹和新增压缩包") ||
  !webRoot.body.includes("会遍历整个相册库") ||
  !webRoot.body.includes("recoverActiveScanTask") ||
  !webRoot.body.includes("fast: !full") ||
  !webRoot.body.includes("图库来源文件夹") ||
  !webRoot.body.includes("正式导入必须 dryRun=false") ||
  !webRoot.body.includes("后端/Unraid 服务端路径，不是浏览器本地目录") ||
  !webRoot.body.includes("默认先扫描预览") ||
  !webRoot.body.includes("后端错误 ")
) {
  throw new Error(`web root smoke failed: ${webRoot.statusCode} ${webRoot.body.slice(0, 160)}`);
}

const rejected = await app.inject({ method: "GET", url: "/api/v2/galleries" });
if (rejected.statusCode !== 401) throw new Error(`expected auth guard, got ${rejected.statusCode}`);
const rejectedSystem = await app.inject({ method: "GET", url: "/api/v2/system/status" });
if (rejectedSystem.statusCode !== 401) throw new Error(`expected system auth guard, got ${rejectedSystem.statusCode}`);

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
  "/api/v2/system/status",
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

app.db
  .prepare(
    "INSERT INTO albums (id, library_root_id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count, scan_status, created_at, updated_at) VALUES (?, 'gallery-demo', ?, 'folder', ?, ?, ?, NULL, 0, 'ready', ?, ?)"
  )
  .run(
    "album-sort-older",
    "Sort Older Album",
    "/demo/moment-pic/sort-older",
    "2026-01-01T00:00:00.000Z",
    "sort-older",
    "2026-01-01T00:00:00.000Z",
    "2026-01-01T00:00:00.000Z"
  );
app.db
  .prepare(
    "INSERT INTO albums (id, library_root_id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count, scan_status, created_at, updated_at) VALUES (?, 'gallery-demo', ?, ?, ?, ?, ?, NULL, 0, 'ready', ?, ?)"
  )
  .run(
    "album-sort-newer",
    "Sort Newer Album",
    "folder",
    "/demo/moment-pic/sort-newer",
    "2026-02-01T00:00:00.000Z",
    "sort-newer",
    "2026-02-01T00:00:00.000Z",
    "2026-02-01T00:00:00.000Z"
  );
const defaultSortedAlbums = await app.inject({
  method: "GET",
  url: "/api/v2/albums?keyword=Sort&page=1&pageSize=2",
  headers: { cookie: authHeader }
});
const defaultSortedAlbumItems = JSON.parse(defaultSortedAlbums.body).data.items as Array<{ id: string; updatedAt: string }>;
if (
  defaultSortedAlbums.statusCode !== 200 ||
  defaultSortedAlbumItems[0]?.id !== "album-sort-newer" ||
  defaultSortedAlbumItems[1]?.id !== "album-sort-older"
) {
  throw new Error(`default albums sort should be updatedAt desc: ${defaultSortedAlbums.statusCode} ${defaultSortedAlbums.body}`);
}

app.db
  .prepare(
    "INSERT INTO albums (id, library_root_id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count, scan_status, created_at, updated_at) VALUES (?, 'gallery-demo', ?, 'folder', ?, ?, ?, NULL, 2, 'ready', ?, ?)"
  )
  .run(
    "album-sort-assets",
    "Sort Assets Album",
    "/demo/moment-pic/sort-assets",
    "2026-02-01T00:00:00.000Z",
    "sort-assets",
    "2026-02-01T00:00:00.000Z",
    "2026-02-01T00:00:00.000Z"
  );
const insertSortAsset = app.db.prepare(
  "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, sort_index, width, height, size_bytes, source_mtime, thumbnail_key, created_at, updated_at) VALUES (?, 'album-sort-assets', ?, '.jpg', 'folder', ?, ?, ?, 10, 10, 10, ?, ?, ?, ?)"
);
insertSortAsset.run(
  "asset-sort-older",
  "older.jpg",
  "/demo/moment-pic/sort-assets/older.jpg",
  "sort-assets/older.jpg",
  1,
  "2026-01-01T00:00:00.000Z",
  "sort/assets/older",
  "2026-03-01T00:00:00.000Z",
  "2026-03-01T00:00:00.000Z"
);
insertSortAsset.run(
  "asset-sort-newer",
  "newer.jpg",
  "/demo/moment-pic/sort-assets/newer.jpg",
  "sort-assets/newer.jpg",
  2,
  "2026-02-01T00:00:00.000Z",
  "sort/assets/newer",
  "2026-01-01T00:00:00.000Z",
  "2026-01-01T00:00:00.000Z"
);
const defaultSortedAssets = await app.inject({
  method: "GET",
  url: "/api/v2/albums/album-sort-assets/assets?page=1&pageSize=2",
  headers: { cookie: authHeader }
});
const defaultSortedAssetItems = JSON.parse(defaultSortedAssets.body).data.items as Array<{ id: string; sourceMtime: string | null }>;
if (
  defaultSortedAssets.statusCode !== 200 ||
  defaultSortedAssetItems[0]?.id !== "asset-sort-newer" ||
  defaultSortedAssetItems[1]?.id !== "asset-sort-older"
) {
  throw new Error(`default assets sort should be sourceMtime desc: ${defaultSortedAssets.statusCode} ${defaultSortedAssets.body}`);
}

const scanCompatNow = new Date().toISOString();
app.db
  .prepare(
    `INSERT INTO scan_tasks (id, status, dry_run, gallery_id, created_by, created_at, started_at, error, progress_phase, albums_discovered, assets_discovered)
     VALUES (?, ?, 1, NULL, 'admin', ?, ?, ?, ?, ?, ?)`
  )
  .run("scan-smoke-running-progress", "running", scanCompatNow, scanCompatNow, null, "walking", 3, 4);
const runningProgress = await app.inject({ method: "GET", url: "/api/v2/scan/scan-smoke-running-progress", headers: { cookie: authHeader } });
const runningProgressData = JSON.parse(runningProgress.body).data as { status?: string; error?: string | null; progressPhase?: string | null };
if (runningProgress.statusCode !== 200 || runningProgressData.status !== "running" || runningProgressData.error !== null || runningProgressData.progressPhase !== "walking") {
  throw new Error(`running scan progress DTO failed: ${runningProgress.statusCode} ${runningProgress.body}`);
}
app.db
  .prepare(
    `INSERT INTO scan_tasks (id, status, dry_run, gallery_id, created_by, created_at, started_at, error, albums_discovered, assets_discovered)
     VALUES (?, 'running', 1, NULL, 'admin', ?, ?, 'phase:folders', 5, 6)`
  )
  .run("scan-smoke-legacy-phase", new Date(Date.parse(scanCompatNow) + 1000).toISOString(), scanCompatNow);
const legacyPhase = await app.inject({ method: "GET", url: "/api/v2/scan/scan-smoke-legacy-phase", headers: { cookie: authHeader } });
const legacyPhaseData = JSON.parse(legacyPhase.body).data as { error?: string | null; progressPhase?: string | null };
if (legacyPhase.statusCode !== 200 || legacyPhaseData.error !== null || legacyPhaseData.progressPhase !== "folders") {
  throw new Error(`legacy scan phase DTO failed: ${legacyPhase.statusCode} ${legacyPhase.body}`);
}
const activeScanList = await app.inject({ method: "GET", url: "/api/v2/scan", headers: { cookie: authHeader } });
const activeScanListData = JSON.parse(activeScanList.body).data as { latestActive?: { taskId?: string; status?: string } | null };
if (activeScanList.statusCode !== 200 || activeScanListData.latestActive?.taskId !== "scan-smoke-legacy-phase") {
  throw new Error(`active scan recovery DTO failed: ${activeScanList.statusCode} ${activeScanList.body}`);
}
app.db
  .prepare(
    `INSERT INTO scan_tasks (id, status, dry_run, gallery_id, created_by, created_at, finished_at, error, albums_discovered, assets_discovered)
     VALUES (?, 'failed', 1, NULL, 'admin', ?, ?, 'expected smoke failure', 0, 0)`
  )
  .run("scan-smoke-failed-error", scanCompatNow, scanCompatNow);
const failedScan = await app.inject({ method: "GET", url: "/api/v2/scan/scan-smoke-failed-error", headers: { cookie: authHeader } });
const failedScanData = JSON.parse(failedScan.body).data as { status?: string; error?: string | null };
if (failedScan.statusCode !== 200 || failedScanData.status !== "failed" || failedScanData.error !== "expected smoke failure") {
  throw new Error(`failed scan error DTO failed: ${failedScan.statusCode} ${failedScan.body}`);
}

const updateSystemConfig = await app.inject({
  method: "PATCH",
  url: "/api/v2/system/config",
  headers: { cookie: authHeader },
  payload: { preloadBefore: 4, preloadAfter: 5 }
});
const updateSystemConfigData = JSON.parse(updateSystemConfig.body).data as { preloadBefore?: number; preloadAfter?: number };
if (updateSystemConfig.statusCode !== 200 || updateSystemConfigData.preloadBefore !== 4 || updateSystemConfigData.preloadAfter !== 5) {
  throw new Error(`system config update failed: ${updateSystemConfig.statusCode} ${updateSystemConfig.body}`);
}
const invalidSystemConfig = await app.inject({
  method: "PATCH",
  url: "/api/v2/system/config",
  headers: { cookie: authHeader },
  payload: { preloadBefore: 6, preloadAfter: 0 }
});
if (invalidSystemConfig.statusCode !== 400) {
  throw new Error(`invalid system config should be 400, got ${invalidSystemConfig.statusCode} ${invalidSystemConfig.body}`);
}

const serverGalleryPath = path.join(tempDir, "server-gallery").replace(/\\/g, "/");
const createGallery = await app.inject({
  method: "POST",
  url: "/api/v2/galleries",
  headers: { cookie: authHeader },
  payload: { name: "Smoke Gallery", path: serverGalleryPath }
});
const createGalleryData = JSON.parse(createGallery.body).data as { item?: { id: string; name: string; path: string }; scan?: { dryRunAvailable: boolean } };
if (
  createGallery.statusCode !== 200 ||
  createGalleryData.item?.name !== "Smoke Gallery" ||
  createGalleryData.item?.path !== serverGalleryPath ||
  createGalleryData.scan?.dryRunAvailable !== true
) {
  throw new Error(`create gallery failed: ${createGallery.statusCode} ${createGallery.body}`);
}
if (!createGalleryData.item) throw new Error("create gallery did not return item");
const duplicateGallery = await app.inject({
  method: "POST",
  url: "/api/v2/galleries",
  headers: { cookie: authHeader },
  payload: { name: "Duplicate Gallery", path: serverGalleryPath }
});
if (duplicateGallery.statusCode !== 409) {
  throw new Error(`duplicate gallery should be 409, got ${duplicateGallery.statusCode} ${duplicateGallery.body}`);
}
const invalidGallery = await app.inject({
  method: "POST",
  url: "/api/v2/galleries",
  headers: { cookie: authHeader },
  payload: { name: "Invalid Gallery", path: "relative/gallery" }
});
if (invalidGallery.statusCode !== 400) {
  throw new Error(`invalid gallery should be 400, got ${invalidGallery.statusCode} ${invalidGallery.body}`);
}
const dangerousGallery = await app.inject({
  method: "POST",
  url: "/api/v2/galleries",
  headers: { cookie: authHeader },
  payload: { name: "Danger Gallery", path: "/mnt/user" }
});
if (dangerousGallery.statusCode !== 400) {
  throw new Error(`dangerous gallery should be 400, got ${dangerousGallery.statusCode} ${dangerousGallery.body}`);
}
const galleriesAfterCreate = await app.inject({ method: "GET", url: "/api/v2/galleries", headers: { cookie: authHeader } });
if (
  galleriesAfterCreate.statusCode !== 200 ||
  !JSON.parse(galleriesAfterCreate.body).data.items.some((item: { name: string; path: string }) => item.name === "Smoke Gallery")
) {
  throw new Error(`created gallery list smoke failed: ${galleriesAfterCreate.statusCode} ${galleriesAfterCreate.body}`);
}
const smokeGalleryId = createGalleryData.item.id;
const smokeGalleryPath = createGalleryData.item.path;
fs.mkdirSync(path.join(smokeGalleryPath, "子相册"), { recursive: true });
await sharp({
  create: {
    width: 24,
    height: 16,
    channels: 3,
    background: { r: 120, g: 160, b: 90 }
  }
})
  .png()
  .toFile(path.join(smokeGalleryPath, "root-image.png"));
await sharp({
  create: {
    width: 28,
    height: 18,
    channels: 3,
    background: { r: 160, g: 90, b: 120 }
  }
})
  .jpeg()
  .toFile(path.join(smokeGalleryPath, "子相册", "child-image.jpg"));

const galleryScanDryRun = await app.inject({
  method: "POST",
  url: `/api/v2/galleries/${smokeGalleryId}/scan`,
  headers: { cookie: authHeader },
  payload: { dryRun: true }
});
const galleryScanDryRunData = JSON.parse(galleryScanDryRun.body).data as { taskId?: string; status?: string; dryRun?: boolean };
if (galleryScanDryRun.statusCode !== 202 || galleryScanDryRunData.dryRun !== true || !galleryScanDryRunData.taskId) {
  throw new Error(`gallery scan dry-run failed: ${galleryScanDryRun.statusCode} ${galleryScanDryRun.body}`);
}
const galleryScanDryRunTask = await waitForScanTask(app, galleryScanDryRunData.taskId, authHeader);
if (galleryScanDryRunTask.dryRun !== true || galleryScanDryRunTask.albumsDiscovered !== 2 || galleryScanDryRunTask.assetsDiscovered !== 2) {
  throw new Error(`gallery scan dry-run task failed: ${JSON.stringify(galleryScanDryRunTask)}`);
}

const galleryScanRun = await app.inject({
  method: "POST",
  url: `/api/v2/galleries/${smokeGalleryId}/scan`,
  headers: { cookie: authHeader },
  payload: { dryRun: false }
});
const galleryScanRunData = JSON.parse(galleryScanRun.body).data as { taskId?: string; status?: string; dryRun?: boolean };
if (galleryScanRun.statusCode !== 202 || galleryScanRunData.dryRun !== false || !galleryScanRunData.taskId) {
  throw new Error(`gallery scan import failed: ${galleryScanRun.statusCode} ${galleryScanRun.body}`);
}
const galleryScanRunTask = await waitForScanTask(app, galleryScanRunData.taskId, authHeader);
if (galleryScanRunTask.dryRun !== false || galleryScanRunTask.albumsDiscovered !== 2 || galleryScanRunTask.assetsDiscovered !== 2) {
  throw new Error(`gallery scan import task failed: ${JSON.stringify(galleryScanRunTask)}`);
}
const scannedAlbums = await app.inject({
  method: "GET",
  url: `/api/v2/albums?galleryId=${encodeURIComponent(smokeGalleryId)}&page=1&pageSize=10`,
  headers: { cookie: authHeader }
});
const scannedAlbumItems = JSON.parse(scannedAlbums.body).data.items as Array<{ id: string; name: string; assetCount: number }>;
if (scannedAlbums.statusCode !== 200 || scannedAlbumItems.length !== 2 || scannedAlbumItems.reduce((sum, item) => sum + item.assetCount, 0) !== 2) {
  throw new Error(`scanned albums list failed: ${scannedAlbums.statusCode} ${scannedAlbums.body}`);
}
const scannedAssets = await app.inject({
  method: "GET",
  url: `/api/v2/albums/${encodeURIComponent(scannedAlbumItems[0].id)}/assets`,
  headers: { cookie: authHeader }
});
if (scannedAssets.statusCode !== 200 || JSON.parse(scannedAssets.body).data.items.length < 1) {
  throw new Error(`scanned assets list failed: ${scannedAssets.statusCode} ${scannedAssets.body}`);
}

const nestedArchiveFile = path.join(smokeGalleryPath, "中文压缩包.cbz");
const nestedArchiveSmall = await sharp({
  create: { width: 16, height: 16, channels: 3, background: { r: 20, g: 30, b: 40 } }
})
  .jpeg()
  .toBuffer();
const nestedArchiveLarge = await sharp({
  create: { width: 80, height: 50, channels: 3, background: { r: 40, g: 120, b: 190 } }
})
  .jpeg()
  .toBuffer();
await writeZipFile(nestedArchiveFile, [
  { entryPath: "封面.jpg", buffer: nestedArchiveSmall },
  { entryPath: "正片/第01张.jpg", buffer: nestedArchiveLarge },
  { entryPath: "__MACOSX/._ignored.jpg", buffer: nestedArchiveSmall }
]);
const fullScan = await app.inject({
  method: "POST",
  url: "/api/v2/scan",
  headers: { cookie: authHeader },
  payload: { dryRun: false, fast: false, galleryId: smokeGalleryId }
});
const fullScanData = JSON.parse(fullScan.body).data as { taskId?: string; dryRun?: boolean };
if (fullScan.statusCode !== 202 || fullScanData.dryRun !== false || !fullScanData.taskId) {
  throw new Error(`full scan fast:false failed: ${fullScan.statusCode} ${fullScan.body}`);
}
const fullScanTask = await waitForScanTask(app, fullScanData.taskId, authHeader);
if (fullScanTask.dryRun !== false || fullScanTask.albumsDiscovered !== 3 || fullScanTask.assetsDiscovered !== 3) {
  throw new Error(`full scan task failed: ${JSON.stringify(fullScanTask)}`);
}
const archiveAlbum = app.db
  .prepare("SELECT id, asset_count FROM albums WHERE library_root_id = ? AND source_path = ?")
  .get(smokeGalleryId, nestedArchiveFile) as { id: string; asset_count: number } | undefined;
if (!archiveAlbum || archiveAlbum.asset_count !== 1) {
  throw new Error(`full scan should import only the larger nested archive image set: ${JSON.stringify(archiveAlbum)}`);
}
const archiveAsset = app.db
  .prepare("SELECT id, name, zip_entry_path FROM assets WHERE album_id = ?")
  .get(archiveAlbum.id) as { id: string; name: string; zip_entry_path: string | null } | undefined;
if (!archiveAsset || archiveAsset.name !== "第01张.jpg" || archiveAsset.zip_entry_path !== "正片/第01张.jpg") {
  throw new Error(`full scan archive Chinese/nested asset failed: ${JSON.stringify(archiveAsset)}`);
}
const scannedArchiveOriginal = await app.inject({
  method: "GET",
  url: `/api/v2/assets/${encodeURIComponent(archiveAsset.id)}/original`,
  headers: { cookie: authHeader }
});
if (scannedArchiveOriginal.statusCode !== 200 || scannedArchiveOriginal.headers["content-type"] !== "image/jpeg") {
  throw new Error(`scanned archive original failed: ${scannedArchiveOriginal.statusCode} ${scannedArchiveOriginal.body}`);
}
const scannedArchiveThumbnail = await app.inject({
  method: "GET",
  url: `/api/v2/assets/${encodeURIComponent(archiveAsset.id)}/thumbnail`,
  headers: { cookie: authHeader }
});
if (scannedArchiveThumbnail.statusCode !== 200 || scannedArchiveThumbnail.headers["content-type"] !== "image/jpeg") {
  throw new Error(`scanned archive thumbnail failed: ${scannedArchiveThumbnail.statusCode} ${scannedArchiveThumbnail.body}`);
}
const historicalAlbumId = "album-smoke-historical";
const historicalAssetId = "asset-smoke-historical";
app.db
  .prepare(
    "INSERT INTO albums (id, library_root_id, name, source_type, source_path, source_mtime, assets_fingerprint, cover_asset_id, asset_count, scan_status, created_at, updated_at) VALUES (?, ?, 'Historical Album', 'folder', ?, ?, 'historical-fp', ?, 1, 'ready', ?, ?)"
  )
  .run(historicalAlbumId, smokeGalleryId, path.join(smokeGalleryPath, "missing-historical"), new Date().toISOString(), historicalAssetId, new Date().toISOString(), new Date().toISOString());
app.db
  .prepare(
    "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at) VALUES (?, ?, 'historical.jpg', '.jpg', 'folder', ?, 'missing-historical/historical.jpg', 1, 10, 10, 10, 'smoke/historical', ?, ?)"
  )
  .run(historicalAssetId, historicalAlbumId, path.join(smokeGalleryPath, "missing-historical", "historical.jpg"), new Date().toISOString(), new Date().toISOString());
const fullScanAgain = await app.inject({
  method: "POST",
  url: "/api/v2/scan",
  headers: { cookie: authHeader },
  payload: { dryRun: false, fast: false, galleryId: smokeGalleryId }
});
const fullScanAgainData = JSON.parse(fullScanAgain.body).data as { taskId?: string };
if (fullScanAgain.statusCode !== 202 || !fullScanAgainData.taskId) {
  throw new Error(`full scan repeat failed: ${fullScanAgain.statusCode} ${fullScanAgain.body}`);
}
await waitForScanTask(app, fullScanAgainData.taskId, authHeader);
const historicalStillPresent = app.db.prepare("SELECT id FROM albums WHERE id = ?").get(historicalAlbumId) as { id: string } | undefined;
if (!historicalStillPresent) throw new Error("full scan should not delete historical records that were not found");

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

const roleOnlyUser = await app.inject({
  method: "POST",
  url: "/api/v2/users",
  headers: { cookie: authHeader },
  payload: { username: "roleonly", password: "roleonly123", role: "user" }
});
if (roleOnlyUser.statusCode !== 200) throw new Error(`roleonly create failed: ${roleOnlyUser.statusCode} ${roleOnlyUser.body}`);
const roleOnlyUpdate = await app.inject({
  method: "PATCH",
  url: "/api/v2/users/roleonly",
  headers: { cookie: authHeader },
  payload: { username: "roleonly", password: "", role: "admin" }
});
if (roleOnlyUpdate.statusCode !== 200 || JSON.parse(roleOnlyUpdate.body).data.role !== "admin") {
  throw new Error(`role-only user update failed: ${roleOnlyUpdate.statusCode} ${roleOnlyUpdate.body}`);
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
if (scan.statusCode !== 202 || !JSON.parse(scan.body).data.taskId) {
  throw new Error(`scan smoke failed: ${scan.statusCode} ${scan.body}`);
}
const scanTaskId = JSON.parse(scan.body).data.taskId;
const scanStatus = await waitForScanTask(app, scanTaskId, authHeader);
if (scanStatus.albumsDiscovered < 1) {
  throw new Error(`scan status smoke failed: ${JSON.stringify(scanStatus)}`);
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
const viewerCreateGallery = await app.inject({
  method: "POST",
  url: "/api/v2/galleries",
  headers: { cookie: userCookieHeader },
  payload: { name: "Viewer Gallery", path: path.join(tempDir, "viewer-gallery") }
});
if (viewerCreateGallery.statusCode !== 403) {
  throw new Error(`viewer create gallery should be 403, got ${viewerCreateGallery.statusCode} ${viewerCreateGallery.body}`);
}
const viewerSystemConfig = await app.inject({
  method: "PATCH",
  url: "/api/v2/system/config",
  headers: { cookie: userCookieHeader },
  payload: { preloadBefore: 1, preloadAfter: 1 }
});
if (viewerSystemConfig.statusCode !== 403) {
  throw new Error(`viewer system config should be 403, got ${viewerSystemConfig.statusCode} ${viewerSystemConfig.body}`);
}
const viewerScan = await app.inject({
  method: "POST",
  url: "/api/v2/scan",
  headers: { cookie: userCookieHeader },
  payload: { dryRun: true }
});
if (viewerScan.statusCode !== 403) {
  throw new Error(`viewer scan should be 403, got ${viewerScan.statusCode} ${viewerScan.body}`);
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

const invalidRarFile = path.join(tempDir, "invalid.rar");
fs.writeFileSync(invalidRarFile, "rar placeholder");
app.db
  .prepare(
    "INSERT INTO assets (id, album_id, name, extension, source_type, source_path, relative_path, zip_entry_path, sort_index, width, height, size_bytes, thumbnail_key, created_at, updated_at) VALUES (?, 'album-demo', ?, ?, 'archive', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  )
  .run(
    "asset-smoke-rar",
    "rar-image.jpg",
    "jpg",
    invalidRarFile,
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
const invalidRarOriginal = await app.inject({
  method: "GET",
  url: "/api/v2/assets/asset-smoke-rar/original",
  headers: { cookie: authHeader }
});
if (invalidRarOriginal.statusCode !== 415) {
  throw new Error(`invalid rar should be 415, got ${invalidRarOriginal.statusCode} ${invalidRarOriginal.body}`);
}
if (!invalidRarOriginal.body.includes("readable archive")) {
  throw new Error(`invalid rar should report unreadable archive: ${invalidRarOriginal.statusCode} ${invalidRarOriginal.body}`);
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
