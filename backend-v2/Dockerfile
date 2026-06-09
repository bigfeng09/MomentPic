ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build
RUN npm prune --omit=dev

ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE}

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3211 \
    MOMENTPIC_DB_PATH=/app/data/momentpic-v2.sqlite \
    MOMENTPIC_SEED_DEMO=false \
    MOMENTPIC_PATH_PREFIX_MAP='[{"from":"/mnt/user/media/download/moment/","to":"/mnt/user/media/download/moment/download/"}]' \
    MOMENTPIC_THUMBNAIL_CACHE_DIR=/app/data/thumbnails

RUN apt-get update \
    && apt-get install -y --no-install-recommends 7zip \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN chmod +x /app/node_modules/7zip-bin/linux/*/7za 2>/dev/null || true
RUN mkdir -p /app/data/thumbnails

VOLUME ["/app/data"]
EXPOSE 3211

ENTRYPOINT []
CMD ["node", "dist/src/index.js"]
