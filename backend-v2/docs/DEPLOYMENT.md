# MomentPic Backend V2 Deployment

This document describes how a new operator can install Backend V2 from the sanitized repository.

## Requirements

Choose one deployment path.

### Docker path

- Docker Engine
- Docker Compose v2
- A writable data directory for SQLite and thumbnails
- Optional read-only media mount if serving existing image files

### Native Node path

- Node.js 22+
- npm
- SQLite-capable filesystem
- Optional read-only media mount if serving existing image files

## Configuration

Start from the example file:

```bash
cp .env.example .env
```

Set strong private values:

```bash
MOMENTPIC_ADMIN_USERNAME=admin
MOMENTPIC_ADMIN_PASSWORD=<strong-password>
MOMENTPIC_AUTH_SECRET=<long-random-secret>
```

Common production values:

```bash
HOST=0.0.0.0
PORT=3211
MOMENTPIC_DB_PATH=/app/data/momentpic-v2.sqlite
MOMENTPIC_SEED_DEMO=false
MOMENTPIC_THUMBNAIL_CACHE_DIR=/app/data/thumbnails
```

If imported database rows contain legacy absolute paths, mount the media directory read-only and map old paths to runtime paths:

```bash
MOMENTPIC_PATH_PREFIX_MAP='[{"from":"/legacy/media/root/","to":"/runtime/media/root/"}]'
```

Do not commit real `.env` files.

## Docker Compose install

```bash
cd backend-v2
cp .env.example .env
# edit .env first
docker compose up -d --build
docker compose logs -f moment-pic-v2
```

Health check:

```bash
curl http://127.0.0.1:3211/api/v2/health
```

Expected response contains:

```json
{"status":"ok","version":"v2"}
```

The built-in Web UI is served from:

```bash
curl http://127.0.0.1:3211/
```

Open `http://<server-ip>:3211/` in a browser, then log in with the configured admin account.

Stop/restart:

```bash
docker compose restart
docker compose down
```

## Native Node install

```bash
cd backend-v2
cp .env.example .env
npm install
npm run typecheck
npm run build
npm start
```

For long-running production use, put `npm start` behind systemd, pm2, Docker, or another process supervisor.

## Legacy database import

The repository does not include any database. If you have a legacy MomentPic DB:

```bash
npm run verify:legacy -- --legacy-db /path/to/gallery.sqlite
npm run import:legacy:test -- --legacy-db /path/to/gallery.sqlite
```

Review the test output, then import into the configured target DB:

```bash
MOMENTPIC_DB_PATH=./data/momentpic-v2.sqlite npm run import:legacy -- --legacy-db /path/to/gallery.sqlite
```

Recommended safety sequence:

1. Back up the legacy DB with SQLite `.backup`.
2. Run `verify:legacy`.
3. Run `import:legacy:test`.
4. Back up the target v2 DB.
5. Run the real import.
6. Run smoke/API checks.

## Smoke checks

```bash
npm run typecheck
npm run smoke
```

Manual HTTP checks:

```bash
curl http://127.0.0.1:3211/
curl http://127.0.0.1:3211/api/v2/health
curl -i -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<password>"}' \
  http://127.0.0.1:3211/api/v2/auth/login
```

## Operational notes

- The backend serves a no-build Web UI at `/` for login, album browsing, image viewing, favorite albums, and public share creation.
- ZIP/CBZ archives are supported by built-in code.
- RAR/7z/CBR/CB7 return explicit unsupported responses unless external extractor support is added.
- Scan endpoints are safe dry-run/status endpoints in this release.
- Thumbnail warmup is synchronous and intentionally limited; do not run large unbounded jobs.

## Files that must stay private

Never commit or publish:

- `.env` or secret stores.
- SQLite DBs, WAL/SHM files, backups.
- Media libraries and generated thumbnails.
- Logs, pid files, deployment tarballs.
