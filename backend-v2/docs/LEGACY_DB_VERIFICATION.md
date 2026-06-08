# Legacy DB Verification

This document freezes the safe path for a real legacy Moment Pic dry-run. It assumes the execution environment can reach Unraid over SSH/SCP, or that a SQLite backup has already been placed on this machine.

Do not paste or print `.secrets` values in terminal logs. The commands below are templates; fill host, user, and paths from your private environment.

## Local Verification

Expected local backup path for the first real dry-run:

```bash
data/legacy-real-dryrun.sqlite
```

Run the full local verification:

```bash
npm run verify:legacy -- --legacy-db data/legacy-real-dryrun.sqlite
```

The command performs these checks:

- the file exists and is a regular file
- file size and modified time are printed
- SQLite `PRAGMA integrity_check` is executed in read-only mode
- the existing legacy importer is executed in dry-run mode

Expected success tail:

```text
SQLite integrity_check: ok
Legacy import dry-run summary:
Verification complete. No v2 data was written.
```

If the file is missing, create or copy a fresh SQLite backup and rerun the command. Do not run a non-dry-run import until the dry-run table counts and mapping plan have been reviewed.

## Unraid Backup Template

Use SQLite `.backup` on Unraid instead of copying a live database file directly.

```bash
ssh <user>@<unraid-host> 'sqlite3 /srv/momentpic/appdata/legacy/legacy.sqlite ".backup '\''/tmp/momentpic_legacy_dryrun.sqlite'\''"'
scp <user>@<unraid-host>:/tmp/momentpic_legacy_dryrun.sqlite data/legacy-real-dryrun.sqlite
ssh <user>@<unraid-host> 'rm -f /tmp/momentpic_legacy_dryrun.sqlite'
npm run verify:legacy -- --legacy-db data/legacy-real-dryrun.sqlite
```

Notes:

- Keep the remote path read-only except for the temporary `/tmp` backup file.
- Delete the remote temporary backup after a successful copy.
- If SSH/SCP is unavailable in the current environment, manually place the backup at `data/legacy-real-dryrun.sqlite` and run the same local verification command.
- The verification command does not read `.secrets`, does not print credentials, and does not write v2 import data.

## After Verification

Review the dry-run table counts before deciding on a real import. The current importer only migrates the core tables:

- `library_roots`
- `albums`
- `assets`

The current importer counts but does not migrate thumbnails, users, shared albums, favorite albums, public shares, or system config. Legacy plaintext user passwords are intentionally not copied.
