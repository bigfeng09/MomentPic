import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { ZipFile } from "yazl";
import { buildApp } from "../src/app.js";

const writeZipFile = async (zipPath: string, entries: Array<{ entryPath: string; buffer: Buffer }>): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const zipFile = new ZipFile();
    const output = fs.createWriteStream(zipPath);
    output.once("close", resolve);
    output.once("error", reject);
    zipFile.outputStream.once("error", reject);
    zipFile.outputStream.pipe(output);
    for (const entry of entries) zipFile.addBuffer(entry.buffer, entry.entryPath);
    zipFile.end();
  });
};

const imageBuffer = async (background: { r: number; g: number; b: number }): Promise<Buffer> =>
  sharp({ create: { width: 24, height: 16, channels: 3, background } }).png().toBuffer();

const waitForScanTask = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  cookie: string,
  taskId: string
): Promise<{
  status: string;
  dryRun: boolean;
  albumsDiscovered: number;
  assetsDiscovered: number;
  skippedFiles: number;
  unchangedAlbums: number;
  unchangedAssets: number;
  error?: string | null;
}> => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const health = await app.inject({ method: "GET", url: "/api/v2/health" });
    if (health.statusCode !== 200) throw new Error(`health blocked during scan: ${health.statusCode} ${health.body}`);
    const status = await app.inject({ method: "GET", url: `/api/v2/scan/${taskId}`, headers: { cookie } });
    if (status.statusCode !== 200) throw new Error(`scan status failed: ${status.statusCode} ${status.body}`);
    const data = JSON.parse(status.body).data as {
      status: string;
      dryRun: boolean;
      albumsDiscovered: number;
      assetsDiscovered: number;
      skippedFiles: number;
      unchangedAlbums: number;
      unchangedAssets: number;
      error?: string | null;
    };
    if (data.status === "completed") return data;
    if (data.status === "failed") throw new Error(`scan task failed: ${status.body}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`scan task did not finish: ${taskId}`);
};

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "momentpic-scan-import-"));
const libraryPath = path.join(tempDir, "library");
fs.mkdirSync(path.join(libraryPath, "nested", "album-a"), { recursive: true });

await sharp({ create: { width: 30, height: 20, channels: 3, background: { r: 180, g: 40, b: 80 } } })
  .jpeg()
  .toFile(path.join(libraryPath, "nested", "album-a", "page-001.jpg"));
await writeZipFile(path.join(libraryPath, "archive-album.cbz"), [
  { entryPath: "001.png", buffer: await imageBuffer({ r: 20, g: 160, b: 120 }) },
  { entryPath: "002.png", buffer: await imageBuffer({ r: 90, g: 120, b: 220 }) }
]);

const app = await buildApp({
  dbPath: path.join(tempDir, "scan-test.sqlite"),
  authSecret: "scan-test-secret",
  adminPassword: "scan-test-password",
  seedDemoData: true,
  thumbnailCacheDir: path.join(tempDir, "thumbnails"),
  libraryRootAllowedPrefixes: [tempDir, "/demo"]
});

try {
  const login = await app.inject({
    method: "POST",
    url: "/api/v2/auth/login",
    payload: { username: "admin", password: "scan-test-password" }
  });
  if (login.statusCode !== 200) throw new Error(`login failed: ${login.statusCode} ${login.body}`);
  const setCookie = login.headers["set-cookie"];
  const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie)?.split(";")[0] ?? "";
  if (!cookie) throw new Error("login did not return auth cookie");

  const createGallery = await app.inject({
    method: "POST",
    url: "/api/v2/galleries",
    headers: { cookie },
    payload: { name: "Scan Import Test", path: libraryPath }
  });
  const createGalleryData = JSON.parse(createGallery.body).data as { item?: { id: string } };
  const galleryId = createGalleryData.item?.id;
  if (createGallery.statusCode !== 200 || !galleryId) throw new Error(`create gallery failed: ${createGallery.statusCode} ${createGallery.body}`);

  const dryRun = await app.inject({
    method: "POST",
    url: "/api/v2/scan",
    headers: { cookie },
    payload: { dryRun: true, fast: false, galleryId }
  });
  const dryRunData = JSON.parse(dryRun.body).data as { taskId?: string; status?: string; dryRun?: boolean };
  if (dryRun.statusCode !== 202 || dryRunData.dryRun !== true || !dryRunData.taskId || !["queued", "running"].includes(String(dryRunData.status))) {
    throw new Error(`scan dry-run failed: ${dryRun.statusCode} ${dryRun.body}`);
  }
  const dryRunTask = await waitForScanTask(app, cookie, dryRunData.taskId);
  if (dryRunTask.dryRun !== true || dryRunTask.albumsDiscovered !== 2 || dryRunTask.assetsDiscovered !== 3) {
    throw new Error(`scan dry-run task result failed: ${JSON.stringify(dryRunTask)}`);
  }

  await sharp({ create: { width: 26, height: 18, channels: 3, background: { r: 40, g: 80, b: 180 } } })
    .jpeg()
    .toFile(path.join(libraryPath, "nested", "album-a", "page-002.jpg"));
  const run = await app.inject({
    method: "POST",
    url: "/api/v2/scan",
    headers: { cookie },
    payload: { dryRun: false, fast: false, galleryId }
  });
  const runData = JSON.parse(run.body).data as { taskId?: string; status?: string; dryRun?: boolean };
  if (run.statusCode !== 202 || runData.dryRun !== false || !runData.taskId || !["queued", "running"].includes(String(runData.status))) {
    throw new Error(`scan import failed: ${run.statusCode} ${run.body}`);
  }
  const runTask = await waitForScanTask(app, cookie, runData.taskId);
  if (runTask.dryRun !== false || runTask.albumsDiscovered !== 2 || runTask.assetsDiscovered !== 4) {
    throw new Error(`scan import task result failed: ${JSON.stringify(runTask)}`);
  }

  const unchangedRun = await app.inject({
    method: "POST",
    url: "/api/v2/scan",
    headers: { cookie },
    payload: { dryRun: false, fast: false, galleryId }
  });
  const unchangedRunData = JSON.parse(unchangedRun.body).data as { taskId?: string; status?: string; dryRun?: boolean };
  if (
    unchangedRun.statusCode !== 202 ||
    unchangedRunData.dryRun !== false ||
    !unchangedRunData.taskId ||
    !["queued", "running"].includes(String(unchangedRunData.status))
  ) {
    throw new Error(`unchanged scan import failed: ${unchangedRun.statusCode} ${unchangedRun.body}`);
  }
  const unchangedRunTask = await waitForScanTask(app, cookie, unchangedRunData.taskId);
  if (
    unchangedRunTask.dryRun !== false ||
    unchangedRunTask.albumsDiscovered !== 2 ||
    unchangedRunTask.assetsDiscovered !== 4 ||
    unchangedRunTask.unchangedAlbums !== 2 ||
    unchangedRunTask.unchangedAssets !== 4 ||
    unchangedRunTask.skippedFiles !== 0
  ) {
    throw new Error(`unchanged scan task result failed: ${JSON.stringify(unchangedRunTask)}`);
  }

  fs.mkdirSync(path.join(libraryPath, "nested", "album-b"), { recursive: true });
  await sharp({ create: { width: 28, height: 18, channels: 3, background: { r: 160, g: 120, b: 40 } } })
    .jpeg()
    .toFile(path.join(libraryPath, "nested", "album-b", "page-001.jpg"));
  const incrementalRun = await app.inject({
    method: "POST",
    url: "/api/v2/scan",
    headers: { cookie },
    payload: { dryRun: false, fast: true, galleryId }
  });
  const incrementalRunData = JSON.parse(incrementalRun.body).data as { taskId?: string; status?: string; dryRun?: boolean };
  if (
    incrementalRun.statusCode !== 202 ||
    incrementalRunData.dryRun !== false ||
    !incrementalRunData.taskId ||
    !["queued", "running"].includes(String(incrementalRunData.status))
  ) {
    throw new Error(`incremental scan import failed: ${incrementalRun.statusCode} ${incrementalRun.body}`);
  }
  const incrementalRunTask = await waitForScanTask(app, cookie, incrementalRunData.taskId);
  if (
    incrementalRunTask.dryRun !== false ||
    incrementalRunTask.albumsDiscovered !== 1 ||
    incrementalRunTask.assetsDiscovered !== 1 ||
    incrementalRunTask.unchangedAlbums !== 0 ||
    incrementalRunTask.unchangedAssets !== 0 ||
    incrementalRunTask.skippedFiles !== 0
  ) {
    throw new Error(`incremental new-folder scan task result failed: ${JSON.stringify(incrementalRunTask)}`);
  }

  await writeZipFile(path.join(libraryPath, "new-archive-album.cbz"), [
    { entryPath: "001.png", buffer: await imageBuffer({ r: 220, g: 80, b: 40 }) },
    { entryPath: "002.png", buffer: await imageBuffer({ r: 40, g: 180, b: 220 }) }
  ]);
  const incrementalArchiveRun = await app.inject({
    method: "POST",
    url: "/api/v2/scan",
    headers: { cookie },
    payload: { dryRun: false, fast: true, galleryId }
  });
  const incrementalArchiveRunData = JSON.parse(incrementalArchiveRun.body).data as { taskId?: string; status?: string; dryRun?: boolean };
  if (
    incrementalArchiveRun.statusCode !== 202 ||
    incrementalArchiveRunData.dryRun !== false ||
    !incrementalArchiveRunData.taskId ||
    !["queued", "running"].includes(String(incrementalArchiveRunData.status))
  ) {
    throw new Error(`incremental archive scan import failed: ${incrementalArchiveRun.statusCode} ${incrementalArchiveRun.body}`);
  }
  const incrementalArchiveRunTask = await waitForScanTask(app, cookie, incrementalArchiveRunData.taskId);
  if (
    incrementalArchiveRunTask.dryRun !== false ||
    incrementalArchiveRunTask.albumsDiscovered !== 1 ||
    incrementalArchiveRunTask.assetsDiscovered !== 2 ||
    incrementalArchiveRunTask.unchangedAlbums !== 0 ||
    incrementalArchiveRunTask.unchangedAssets !== 0 ||
    incrementalArchiveRunTask.skippedFiles !== 0
  ) {
    throw new Error(`incremental new-archive scan task result failed: ${JSON.stringify(incrementalArchiveRunTask)}`);
  }

  const fullRunAfterNewAlbum = await app.inject({
    method: "POST",
    url: "/api/v2/scan",
    headers: { cookie },
    payload: { dryRun: false, fast: false, galleryId }
  });
  const fullRunAfterNewAlbumData = JSON.parse(fullRunAfterNewAlbum.body).data as { taskId?: string; status?: string; dryRun?: boolean };
  if (
    fullRunAfterNewAlbum.statusCode !== 202 ||
    fullRunAfterNewAlbumData.dryRun !== false ||
    !fullRunAfterNewAlbumData.taskId ||
    !["queued", "running"].includes(String(fullRunAfterNewAlbumData.status))
  ) {
    throw new Error(`full scan after new album failed: ${fullRunAfterNewAlbum.statusCode} ${fullRunAfterNewAlbum.body}`);
  }
  const fullRunAfterNewAlbumTask = await waitForScanTask(app, cookie, fullRunAfterNewAlbumData.taskId);
  if (fullRunAfterNewAlbumTask.dryRun !== false || fullRunAfterNewAlbumTask.albumsDiscovered !== 4 || fullRunAfterNewAlbumTask.assetsDiscovered !== 7) {
    throw new Error(`full scan after new album task result failed: ${JSON.stringify(fullRunAfterNewAlbumTask)}`);
  }

  const albums = await app.inject({
    method: "GET",
    url: `/api/v2/albums?galleryId=${encodeURIComponent(galleryId)}&page=1&pageSize=10`,
    headers: { cookie }
  });
  const albumItems = JSON.parse(albums.body).data.items as Array<{ id: string; name: string; sourceType: string; assetCount: number }>;
  if (albums.statusCode !== 200 || albumItems.length !== 4) throw new Error(`albums list failed: ${albums.statusCode} ${albums.body}`);
  const folderAlbum = albumItems.find((album) => album.name === "album-a" && album.sourceType === "folder" && album.assetCount === 2);
  const zipAlbum = albumItems.find((album) => album.name === "archive-album" && album.sourceType === "zip" && album.assetCount === 2);
  const newFolderAlbum = albumItems.find((album) => album.name === "album-b" && album.sourceType === "folder" && album.assetCount === 1);
  const newZipAlbum = albumItems.find((album) => album.name === "new-archive-album" && album.sourceType === "zip" && album.assetCount === 2);
  if (!folderAlbum || folderAlbum.assetCount !== 2 || !zipAlbum || !newFolderAlbum || !newZipAlbum) {
    throw new Error(`expected existing and incremental folder/zip albums, got ${JSON.stringify(albumItems)}`);
  }

  const zipAssets = await app.inject({
    method: "GET",
    url: `/api/v2/albums/${encodeURIComponent(zipAlbum.id)}/assets?page=1&pageSize=10`,
    headers: { cookie }
  });
  const zipAssetItems = JSON.parse(zipAssets.body).data.items as Array<{ sourceType: string; sourcePath: string; zipEntryPath: string | null }>;
  if (
    zipAssets.statusCode !== 200 ||
    zipAssetItems.length !== 2 ||
    zipAssetItems.some((asset) => asset.sourceType !== "zip" || asset.sourcePath !== path.join(libraryPath, "archive-album.cbz") || !asset.zipEntryPath)
  ) {
    throw new Error(`zip assets failed: ${zipAssets.statusCode} ${zipAssets.body}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        galleryId,
        albums: albumItems.length,
        assets: albumItems.reduce((sum, album) => sum + album.assetCount, 0),
        zipEntries: zipAssetItems.map((asset) => asset.zipEntryPath),
        unchanged: {
          albums: unchangedRunTask.unchangedAlbums,
          assets: unchangedRunTask.unchangedAssets
        },
        incrementalNewFolder: {
          albums: incrementalRunTask.albumsDiscovered,
          assets: incrementalRunTask.assetsDiscovered
        },
        incrementalNewArchive: {
          albums: incrementalArchiveRunTask.albumsDiscovered,
          assets: incrementalArchiveRunTask.assetsDiscovered
        }
      },
      null,
      2
    )
  );
} finally {
  await app.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
}
