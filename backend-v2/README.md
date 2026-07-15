# Moment Pic Backend V2

本目录是 Moment Pic 重建切片 1 的本地 v2 后端骨架。它是干净的新项目，不修改旧后端快照、不修改 Android 项目、不连接 Unraid。

## 技术栈

- Node.js 22+
- TypeScript
- Fastify
- SQLite：使用 Node 22 内置 `node:sqlite`

## 安装与运行

```bash
npm install
npm run typecheck
npm run smoke
npm run dev
```

生产构建：

```bash
npm run build
npm start
```

首次启动会自动执行 migration。管理员账号始终会在不存在时创建；默认开启 demo seed，便于本地接口验证。`MOMENTPIC_SEED_DEMO=false` 只关闭 demo 图库数据，不会关闭管理员初始化。

默认管理员账号：

- 用户名：`admin`
- 密码：`admin123`

本地正式使用前请设置 `MOMENTPIC_ADMIN_PASSWORD` 和 `MOMENTPIC_AUTH_SECRET`。
管理员密码环境变量仅用于首次创建该用户名；已有管理员不会在重启时被环境变量覆盖，避免覆盖通过用户管理界面修改的密码。

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | 监听地址 |
| `PORT` | `3000` | 监听端口 |
| `MOMENTPIC_DB_PATH` | `data/momentpic-v2.sqlite` | SQLite 数据库路径 |
| `MOMENTPIC_AUTH_SECRET` | 本地默认值 | cookie token HMAC 密钥 |
| `MOMENTPIC_ADMIN_USERNAME` | `admin` | seed 管理员用户名 |
| `MOMENTPIC_ADMIN_PASSWORD` | `admin123` | seed 管理员密码 |
| `MOMENTPIC_COOKIE_NAME` | `moment_pic_v2_auth` | 登录 cookie 名称 |
| `MOMENTPIC_COOKIE_TTL_SECONDS` | `86400` | 登录有效期 |
| `MOMENTPIC_SEED_DEMO` | `true` | 是否写入最小 demo 图库/相册/资源；不影响管理员初始化 |
| `MOMENTPIC_LEGACY_DB_PATH` | 无 | 旧 Moment Pic SQLite 路径，供 `npm run import:legacy` 使用 |
| `MOMENTPIC_PATH_PREFIX_MAP` | legacy 默认映射 | 文件读取接口的运行时路径前缀映射。未设置时内置 `/mnt/user/media/download/moment/` -> `/mnt/user/media/download/moment/download/`；设置为 `[]` 可关闭默认映射 |
| `MOMENTPIC_THUMBNAIL_CACHE_DIR` | `data/thumbnails` | 缩略图缓存目录 |
| `MOMENTPIC_THUMBNAIL_MAX_SIZE` | `640` | 缩略图最长边尺寸，运行时限制在 64 到 2048 之间 |
| `MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES` | `67108864` | archive/zip 单个 entry 最大读取大小，默认 64 MiB，最低 1 MiB；超限返回 413 |
| `MOMENTPIC_LIBRARY_ALLOWED_ROOTS` | `/mnt/user/media,/mnt/user/photos,/mnt/user/media/download` | 允许登记和扫描的服务端图库来源根，逗号分隔；危险路径如 `/`、`/mnt/user`、`/etc` 会被拒绝 |

## 接口列表

- `GET /api/v2/health`
- `POST /api/v2/auth/login`
- `POST /api/v2/auth/logout`
- `GET /api/v2/me`
- `GET /api/v2/system/status` / `PATCH /api/v2/system/config`
- `GET /api/v2/galleries` / `GET /api/v2/library-roots` / `POST /api/v2/galleries` / `PATCH /api/v2/galleries/:id` / `POST /api/v2/galleries/:id/scan`；列表默认 `library_roots.updated_at DESC`，最近更新的图库来源优先。
- `GET /api/v2/albums?galleryId=&page=&pageSize=&keyword=&sortBy=&sortOrder=`；默认 `sortBy=updatedAt&sortOrder=desc`，即最近下载/最近更新优先。当前 DB 没有独立 `downloaded_at` 字段，使用 `albums.updated_at` 作为下载/更新时间代理。
- `GET /api/v2/albums/:albumId`
- `GET /api/v2/albums/:albumId/assets?page=&pageSize=`；默认 `COALESCE(assets.source_mtime, assets.updated_at, assets.created_at) DESC`，即优先按文件 mtime 从最近到最远，缺失时回退资源更新时间/创建时间。
- `GET /api/v2/assets/:assetId`
- `GET /api/v2/assets/:assetId/thumbnail`
- `GET /api/v2/assets/:assetId/original`
- `GET /api/v2/users` / `POST /api/v2/users` / `POST|PATCH /api/v2/users/:username` / `DELETE /api/v2/users/:username`
- `GET|PUT /api/v2/favorite-albums` / `POST|DELETE /api/v2/favorite-albums/:albumId`
- `GET|PUT /api/v2/users/:username/shared-albums` / `PUT|DELETE /api/v2/users/:username/shared-albums/:albumId`
- `POST /api/v2/public-shares` / `DELETE /api/v2/public-shares/:token` / `GET /s/:token`
- `POST /api/v2/scan` / `GET /api/v2/scan/:taskId` / `GET /api/v2/scan`，scan 以后台任务执行，POST 立即返回 `taskId`
- `GET /api/v2/cache/thumbnails/status` / `POST /api/v2/cache/thumbnails/prune` / `POST /api/v2/cache/thumbnails/warmup`

除 health/login 外，`/api/v2/*` 需要登录 cookie。

内置 Web UI：

- `GET /` 返回单文件网页端，无 CDN、无独立前端构建链。
- 登录后支持图库/相册/图片浏览、按最近下载/最近更新优先排序、收藏状态显示、全部相册/我的收藏互斥过滤、收藏/取消收藏、相册/图片公开链接生成与复制。
- 相册主页每个 album card 有 `...` 操作菜单：下载到本地（当前没有相册 zip API，会明确提示不支持批量相册下载）、分享给普通账户、生成公开分享链接。
- 图片查看器的“图片操作”菜单支持下载原图、分享给普通账户、生成公开分享链接；普通账户授权沿用相册级 `shared_albums`，asset 公开链接沿用 public share token。
- 设置页参考旧版 Moment Pic 的设置面：系统、账户、分享、缓存、扫描、关于；管理员可管理用户、重置密码、设置 role，维护用户已分享相册列表，并按名称/ID 取消分享；普通用户只显示自身账号状态。
- 设置页系统面板使用 `GET /api/v2/system/status` 展示 backend URL、health、版本、当前用户、archive readiness、cache status、system_config 轮询/预加载和最近扫描摘要；管理员可用 `PATCH /api/v2/system/config` 修改前后各预加载图片数量，范围 `0-5`。该页面不会渲染 auth secret、密码 hash、DB 路径或媒体绝对路径。管理员可在同一区域添加、启用/禁用图库来源文件夹，提交的是后端/Unraid 服务端绝对路径，例如 `/mnt/user/photos`，不是浏览器本地目录。
- 设置页分享支持从“收藏相册最新 50 个”或关键词全库搜索结果中多选相册，支持全选当前结果/清空选择；中文输入使用 composition 保护，组合期间不触发搜索重渲染。
- 设置页扫描入口默认 `dryRun=true` 预览真实文件系统扫描；来源行扫描和设置页扫描会发送 `fast:false`，包含 archive 扫描。正式导入必须显式 `dryRun=false`，后端会先备份 SQLite 主文件和 WAL/SHM。禁用来源只修改系统记录，不删除磁盘真实图片。
- Web UI 行为边界见 [docs/WEB_UI.md](docs/WEB_UI.md)。

## 旧库导入

dry-run 只读取旧库并输出表计数和映射计划，不写入 v2 数据库：

```bash
npm run import:legacy -- --legacy-db /path/to/legacy.sqlite --dry-run
```

真实旧库 dry-run 前建议先跑本地校验流程。它会检查文件存在性、文件大小、SQLite `PRAGMA integrity_check`，然后复用导入器执行 dry-run summary，全程不写入 v2 数据库：

```bash
npm run verify:legacy -- --legacy-db data/legacy-real-dryrun.sqlite
```

Unraid 手动备份与本地校验步骤见 [docs/LEGACY_DB_VERIFICATION.md](docs/LEGACY_DB_VERIFICATION.md)。
Unraid 部署前环境变量、备份/回滚和重启后 smoke 清单见 [docs/UNRAID_DEPLOY_CHECKLIST.md](docs/UNRAID_DEPLOY_CHECKLIST.md)。

真实导入前建议先跑隔离测试库演练。默认把旧库导入到 `data/momentpic-v2-import-test.sqlite`，如果该测试库或 WAL/SHM sidecar 已存在，会先重命名为带时间戳的 `.bak`，不会删除：

```bash
npm run import:legacy:test -- --legacy-db data/legacy-real-dryrun.sqlite
```

演练会执行非 dry-run 导入，并校验：

- v2 `library_roots`、`albums`、`assets` 计数与旧库核心三表一致
- v2 `users` 只包含 seed admin，且没有旧库明文密码列/旧普通用户
- 目标库 `PRAGMA integrity_check` 为 `ok`
- 登录后 `/api/v2/galleries`、`/api/v2/albums`、album assets、asset detail 可查询

真实导入会先执行 v2 migration，再把旧库核心表 upsert 到 v2 本地 SQLite：

```bash
MOMENTPIC_DB_PATH=./data/momentpic-v2.sqlite npm run import:legacy -- --legacy-db /path/to/legacy.sqlite
```

正式写入主 v2 库前先执行主库导入 preflight。默认模式只读检查 legacy DB、目标 DB/sidecar、目录权限/空间、运行时环境变量和 archive 样本阻塞状态，不会写入目标 DB，也不会自动导入：

```bash
npm run preflight:main-import -- --legacy-db /path/to/legacy.sqlite --target-db ./data/momentpic-v2.sqlite
```

停写窗口内需要显式备份目标主库和 sidecar 时才运行：

```bash
npm run preflight:main-import -- --legacy-db /path/to/legacy.sqlite --target-db ./data/momentpic-v2.sqlite --backup-only
```

详细检查、备份、回滚和禁忌见 [docs/MAIN_IMPORT_PREFLIGHT.md](docs/MAIN_IMPORT_PREFLIGHT.md)。

也可以用环境变量：

```bash
MOMENTPIC_LEGACY_DB_PATH=/path/to/legacy.sqlite npm run import:legacy -- --dry-run
```

当前映射：

- `library_roots` -> v2 `library_roots`，API 对外称 galleries
- `albums` -> v2 `albums`
- `assets` -> v2 `assets`
- `users` -> v2 `users`，旧 `admin` 跳过以保留本地 seed 管理员；其他旧密码不复制，导入用户写入随机 scrypt hash 并标记 `password_reset_required=1`，需管理员重置密码
- `shared_albums` -> v2 `shared_albums`
- `favorite_albums` -> v2 `favorite_albums`，只迁移 `username + album_id` 关系，不复制旧 `album_json` 快照
- `public_shares` -> v2 `public_shares`，保留旧 token
- `thumbnails`、`system_config` 先只统计；缩略图缓存建议重建

旧库 `users.password` 不会写入 v2，避免复制明文密码。当前导入是 upsert，不删除 v2 中已经存在但旧库不存在的记录。

## 图片读取接口

`GET /api/v2/assets/:assetId/original` 对 `sourceType=folder` 的资源优先读取数据库原始 `sourcePath`，文件不存在时再按 `MOMENTPIC_PATH_PREFIX_MAP` 做运行时前缀映射并 stream 输出；仍不存在返回 404。数据库里的原始路径不会被改写，便于审计 legacy 导入来源。

对 `sourceType=zip`、`sourceType=archive`，或带 `zipEntryPath` 的资源，接口会把 `sourcePath` 解析为本地 archive 文件路径，同样先尝试原路径、再尝试路径前缀映射。entry 优先取 `zipEntryPath`，为空时回退 `relativePath`，再回退 `name`。zip/cbz 内置使用 yauzl lazy entries，读取原图优先 stream；7z/cb7 在系统存在 `7z`/`7zz`/`7za` 时用 `7z e -so` stream。PSD entry 会尝试提取内嵌 JPEG 后再交给原图/缩略图路径。

`GET /api/v2/assets/:assetId/thumbnail` 对 `sourceType=folder` 且可解析为本地图片文件的资源，会按最长边 `MOMENTPIC_THUMBNAIL_MAX_SIZE` 生成 JPEG 缩略图，并缓存到 `MOMENTPIC_THUMBNAIL_CACHE_DIR`。缓存 key 包含资源 ID、解析后的源路径、源文件大小、源文件 mtime 和目标尺寸；源文件或尺寸变化后会自动生成新的缓存文件。

archive 图片 entry 的 thumbnail 使用同一套 sharp 生成逻辑，但不会把 entry 解压写到任意路径，而是按单 entry 大小限制读入内存后交给 sharp。archive thumbnail 缓存 key 包含资源 ID、解析后的 archive 路径、archive 文件大小和 mtime、entry path、entry 未压缩大小、压缩大小、CRC 和目标尺寸，避免不同 archive 或不同 entry 混淆。

```text
X-MomentPic-Thumbnail-Cache: generated|hit|fallback
```

二次请求命中缓存时直接返回缓存文件。folder 缩略图生成失败时会安全回退原图并设置 `X-MomentPic-Thumbnail-Fallback: original`；非图片资源返回 415，并设置 `X-MomentPic-Thumbnail-Fallback: unsupported`。archive/zip 缩略图生成失败不会回退整包或解压文件，返回 415。

两个读取接口都会设置：

```text
X-MomentPic-Path-Mapped: true|false
```

Unraid legacy 默认映射等价于：

```bash
MOMENTPIC_PATH_PREFIX_MAP='[{"from":"/mnt/user/media/download/moment/","to":"/mnt/user/media/download/moment/download/"}]'
```

也支持简单格式：

```bash
MOMENTPIC_PATH_PREFIX_MAP='/old/prefix/=/new/prefix/'
```

缩略图缓存清理：停止服务后删除 `MOMENTPIC_THUMBNAIL_CACHE_DIR` 下的缓存文件即可；不要删除 SQLite 主库。缓存回滚：把 `MOMENTPIC_THUMBNAIL_CACHE_DIR` 指到新的空目录，或删除旧缓存目录后重启服务。路径映射回滚：设置 `MOMENTPIC_PATH_PREFIX_MAP='[]'` 并重启 v2 服务，数据库无需回滚。

部署建议：正式导入前先用少量 legacy `folder` 资源抽样确认原路径不存在、映射后路径存在；上线后观察读取接口的 404、`X-MomentPic-Path-Mapped` 和 `X-MomentPic-Thumbnail-Cache` 比例。

archive 当前识别 zip/cbz、rar/cbr、7z/cb7。zip/cbz 内置可读，并使用 `decodeStrings:false` 按 UTF-8 flag 解码文件名，非 UTF-8 名称会尝试 GBK 以兼容中文文件名；读取仍保持 lazy entries。7z/cb7 依赖系统 `7z`/`7zz`/`7za`，缺失时返回 501/readiness unavailable。rar/cbr 在当前构建没有 `node-unrar-js`，会 graceful 返回 501，不会崩溃。entry 路径会拒绝绝对路径、盘符路径、空 segment、`.`/`..` segment、目录 entry 和 `__MACOSX`，防止 path traversal；读取失败不会在响应里暴露系统路径。entry 不存在返回 404；entry 超过 `MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES` 返回 413；无效 archive 返回 415。可通过 `GET /api/v2/archive/readiness` 查看 zip、rar/cbr、7z/cb7 可用性。回滚 archive 读取能力需要回退本次代码或在导入前继续避免把 archive 资源暴露给读取入口；不需要修改 SQLite 数据。

rar/cbr 当前会在读取前返回 501，并在响应头 `X-MomentPic-Archive-Readiness` 与错误文案里提示 readiness。7z/cb7 如果部署环境有 `7z`/`7zz`/`7za` 则可读取和扫描；没有时同样 graceful unavailable。当前没有引入 V2 内置 rar JS 依赖；不要通过临时系统安装绕过部署流程。

## 用户、收藏与分享

- 用户管理 API 只允许管理员调用，新增/重置密码均写入 scrypt hash。
- 更新用户时密码可留空；留空只更新用户名/角色并保留原密码 hash，填写新密码才重置密码。
- legacy 用户导入不会复制旧明文密码；导入用户必须通过管理员 API 重置密码后才能作为正常账号使用。
- 非管理员只能访问 `shared_albums` 授权给自己的相册、资源和收藏相册。
- `GET /api/v2/favorite-albums` 与 Android 使用同一张 `favorite_albums` 关系表；Web 收藏过滤也读取该接口，确保两端收藏同步。
- 公开分享支持 token 创建/删除与 `/s/:token` HTML 访问页；asset token 可免登录读取 `/s/:token/original|thumbnail`，album token 可免登录读取 `/s/:token/assets/:assetId/original|thumbnail`，且仅限该 token 分享的资源范围。
- 管理员可用 `POST /api/v2/galleries` 登记新的服务端图库来源文件夹；`path` 必须是服务端绝对路径，并位于 `MOMENTPIC_LIBRARY_ALLOWED_ROOTS` 允许根内。
- 内置 Web UI 设置页也调用同一个 `POST /api/v2/galleries`；普通用户只显示权限提示，不能提交。

## 扫描与缓存生命周期

- 首页相册列表顶部提供“快速刷新”和“完整刷新”。快速刷新提交 `{ "dryRun": false, "fast": true }`，跳过 archive 深度解析，只刷新普通图片；完整刷新提交 `{ "dryRun": false, "fast": false }`，包含 zip/cbz、7z/cb7（有 7z 命令时）和 rar/cbr graceful skipped。两者都会写 SQLite 但不删除磁盘文件，也不删除 DB 中已存在但本次未发现的历史记录。
- `POST /api/v2/galleries/:id/scan` 支持真实文件系统扫描。默认 `dryRun=true` 创建后台预览任务；`dryRun=false` 创建后台正式导入任务。正式导入执行时会先备份 SQLite 主文件和 WAL/SHM 到 DB 同目录 `scan-backups/scan-*`，然后 upsert `albums`/`assets`。
- `POST /api/v2/scan` 仍兼容旧入口；POST 立即返回 `202`、`taskId` 和 `queued/running` 状态，前端或客户端轮询 `GET /api/v2/scan/:taskId` 查询 `completed/failed`。`GET /api/v2/scan` 会返回最近任务列表和 `latestActive`，Web UI 页面刷新后会恢复 queued/running task 轮询。默认 `dryRun=true`，显式 `dryRun=false` 才写库；默认 `fast=true`，显式 `fast:false` 才扫描 archive。不带 `galleryId` 时扫描所有已启用图库来源，带 `galleryId` 时只扫描对应来源。运行中阶段写入 `progressPhase`（`walking`/`folders`/`archives`/`writing`），不会写入 `error`；`error` 仅表示真实失败或部分来源错误。旧数据里的 `error='phase:*'` 会兼容映射为 `progressPhase`，不会作为真实错误返回。单个来源不可读或未挂载会进入 task `error`，不会阻断其他来源。
- 扫描是增量写入：已存在的普通文件在 `source_path`、`relative_path`、`zip_entry_path`、`sort_index`、`size_bytes`、`source_mtime` 未变化时跳过图片 metadata 读取和 asset upsert；zip/cbz entry 按 archive 路径、entry path、排序、entry size、archive mtime 判断未变化并跳过 upsert；album 在 `source_path`、`source_mtime`、`assets_fingerprint`、`asset_count` 都未变化时跳过 album upsert。task DTO 返回 `unchangedAlbums`、`unchangedAssets` 和 `skippedFiles`。
- 扫描规则：root 本身和任意层级子目录只要直接包含图片就作为相册；支持 jpg/jpeg/png/webp/gif/bmp/avif/heic/heif 普通图片文件；完整扫描会把 archive 作为独立相册导入，entry 写入 `assets.zip_entry_path` 并可通过 archive 原图/缩略图接口读取。archive 中 root 图片和 nested 图片同时存在时，会按总 size 选择更像主体图片的一组，忽略目录、非图片、加密 entry 和 `__MACOSX`。
- 缩略图缓存 status/prune 只作用于 `MOMENTPIC_THUMBNAIL_CACHE_DIR` 下 `.jpg` 缓存文件，不会删除原图或 SQLite。
- warmup 默认 `dryRun=true`，支持 `scope=covers|assets`、`albumId`、`assetIds` 和单次最多 100 个候选；`dryRun=false` 时同步小批量生成或命中缩略图，并返回 generated/hit/missing/failed 等计数。

真实 archive 样本本地抽样检查：

```bash
npm run check:archive-samples -- --limit 20 --top 8
```

该命令只读打开 legacy/imported SQLite，汇总 zip/archive 资产字段，并用同一套运行时路径映射尝试读取少量 zip entry。若本机没有真实媒体挂载，会输出 blocked summary 并以 0 退出。当前本机检查结果见 [docs/ARCHIVE_SAMPLES.md](docs/ARCHIVE_SAMPLES.md)。

## 当前切片范围

已实现：

- v2 schema migration
- demo seed
- Node `crypto.scrypt` 密码 hash
- HMAC cookie token 登录态
- 图库、相册、资源的最小查询 API
- legacy SQLite dry-run/导入脚本
- folder 资源 original 文件输出
- folder 图片资源 thumbnail 生成与本地缓存
- zip/archive 图片资源 original 文件输出
- zip/archive 图片资源 thumbnail 生成与本地缓存
- 用户 CRUD/密码重置 API，legacy 用户安全导入为 reset-required
- 收藏相册 API 与 legacy favorite_albums 关系导入
- 用户-相册分享授权 API 与非管理员访问限制
- 公开分享 token API、`/s/:token` HTML 访问页和 token-scoped 公开图片二进制读取
- scan 后台任务、快速/完整刷新、active task 恢复、分批 upsert
- thumbnail cache status/prune/warmup 小批量执行
- zip/cbz archive 读取，7z/cb7 系统命令读取，rar/cbr graceful 501
- Fastify inject smoke 脚本

未实现：

- 缩略图后台预热任务
- rar/cbr 内置 `node-unrar-js` 真解压读取

旧库迁移入口：

```bash
npm run import:legacy -- --legacy-db /path/to/legacy.sqlite --dry-run
```
