# MomentPic Backend V2

Fastify + TypeScript backend for MomentPic.

## Setup

```bash
npm install
cp .env.example .env
npm run typecheck
npm run smoke
```

Edit `.env` before running with real data. Do not commit `.env`.

Open `http://127.0.0.1:3211/` for the built-in Web UI. It supports login, album browsing, image viewing, favorite albums and public share creation without a frontend build step.

## Scripts

- `npm run dev`: start TypeScript watch mode.
- `npm run build`: compile to `dist/`.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm run smoke`: run the local smoke test.
- `npm run import:legacy`: import a legacy SQLite database into a v2 database.
- `npm run preflight:main-import`: read-only preflight checks before a real import.

## Configuration

See `.env.example`. Secrets must be provided through environment variables or deployment secret storage:

- `MOMENTPIC_ADMIN_PASSWORD`
- `MOMENTPIC_AUTH_SECRET`

Use `MOMENTPIC_PATH_PREFIX_MAP` only when imported media paths need runtime path mapping.

## Docker

`Dockerfile` and `docker-compose.yml` are generic examples. They intentionally use local relative data mounts and no real deployment paths or secrets.

## Docs

- `docs/API_OVERVIEW.md`
- `docs/DEPLOYMENT.md`
