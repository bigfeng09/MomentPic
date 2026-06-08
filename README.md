# MomentPic

Sanitized monorepo for a self-hosted MomentPic Android client and Backend V2 service.

> This repository intentionally contains **source code and deployment templates only**. It does not include private databases, media files, `.env` files, Android signing keys, APKs or build outputs.

## Repository layout

- `backend-v2/` — Node.js 22 + TypeScript + Fastify backend.
- `android/` — Android client source.
- `docs/` — release/security notes.

## What you can do from this repo

A new operator can:

1. Run the backend locally with demo/empty data.
2. Import a legacy MomentPic SQLite database if they have one.
3. Deploy the backend with Docker Compose.
4. Build the Android debug APK and point it at their backend URL.

They **cannot** reproduce the original private deployment without supplying their own:

- SQLite database or legacy export.
- Media library mount/path.
- Admin password and auth secret.
- Android SDK/build environment.

## Quick start: backend with Docker Compose

```bash
cd backend-v2
cp .env.example .env
```

Edit `.env` and set at minimum:

```bash
MOMENTPIC_ADMIN_PASSWORD=<strong-password>
MOMENTPIC_AUTH_SECRET=<long-random-secret>
```

Then start:

```bash
docker compose up -d --build
curl http://127.0.0.1:3211/api/v2/health
```

Default exposed URL:

```text
http://<server-ip>:3211
```

For more backend deployment detail, see `backend-v2/docs/DEPLOYMENT.md`.

## Quick start: backend for development

```bash
cd backend-v2
cp .env.example .env
npm install
npm run typecheck
npm run smoke
npm run build
npm start
```

## Optional: import a legacy SQLite database

Put your legacy DB somewhere outside git, then run:

```bash
cd backend-v2
npm run verify:legacy -- --legacy-db /path/to/gallery.sqlite
npm run import:legacy:test -- --legacy-db /path/to/gallery.sqlite
```

Only after reviewing the test import should you import into the main DB:

```bash
MOMENTPIC_DB_PATH=./data/momentpic-v2.sqlite npm run import:legacy -- --legacy-db /path/to/gallery.sqlite
```

If legacy rows contain old absolute media paths, configure `MOMENTPIC_PATH_PREFIX_MAP` in `.env`.

## Build Android

Install Android SDK/JDK, then:

```bash
cd android
bash ./gradlew :app:assembleDebug
```

Debug APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Install the APK and set the backend URL to your server, for example:

```text
http://<server-ip>:3211
```

## Security notes

Before publishing or sharing a fork, ensure these are not committed:

- `.env`, secrets, tokens, passwords.
- SQLite databases, WAL/SHM sidecars, backups.
- Media files and generated thumbnails.
- Android signing keys, `local.properties`, `google-services.*`.
- APK/AAB/ZIP/TAR/build outputs.

The included `.gitignore` is configured for these exclusions.
