# Moment Pic API V2

统一响应格式：

```json
{ "code": 0, "message": "ok", "data": {} }
```

错误响应：

```json
{ "code": 4010, "message": "unauthorized" }
```

## Auth

### `POST /api/v2/auth/login`

请求：

```json
{ "username": "admin", "password": "change-me-admin-password" }
```

成功时设置 `moment_pic_v2_auth` cookie，并返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "username": "admin",
    "role": "admin",
    "expiresAt": "2026-06-08T10:00:00.000Z"
  }
}
```

### `POST /api/v2/auth/logout`

需要登录。清除登录 cookie。

### `GET /api/v2/me`

需要登录。返回当前用户：

```json
{ "code": 0, "message": "ok", "data": { "user": { "username": "admin", "role": "admin" } } }
```

## Health

### `GET /api/v2/health`

不需要登录。

```json
{ "code": 0, "message": "ok", "data": { "status": "ok", "version": "v2" } }
```

## System

### `GET /api/v2/system/status`

需要登录。返回 backend URL、当前用户、系统配置、图库计数、archive/cache 状态和最近 scan task 摘要。

### `PATCH /api/v2/system/config`

需要管理员登录。当前用于更新 Web UI 图片查看器预加载数量，并持久化到 `system_config`。

请求：

```json
{ "preloadBefore": 2, "preloadAfter": 3 }
```

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "enablePolling": true,
    "pollingInterval": 60000,
    "preloadBefore": 2,
    "preloadAfter": 3,
    "updatedAt": "2026-06-08T10:00:00.000Z"
  }
}
```

限制：

- `preloadBefore` 和 `preloadAfter` 必须都是 `0-5` 的整数。
- 普通用户返回 `403`，越界或非整数返回 `400`。

## Galleries

### `GET /api/v2/galleries`

需要登录。返回图库根列表：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": "gallery-demo",
        "name": "Demo Gallery",
        "path": "/demo/moment-pic",
        "enabled": true,
        "albumCount": 1,
        "lastScannedAt": "2026-06-07T10:00:00.000Z",
        "createdAt": "2026-06-07T10:00:00.000Z",
        "updatedAt": "2026-06-07T10:00:00.000Z"
      }
    ]
  }
}
```

`GET /api/v2/library-roots` 是兼容别名，返回同样结构。

### `POST /api/v2/galleries`

需要管理员登录。新增一个服务端图库来源文件夹，只登记 `library_roots` 记录；默认不扫描、不写入相册或资源表。内置 Web UI 设置页的“添加图库来源文件夹”也调用这个接口。

请求：

```json
{ "name": "Unraid Photos", "path": "/srv/momentpic/photos" }
```

响应：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "created": true,
    "item": {
      "id": "photos",
      "name": "Unraid Photos",
      "path": "/srv/momentpic/photos",
      "enabled": true,
      "albumCount": 0,
      "lastScannedAt": null,
      "createdAt": "2026-06-08T10:00:00.000Z",
      "updatedAt": "2026-06-08T10:00:00.000Z"
    },
    "scan": {
      "dryRunAvailable": true,
      "message": "Library root was registered only..."
    }
  }
}
```

限制：

- `path` 必须是后端/Unraid 服务端绝对路径，例如 `/srv/momentpic/photos`，不是浏览器本地目录。
- 默认允许根由 `MOMENTPIC_LIBRARY_ALLOWED_ROOTS` 控制；危险路径如 `/`、`/mnt`、`/srv/momentpic/media-root`、`/srv/momentpic/appdata`、`/etc`、`/root`、`/usr`、`/var`、`/proc`、`/sys`、`/dev` 会被拒绝。
- 新增只登记来源，不扫描/导入媒体。重复路径返回 `409`，相对路径/URL/危险路径返回 `400`，普通用户返回 `403`。

### `PATCH /api/v2/galleries/:id`

需要管理员登录。更新来源名称或启用状态：

```json
{ "name": "Family Photos", "enabled": false }
```

禁用来源只修改系统记录，不删除磁盘真实图片，也不删除已有 albums/assets。

### `POST /api/v2/galleries/:id/scan`

需要管理员登录。扫描一个已启用图库来源。默认 dry-run：

```json
{ "dryRun": true }
```

响应包含 `discovered`、`changes`、`samples`；dry-run 不写 `albums`/`assets`。

正式导入必须显式传：

```json
{ "dryRun": false }
```

正式导入前会备份 SQLite 主文件和 WAL/SHM 到 DB 同目录 `scan-backups/scan-*`，再 upsert `albums`/`assets` 并更新 `lastScannedAt`。不会删除磁盘文件，也不会删除 DB 中本次未发现的历史记录。

扫描规则第一版：

- root 本身如果含图片则作为一个相册。
- root 的直接子目录各作为一个相册。
- 支持普通图片文件：jpg/jpeg/png/webp/gif/bmp/avif/heic/heif。
- zip/cbz 读取能力保持兼容；真实扫描导入第一版不主动导入 zip/cbz。

## Albums

### `GET /api/v2/albums`

查询参数：

| 参数 | 说明 |
| --- | --- |
| `galleryId` | 按图库过滤 |
| `page` | 页码，默认 1 |
| `pageSize` | 每页数量，默认 24，最大 100 |
| `keyword` | 按相册名模糊搜索 |
| `sortBy` | `name`、`createdAt`、`updatedAt`、`assetCount` |
| `sortOrder` | `asc` 或 `desc` |

返回：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [],
    "pagination": { "page": 1, "pageSize": 24, "total": 0, "totalPages": 0 }
  }
}
```

### `GET /api/v2/albums/:albumId`

返回单个相册。

### `GET /api/v2/albums/:albumId/assets`

查询参数：

| 参数 | 说明 |
| --- | --- |
| `page` | 页码，默认 1 |
| `pageSize` | 每页数量，默认 120，最大 300 |

返回相册资源分页。

## Assets

### `GET /api/v2/assets/:assetId`

返回单个资源元数据。

### `GET /api/v2/assets/:assetId/original`

需要登录。对 `sourceType=folder` 的资源，先读取数据库原始 `sourcePath` 指向的本地文件；原路径不可读时，再按运行时路径前缀映射尝试读取。数据库原始路径不会被接口改写。

对 `sourceType=zip`、`sourceType=archive` 且本地文件是 zip/cbz，或带 `zipEntryPath` 的资源，接口把 `sourcePath` 当作本地 zip 文件路径解析，同样应用路径前缀映射。zip entry 选择顺序为 `zipEntryPath`、`relativePath`、`name`。

响应：

- `200`：文件存在，返回图片二进制；`Content-Type` 按扩展名做最小映射，不识别时为 `application/octet-stream`；`X-MomentPic-Path-Mapped` 表示是否使用了映射后的路径
- `404`：资源不存在、`sourcePath` 不存在/不是文件，或 zip entry 不存在
- `413`：zip entry 超过 `MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES`
- `415`：本地文件不是可读取 zip，或 entry 加密/压缩方式不支持
- `501`：非 zip archive 格式尚未实现

响应头：

```text
X-MomentPic-Path-Mapped: true|false
```

archive 错误示例：

```json
{ "code": 4003, "message": "asset archive entry not found" }
```

rar/cbr/7z/cb7 当前返回 501，响应头会带 `X-MomentPic-Archive-Readiness`：

```json
{ "code": 5010, "message": "archive format unavailable; zip/cbz is built in, rar/cbr/7z/cb7 need one of: 7z, 7zz, 7za, unrar, bsdtar, unar" }
```

### `GET /api/v2/assets/:assetId/thumbnail`

需要登录。对 `sourceType=folder` 且可解析为本地图片文件的资源，生成并缓存最长边不超过 `MOMENTPIC_THUMBNAIL_MAX_SIZE` 的 JPEG 缩略图。源文件路径解析逻辑与 `/original` 一致，仍保留 `X-MomentPic-Path-Mapped`。

对 zip/archive 图片 entry，接口会按 `/original` 的 archive 解析规则读取单个 entry，并把 entry buffer 交给 sharp 生成 JPEG 缩略图。entry 不会被解压写入磁盘。缓存 key 包含 archive 路径/mtime/size、entry path、entry size/compressed size/CRC 和 `MOMENTPIC_THUMBNAIL_MAX_SIZE`。

```text
X-MomentPic-Path-Mapped: true|false
X-MomentPic-Thumbnail-Cache: generated|hit|fallback
```

响应：

- `200`：返回缩略图 JPEG；缓存命中时 `X-MomentPic-Thumbnail-Cache: hit`，首次生成时为 `generated`
- `200` + `X-MomentPic-Thumbnail-Cache: fallback`：图片解码/生成失败时回退原图，并设置 `X-MomentPic-Thumbnail-Fallback: original`
- `415`：非图片资源不生成缩略图，并设置 `X-MomentPic-Thumbnail-Fallback: unsupported`
- `404`：资源不存在，或 `sourcePath` 不存在/不是文件
- `413`：zip entry 超过 `MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES`
- `415`：本地文件不是可读取 zip、entry 不支持，或 archive entry 图片解码失败
- `501`：非 zip archive 格式尚未实现

安全限制：

- zip entry 路径拒绝绝对路径、盘符路径、空 segment、`.`/`..` segment 和目录 entry。
- 单 entry 默认最大读取 64 MiB，可用 `MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES` 调整。
- archive/zip 错误响应不会包含本机系统路径。

## Users

管理员接口。密码只接受明文输入并在服务端写入 scrypt hash；不会返回 hash。

- `GET /api/v2/users`
- `POST /api/v2/users` body: `{ "username": "user1", "password": "123456", "role": "user" }`
- `PATCH /api/v2/users/:username` body: `{ "username": "user2", "password": "newpass", "role": "user" }`
- `POST /api/v2/users/:username` 同 PATCH，用于 Android 兼容
- `DELETE /api/v2/users/:username`
- `POST /api/v2/users/:username/delete`

返回用户字段：

```json
{ "username": "user1", "role": "user", "passwordResetRequired": false, "createdAt": "...", "updatedAt": "..." }
```

legacy 导入用户会返回 `passwordResetRequired: true`，需要管理员重置密码后才能正常使用。

## Favorites

当前实现收藏相册关系。

- `GET /api/v2/favorite-albums`
- `PUT /api/v2/favorite-albums` body: `{ "items": [{ "id": "album-id" }] }`
- `POST /api/v2/favorite-albums/:albumId`
- `DELETE /api/v2/favorite-albums/:albumId`

非管理员只能收藏和读取已分享给自己的相册。

## Shared Albums

管理员接口。

- `GET /api/v2/users/:username/shared-albums`
- `PUT /api/v2/users/:username/shared-albums` body: `{ "albumIds": ["album-id"] }`
- `PUT /api/v2/users/:username/shared-albums/:albumId` body: `{ "shared": true }`
- `DELETE /api/v2/users/:username/shared-albums/:albumId`

非管理员访问 `GET /api/v2/albums`、相册详情、资源详情、original、thumbnail 时，会被限制在授权相册内。

## Public Shares

- `POST /api/v2/public-shares` body: `{ "type": "album", "targetId": "album-id" }`
- `DELETE /api/v2/public-shares/:token`
- `GET /s/:token` 公开 HTML 访问页，不需要 cookie
- `GET /s/:token/original`
- `GET /s/:token/thumbnail`
- `GET /s/:token/assets/:assetId/original`
- `GET /s/:token/assets/:assetId/thumbnail`

`type` 支持 `album`、`asset`。asset token 只能读取自己的 original/thumbnail；album token 只能读取该相册内资源的 original/thumbnail。公开二进制读取不需要 cookie，但不能绕过 token 范围读取未分享资源。

## Scan

- `POST /api/v2/scan` body: `{ "dryRun": true, "galleryId": "optional-gallery-id" }`
- `GET /api/v2/scan/:taskId`
- `GET /api/v2/scan`

普通用户返回 `403`。无 `galleryId` 且 `dryRun=true` 时保留旧行为：返回 DB 内已知 albums/assets 计数并记录 task。带 `galleryId` 时转到真实图库来源扫描；`dryRun=false` 要求提供 `galleryId`。

## Thumbnail Cache

- `GET /api/v2/cache/thumbnails/status`
- `POST /api/v2/cache/thumbnails/prune` body: `{ "dryRun": true, "olderThanDays": 30, "maxFiles": 10000 }`
- `POST /api/v2/cache/thumbnails/warmup` body: `{ "dryRun": true, "scope": "covers", "limit": 50 }`
- `GET /api/v2/archive/readiness`

prune 只处理 `MOMENTPIC_THUMBNAIL_CACHE_DIR` 下 `.jpg` 缓存文件，不删除原图或 SQLite。warmup 默认 `dryRun=true`，单次 `limit` 上限 100；支持 `scope=covers|assets`、`albumId` 和 `assetIds`。`dryRun=false` 时同步小批量生成或命中缩略图，并返回 `processed/generated/hit/missing/failed/errors` 等计数。
