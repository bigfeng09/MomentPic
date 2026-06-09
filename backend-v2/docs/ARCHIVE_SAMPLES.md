# Archive sample validation

This note records the read-only local check for real legacy zip/archive assets before any formal main database import.

## Command

```bash
npm run check:archive-samples -- --limit 20 --top 8
```

The script defaults to:

- legacy DB: `data/legacy-real-dryrun.sqlite`
- isolated imported DB: `data/momentpic-v2-import-test.sqlite`

It opens both DBs read-only, applies the same runtime `MOMENTPIC_PATH_PREFIX_MAP` rules as the asset service, and limits sample logging by default. When archive entries are readable, it reads them through the archive service and validates thumbnail decoding/resizing in memory with sharp; it does not write DB rows or extracted files. Missing DBs or missing local media mounts are reported as a blocked environment check and exit with code 0.

## 2026-06-07 local result

Both local DB files exist:

- `data/legacy-real-dryrun.sqlite`
- `data/momentpic-v2-import-test.sqlite`

Both DBs report the same archive-related shape:

- `assets.source_type`: `zip=560312`, `folder=203789`
- archive candidate assets: `560312`
- archive source path prefix: `/mnt/user/media/download/moment`
- entry path availability: `zip_entry_path=560312`, `relative_path=0`, `name_only=0`, `missing_all=0`
- archive candidate `size_bytes`: known `560312`, min `0 B`, average about `2.85 MiB`, max about `96.16 MiB`

Runtime path-prefix map used by the check:

```text
/mnt/user/media/download/moment/ -> /mnt/user/media/download/moment/download/
```

Sample verification result on this host:

- sample limit: `20`
- archive path readable: `0`
- archive path missing/unavailable: `20`
- mapped archive path readable: `0`
- readable entry: `0`
- thumbnail in-memory validation: `0`
- readable entry size stats: no known readable entries

Local blocker:

```text
/mnt/user is not mounted on this host, so the real legacy archive files cannot be opened locally.
```

Because no sampled archive file was accessible, this run did not validate real `original` streaming or real archive thumbnail generation. The existing synthetic smoke test still covers zip original/thumbnail behavior with generated local zip assets.

## Next step

Run the same command on a host where `/mnt/user/media/download/moment` or the mapped `/mnt/user/media/download/moment/download` tree is mounted read-only. A useful acceptance target for the next slice is:

- at least a small sample has readable archive paths after prefix mapping,
- sampled `zip_entry_path` values exist inside the zip/cbz files,
- entries above `MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES` are reported as too large instead of read,
- a few image entries can pass original read validation and thumbnail in-memory validation.
