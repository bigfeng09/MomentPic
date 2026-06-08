# Migration Notes

切片 2 已提供 legacy SQLite dry-run 和核心表导入能力。导入只读取旧库，写入 v2 本地 SQLite；不连接 Unraid、不改旧容器。

## 旧库参考

旧快照 `schema.sql` 包含：

- `library_roots`
- `albums`
- `assets`
- `thumbnails`
- `system_config`
- `users`
- `shared_albums`
- `favorite_albums`
- `public_shares`

v2 当前保留核心结构，字段命名尽量接近旧库。API 层把 `library_roots` 对外称为 galleries。

## 导入命令

dry-run：

```bash
npm run import:legacy -- --legacy-db /path/to/legacy.sqlite --dry-run
```

真实导入：

```bash
MOMENTPIC_DB_PATH=/path/to/momentpic-v2.sqlite npm run import:legacy -- --legacy-db /path/to/legacy.sqlite
```

`--legacy-db` 可用 `MOMENTPIC_LEGACY_DB_PATH` 替代。dry-run 输出旧表计数和映射计划，不创建/写入 v2 DB。非 dry-run 会执行 v2 migration，然后 upsert：

- `library_roots` -> v2 `library_roots`
- `albums` -> v2 `albums`
- `assets` -> v2 `assets`
- `users` -> v2 `users`，旧 `admin` 跳过以保留本地 seed 管理员；其他旧密码不复制，写入随机 scrypt hash 并标记 `password_reset_required=1`
- `shared_albums` -> v2 `shared_albums`
- `favorite_albums` -> v2 `favorite_albums`，只迁移关系，不复制旧 `album_json`
- `public_shares` -> v2 `public_shares`，保留 token

当前不会删除 v2 中已经存在但旧库不存在的记录，因此更接近“导入/覆盖同步”，不是严格镜像同步。

## 可回滚隔离演练

真实写入主 v2 库前，先在隔离目标库执行非 dry-run 演练：

```bash
npm run import:legacy:test -- --legacy-db data/legacy-real-dryrun.sqlite
```

默认目标库是 `data/momentpic-v2-import-test.sqlite`。如果目标库或对应 `-wal`、`-shm` 已存在，脚本会先移动为带时间戳的 `.bak` 文件，不删除旧演练结果。也可以显式指定目标：

```bash
npm run import:legacy:test -- --legacy-db /path/to/legacy.sqlite --target-db data/momentpic-v2-import-test.sqlite
```

演练流程：

1. 备份已有隔离目标库。
2. 对目标库执行真实导入，写入 `library_roots`、`albums`、`assets`、`users`、`shared_albums`、`favorite_albums`、`public_shares`。
3. 写入 seed admin 用户用于 API smoke；不写入 demo 图库/相册/资源，避免污染核心三表计数。
4. 校验 v2 核心三表计数等于旧库计数。
5. 校验 v2 `users` 使用 `password_hash`，没有旧明文 `password` 列；旧用户若导入，会带 `password_reset_required=1`。
6. 执行 `PRAGMA integrity_check` 和登录后的 galleries/albums/assets API 抽样。

回滚方式：

- 隔离演练失败或需要重跑时，保留失败库用于排查；再次执行脚本会把现有测试库移动为新的 `.bak`。
- 主 v2 库真实导入前必须先停写并备份目标 SQLite 主文件及 `-wal`、`-shm` sidecar。
- 若主 v2 导入后需要回滚，停止服务后用导入前备份替换主文件及 sidecar，再启动服务。不要用脚本删除数据来“回滚”。

主 v2 库正式导入前的本地安全 preflight：

```bash
npm run preflight:main-import -- --legacy-db /path/to/legacy.sqlite --target-db /path/to/momentpic-v2.sqlite
```

默认只读检查 legacy DB、目标 DB/sidecar、目标目录权限/空间、运行时环境变量和 archive 样本阻塞状态，不会写目标 DB，不会自动执行 `import:legacy`。停写窗口内需要备份目标主库时显式运行：

```bash
npm run preflight:main-import -- --legacy-db /path/to/legacy.sqlite --target-db /path/to/momentpic-v2.sqlite --backup-only
```

完整流程见 [MAIN_IMPORT_PREFLIGHT.md](MAIN_IMPORT_PREFLIGHT.md)。

真实导入前置条件：

- 已完成旧库本地 dry-run 与 `PRAGMA integrity_check`。
- 已跑通隔离演练，并确认核心计数、users reset 边界、分享/收藏/public share 迁移和 API 抽样均通过。
- 已确认旧 `source_path`/`relative_path` 与新部署路径的映射关系。
- 已备份主 v2 SQLite 文件和 sidecar，并确认当次窗口内没有其他写入。

## 密码迁移

旧库 `users.password` 是可直接比对的密码字段。v2 不允许明文保存密码，使用 `users.password_hash` 存储 Node `crypto.scrypt` hash。

建议策略：

1. 不直接复制旧 `password` 字段到 v2。
2. 管理员迁移后统一重置初始密码。
3. 若必须保留旧密码，只能在迁移脚本本地读取后立即 hash，再写入 `password_hash`，不得在日志中输出。

当前脚本会导入旧 `users.username/role/created_at/updated_at`，但跳过旧 `admin`，避免覆盖本地 seed 管理员；也不会复制旧 `password`。每个其他 legacy 用户写入随机 scrypt hash，并设置 `password_reset_required=1`；管理员需要通过 `POST|PATCH /api/v2/users/:username` 重置密码。若用户已存在，导入只更新 role/updated_at，不覆盖已有 password hash。

## 分享、收藏、公开分享

当前会迁移：

- `shared_albums.username + album_id`，要求用户和相册均已在 v2 存在。
- `favorite_albums.username + album_id`，要求用户和相册均已在 v2 存在；旧 `album_json` 快照不复制。
- `public_shares.token/type/target_id/created_by`，保留旧 token。

公开分享页已支持 token-scoped 二进制图片免登录读取：asset token 只读目标 asset，album token 只读该相册内 asset。后续仍需补分享审计字段和更完整的公开权限策略。

## 缩略图和原图

旧库 `thumbnails` 记录可以作为缓存线索，但 v2 建议优先重建缩略图缓存，因为旧缓存路径可能绑定容器路径或旧部署目录。

切片 2 已实现最小读取接口：

- `/api/v2/assets/:assetId/original`
- `/api/v2/assets/:assetId/thumbnail`

folder 资源会读取 `sourcePath` 指向的本地文件。thumbnail 对本地图片文件生成 JPEG 缩略图并缓存到 `MOMENTPIC_THUMBNAIL_CACHE_DIR`，默认 `data/thumbnails`；最长边默认 `MOMENTPIC_THUMBNAIL_MAX_SIZE=640`。缓存 key 包含资源 ID、解析后的源路径、源文件大小、源文件 mtime 和目标尺寸，因此源文件或尺寸配置变化后会自动生成新缓存。

zip/archive 资源当前支持读取 zip/cbz 容器内图片 entry。判定条件是 `sourceType=zip`、`sourceType=archive` 且文件为 zip/cbz，或资产带 `zipEntryPath`。读取时把 `sourcePath` 当作本地 zip 文件路径，先尝试原路径，再应用 `MOMENTPIC_PATH_PREFIX_MAP`。entry 选择顺序是 `zipEntryPath`、`relativePath`、`name`。

archive/zip thumbnail 复用 sharp 逻辑生成 JPEG 缩略图，但不会把 entry 解压写到任意目录，而是把单个 entry buffer 传给 sharp。缓存 key 包含资源 ID、解析后的 archive 路径、archive 文件大小和 mtime、entry path、entry 未压缩大小、压缩大小、CRC 和目标尺寸。

安全和限制：

- `MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES` 控制单 entry 最大读取大小，默认 64 MiB，最低 1 MiB；超限返回 413。
- entry 路径拒绝绝对路径、盘符路径、空 segment、`.`/`..` segment 和目录 entry，防止 zip slip/path traversal。
- entry 不存在返回 404；无效 zip 返回 415；加密或不支持压缩方式的 entry 返回 415；rar/7z 等非 zip archive 返回 501，并可通过 `GET /api/v2/archive/readiness` 查看本机外部命令 readiness。
- 错误响应不包含本机系统路径。

thumbnail 响应头：

```text
X-MomentPic-Thumbnail-Cache: generated|hit|fallback
X-MomentPic-Thumbnail-Fallback: original|unsupported
```

folder thumbnail 生成失败时不会暴露 sharp 或系统路径细节，接口回退原图；非图片资源返回 415。archive/zip thumbnail 生成失败返回 415，不回退整包或写出解压文件。

读取接口保留 legacy 导入的 `source_path` 原值，不在数据库中重写路径。运行时先尝试原路径；不可读时再应用 `MOMENTPIC_PATH_PREFIX_MAP`。未设置环境变量时，当前内置 legacy 映射：

```text
/example/media/moment/ -> /example/media/moment/download/
```

这匹配已完成的 Unraid 抽样核查：旧路径样本不存在，插入 `/download` 后样本存在。接口会返回 `X-MomentPic-Path-Mapped: true|false`，便于上线后观察命中比例。若要回滚运行时映射，设置 `MOMENTPIC_PATH_PREFIX_MAP='[]'` 并重启 v2 服务即可；不需要改回数据库。

本切片没有实现：

- rar/7z 等非 zip archive 读取
- 图片尺寸补齐
- 真正文件系统扫描写入
- 缩略图后台队列预热

缩略图缓存清理与回滚：

- 删除或更换 `MOMENTPIC_THUMBNAIL_CACHE_DIR` 不影响 SQLite 主库。
- 需要清理时建议先停止服务，再删除缓存目录，随后重启服务按需重建。
- 如缩略图生成在生产环境出现性能或兼容性问题，可临时把缓存目录切到新的空目录观察；必要时在代码层回退到上一切片的原图 fallback。
- `POST /api/v2/cache/thumbnails/warmup` 已支持默认 dry-run 和同步小批量执行，单次最多 100 个候选；生产上先用 `dryRun=true` 查看候选，再用 `dryRun=false` 配合 `assetIds` 或小 limit 逐步预热。
- archive/zip 读取能力回滚不需要修改 SQLite 数据；回退代码或先避免在调用侧请求 archive 资源即可。

## 路径映射

迁移前需要确认旧 `source_path`、`relative_path` 和图库根 `path` 在新部署环境中的映射关系。不要假设 Unraid 容器内路径等于本地开发路径。

`MOMENTPIC_PATH_PREFIX_MAP` 支持 JSON 数组：

```bash
MOMENTPIC_PATH_PREFIX_MAP='[{"from":"/example/media/moment/","to":"/example/media/moment/download/"}]'
```

也支持简单 `from=to` 格式，多条用英文逗号分隔。建议正式部署时显式写入当前确认过的映射，避免以后默认值变化造成歧义。设置为 `[]` 表示关闭所有运行时映射。

## 脚本入口

脚本入口：

```bash
MOMENTPIC_LEGACY_DB_PATH=/path/to/legacy.sqlite npm run import:legacy -- --dry-run
```
