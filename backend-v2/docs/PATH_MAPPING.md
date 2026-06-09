# Legacy path mapping

This note records the read-only path check before importing the real legacy library into the v2 main database.

## Local database summary

Command:

```bash
npm run check:path-mapping -- --legacy-db data/legacy-real-dryrun.sqlite --imported-db data/momentpic-v2-import-test.sqlite --top 8 --samples 6
```

Both the real legacy dry-run DB and the isolated v2 import-test DB have matching core counts:

- `library_roots`: 2
- `albums`: 8003
- `assets`: 764101

Relevant path fields:

- `library_roots.path`:
  - disabled root `瞬间LINK`: `/mnt/user/media/download/moment/link-new-clean`
  - enabled root `Moment 图片库`: `/mnt/user/media/download/moment`
- `albums.source_type`: `zip=5262`, `folder=2741`
- `assets.source_type`: `zip=560312`, `folder=203789`
- `albums.source_path`: no empty paths
- `assets.source_path`: no empty paths
- `assets.relative_path`: 203789 non-empty rows
- `assets.zip_entry_path`: 560312 non-empty rows
- `assets.extension`: `jpg=715778`, `png=41993`, `jpeg=3841`, `gif=2488`, `bmp=1`
- `assets.size_bytes`: 764101 known sizes, total about 2258.65 GiB, avg about 3.03 MiB, max about 275.39 MiB

## Unraid read-only check

The Unraid check used a temporary OpenSSH `SSH_ASKPASS` helper and only ran `test -e`, `stat`, `ls -ld`, and shallow `find` commands. The helper did not log credentials and was removed after execution.

Observed existing directories:

- `/mnt/user/appdata/moment-pic`
- `/mnt/user/media/download`
- `/mnt/user/media/download/moment`
- `/mnt/user/media/download/moment/link-new-clean`

Observed shallow entries under `/mnt/user/media/download/moment`:

- `create_hardlinks.py`
- `download`
- `link`
- `link-new-clean`

Initial exact-path samples from the legacy DB did not exist under `/mnt/user/media/download/moment/<album-or-file>`. Targeted basename search found those names under `/mnt/user/media/download/moment/download/...`, with some folder assets also mirrored under `link-new-clean`.

Mapping sample result:

| Sample group | Old path exists | `/download` mapped exists | `link-new-clean` mapped exists |
| --- | ---: | ---: | ---: |
| 6 folder albums | 0 | 6 | 1 |
| 6 zip albums | 0 | 6 | 0 |
| 6 folder assets | 0 | 6 | 5 |
| Total | 0 / 18 | 18 / 18 | 6 / 18 |

## Recommendation

For file-read endpoints after the real import, keep the stored legacy DB paths unchanged for auditability, but resolve existing files with this host path prefix mapping:

```text
/mnt/user/media/download/moment/ -> /mnt/user/media/download/moment/download/
```

Do not use `link-new-clean` as the primary mapping for the enabled legacy root. It is only partial in the sample. It can be kept as a fallback candidate for disabled/link-library paths or later cleanup work.

Before the formal main DB import, confirm whether v2 will:

- persist paths exactly as imported and apply runtime prefix mapping in the file service, or
- rewrite `source_path`/`library_roots.path` during import.

Runtime mapping is safer for traceability because it avoids mutating historical source fields during the first import.

## Runtime implementation

The backend now keeps imported `source_path` values unchanged and applies a read-time prefix map only in the file-read endpoints:

- `GET /api/v2/assets/:assetId/original`
- `GET /api/v2/assets/:assetId/thumbnail`

Resolution order:

1. Try the original `assets.source_path` as stored in SQLite.
2. If it is not a readable file, try configured mapped paths in order.
3. If no candidate is readable, return the existing sanitized 404 response: `asset file not found`.

Successful responses include:

```text
X-MomentPic-Path-Mapped: true|false
```

Default mapping when `MOMENTPIC_PATH_PREFIX_MAP` is not set:

```bash
MOMENTPIC_PATH_PREFIX_MAP='[{"from":"/mnt/user/media/download/moment/","to":"/mnt/user/media/download/moment/download/"}]'
```

Operational notes:

- Set `MOMENTPIC_PATH_PREFIX_MAP='[]'` to disable the default mapping and roll back to exact-path reads.
- Prefer an explicit production env var with the confirmed mapping instead of relying on the built-in default.
- The resolver skips remapping paths that already start with the target prefix, so `/download/` is not duplicated.
- This is read-only behavior; it does not patch legacy DB rows, Unraid paths, or v2 import output.

Thumbnail generation uses the same resolved path. A generated thumbnail response still reports whether the source file came from the original path or a mapped path:

```text
X-MomentPic-Path-Mapped: true|false
X-MomentPic-Thumbnail-Cache: generated|hit|fallback
```

## Archive/zip reads

The same runtime path-prefix resolver is now used for archive-backed assets:

- `sourceType=zip`
- `sourceType=archive` when the resolved file is a zip/cbz
- any asset with `zipEntryPath`

For these assets, `assets.source_path` is treated as the local archive file path. The resolver still tries the imported path first, then configured mapped paths. On success, `X-MomentPic-Path-Mapped` reports whether the archive file path was mapped.

The entry path is selected from `zip_entry_path`, then `relative_path`, then `name`. Entry paths are treated as archive-internal paths only; absolute paths, drive-letter paths, empty segments, `.`/`..` segments, and directory entries are rejected. The backend does not write extracted entries to arbitrary filesystem paths.

Current archive support is intentionally narrow:

- zip/cbz only; rar/7z remain unsupported.
- Single entry reads are limited by `MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES`, default 64 MiB.
- Missing entries return 404, invalid zip files return 415, and unsupported archive formats return 501.
