# Release Sanitization Notes

This release package was prepared from local Android and BackendV2 projects without copying runtime data or deployment secrets.

## Excluded

- Backend databases: `data/*.sqlite*`, `*.db*`, WAL/SHM sidecars and backup folders.
- Runtime/cache output: thumbnails, logs, pid files, `dist`, `node_modules`.
- Android local/build output: `.gradle`, `.android-home`, `local.properties`, `app/build`, APK/AAB/ZIP files.
- Signing/cloud config: keystores, JKS files, `google-services.*`.
- Secret config: `.env*`, files matching `*secret*` or `*secrets*`.

## Before GitHub push

Confirm:

- Repository URL.
- Public or private visibility.
- Whether pushing this local commit is allowed.
- Whether Docker examples should remain generic or be tailored to the target deployment after the repository is created.
