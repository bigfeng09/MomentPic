# API Overview

Base path: `/api/v2`.

Main areas:

- `GET /health`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /me`
- `GET /galleries`
- `GET /albums`
- `GET /albums/:albumId`
- `GET /albums/:albumId/assets`
- `GET /assets/:assetId`
- `GET /assets/:assetId/original`
- `GET /assets/:assetId/thumbnail`
- User, sharing, favorite-album, scan and thumbnail-cache endpoints used by the Android client.

Binary asset endpoints require a readable media mount when imported records reference files outside the SQLite database.
