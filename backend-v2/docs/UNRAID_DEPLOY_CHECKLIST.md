# Unraid deploy checklist

本清单用于 MomentPicBackendV2 部署到 Unraid 前的人工复核。它不包含密钥值，不要求 SSH/Docker 操作，也不替代 `docs/MAIN_IMPORT_PREFLIGHT.md` 的本地 preflight。

## Preconditions

- 当前部署窗口已确认：不再有旧服务写入 legacy SQLite。
- 已保留最新 legacy DB 备份和 v2 target DB 备份。
- `data/momentpic-v2.sqlite` 已完成正式导入并清理 demo seed。
- 核心计数已复核：`library_roots=2`、`albums=8003`、`assets=764101`。
- 旧路径到部署运行时路径的媒体映射已确认可读。

## Required environment

部署环境必须显式配置以下变量，不要依赖本地开发默认值：

```sh
HOST=0.0.0.0
PORT=3000
MOMENTPIC_DB_PATH=/path/to/momentpic-v2.sqlite
MOMENTPIC_SEED_DEMO=false
MOMENTPIC_PATH_PREFIX_MAP='[{"from":"/mnt/user/media/download/moment/","to":"/actual/readable/media/path/"}]'
MOMENTPIC_THUMBNAIL_CACHE_DIR=/path/to/writable/thumbnail-cache
MOMENTPIC_THUMBNAIL_MAX_SIZE=640
MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES=67108864
MOMENTPIC_ADMIN_USERNAME=admin
MOMENTPIC_ADMIN_PASSWORD=<set in secret storage>
MOMENTPIC_AUTH_SECRET=<set in secret storage>
```

Notes:

- `MOMENTPIC_SEED_DEMO=false` is required. If omitted, service startup can reinsert demo rows.
- `MOMENTPIC_PATH_PREFIX_MAP` must use the path visible from inside the deployed runtime, not necessarily the host path used during local testing.
- `MOMENTPIC_AUTH_SECRET` and `MOMENTPIC_ADMIN_PASSWORD` must be set through the deployment secret mechanism and must not be written into docs or logs.
- `MOMENTPIC_THUMBNAIL_CACHE_DIR` must be writable by the service user and safe to clear without touching SQLite.

## Local pre-deploy checks

Run from `projects/MomentPicBackendV2` before deployment:

```sh
npm run typecheck
npm run smoke
MOMENTPIC_SEED_DEMO=false \
MOMENTPIC_PATH_PREFIX_MAP='[{"from":"/mnt/user/media/download/moment/","to":"/actual/readable/media/path/"}]' \
npm run preflight:main-import -- \
  --legacy-db data/legacy-real-dryrun.sqlite \
  --target-db data/momentpic-v2.sqlite
```

Expected:

- Typecheck succeeds.
- Smoke succeeds.
- Target DB integrity is `ok`.
- Core target counts still match legacy.
- Archive readiness has no missing mapped samples in the deployment-equivalent media path.

## Backup and rollback

Before restarting the deployed service:

- Keep a fresh copy of `momentpic-v2.sqlite`, `momentpic-v2.sqlite-wal`, and `momentpic-v2.sqlite-shm` if they exist.
- Record the exact deployment image/package version and environment variable names in use.
- Keep the previous deployed backend package/image available for rollback.

Rollback plan:

1. Stop writes to the v2 service.
2. Restore the backed-up SQLite main file and sidecars as a matched set.
3. Restore the previous backend package/image or previous environment.
4. Start the service.
5. Re-run the smoke checks below.

## Post-restart smoke

After the service has been restarted with the new DB and environment, verify:

- `GET /api/v2/health` returns 200.
- Login succeeds with the configured admin account.
- `GET /api/v2/galleries` returns the imported galleries, not demo-only data.
- Open one imported album and load its first page of assets.
- Request one folder asset `/original` and `/thumbnail`; confirm 200 and expected image content type.
- Request one zip/archive asset `/original` and `/thumbnail` when a known readable sample exists.
- Create an asset or album public share and verify `/s/:token/.../thumbnail` loads without a cookie while an asset outside the shared album returns 404.
- Run `POST /api/v2/cache/thumbnails/warmup` with `dryRun=true` first; only then use `dryRun=false` with a small `limit` or explicit `assetIds`.
- Check response headers for mapped media samples:
  - `X-MomentPic-Path-Mapped: true`
  - `X-MomentPic-Thumbnail-Cache: generated` or `hit`
- Confirm no `gallery-demo`, `album-demo`, `asset-demo-1`, or `asset-demo-2` rows are visible after restart.

## Known remaining risks

- The currently listening `:3000` service may still hold an older DB connection or old process state until it is restarted.
- Non-zip archive formats such as rar/cbr/7z/cb7 currently return 501; `GET /api/v2/archive/readiness` reports no local `7z`/`7zz`/`7za`/`unrar`/`bsdtar`/`unar` dependency in this environment.
- Legacy users other than `admin` are imported with `password_reset_required=1`; reset them through the v2 admin user API before handing accounts back to users.
- Scan is currently safe dry-run/status only. It does not update the real imported library.
- Thumbnail cache prune/status APIs are available; warmup is synchronous small-batch only, default dry-run, with a hard per-call limit of 100 candidates.
- Public share token creation, `/s/:token` HTML access, and token-scoped public binary image reads are available.
