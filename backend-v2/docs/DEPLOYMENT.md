# Deployment Notes

Use `.env.example` as the starting point and set real secrets in a local `.env` file or your deployment secret store.

Required production values:

```bash
MOMENTPIC_ADMIN_PASSWORD=<strong-password>
MOMENTPIC_AUTH_SECRET=<long-random-secret>
MOMENTPIC_DB_PATH=/app/data/momentpic-v2.sqlite
MOMENTPIC_SEED_DEMO=false
```

If imported database rows contain legacy absolute media paths, mount media read-only and configure a prefix map:

```bash
MOMENTPIC_PATH_PREFIX_MAP='[{"from":"/legacy/media/root/","to":"/runtime/media/root/"}]'
```

Never commit real `.env` files, databases, media files, generated thumbnails, logs, APKs or signing keys.
