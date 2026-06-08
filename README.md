# MomentPic

Sanitized monorepo prepared for GitHub publication.

## Layout

- `backend-v2/`: Node.js/TypeScript Fastify backend.
- `android/`: Android client source.
- `docs/`: release and deployment notes.

## What is intentionally not included

- SQLite databases, WAL/SHM files, backups, thumbnails, media files, APKs, zips, tarballs, logs, pid files and build outputs.
- `node_modules`, Gradle caches, Android SDK local cache, `local.properties`.
- Keystores/signing files, `google-services.*`, `.env*`, secret files and deployment-only credentials.

## Local backend quick start

```bash
cd backend-v2
cp .env.example .env
npm install
npm run typecheck
npm run smoke
```

Edit `.env` before any real deployment. Do not commit `.env`.

## Android quick check

```bash
cd android
GRADLE_USER_HOME="$PWD/.gradle" ANDROID_SDK_HOME="$PWD/.android-home" bash ./gradlew assembleDebug --offline --no-daemon
```

If dependencies are not already cached, rerun without `--offline` in a networked Android build environment.

## Publishing status

This directory is a local release candidate only. No GitHub remote has been added and nothing has been pushed.
