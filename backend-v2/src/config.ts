import path from "node:path";

export interface AppConfig {
  host: string;
  port: number;
  dbPath: string;
  authSecret: string;
  adminUsername: string;
  adminPassword: string;
  cookieName: string;
  cookieTtlSeconds: number;
  seedDemoData: boolean;
  legacyDbPath?: string;
  pathPrefixMap: PathPrefixMapRule[];
  thumbnailCacheDir: string;
  thumbnailMaxSize: number;
  archiveEntryMaxBytes: number;
  libraryRootAllowedPrefixes: string[];
}

export interface PathPrefixMapRule {
  from: string;
  to: string;
}

const projectRoot = process.cwd();

const defaultPathPrefixMap: PathPrefixMapRule[] = [
  {
    from: "/example/media/moment/",
    to: "/example/media/moment/download/"
  }
];

const booleanFromEnv = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const numberFromEnv = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parsePathPrefixMap = (value: string | undefined): PathPrefixMapRule[] => {
  if (value === undefined) return defaultPathPrefixMap;
  const trimmed = value.trim();
  if (!trimmed) return defaultPathPrefixMap;

  let parsed: unknown;
  try {
    parsed = trimmed.startsWith("[")
      ? JSON.parse(trimmed)
      : trimmed.split(",").map((entry) => {
          const separatorIndex = entry.indexOf("=");
          if (separatorIndex <= 0) throw new Error("invalid simple mapping entry");
          return {
            from: entry.slice(0, separatorIndex).trim(),
            to: entry.slice(separatorIndex + 1).trim()
          };
        });
  } catch {
    throw new Error("invalid MOMENTPIC_PATH_PREFIX_MAP; use JSON array or from=to entries");
  }

  if (!Array.isArray(parsed)) throw new Error("invalid MOMENTPIC_PATH_PREFIX_MAP; expected an array");
  return parsed.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`invalid MOMENTPIC_PATH_PREFIX_MAP entry at index ${index}`);
    }
    const { from, to } = entry as { from?: unknown; to?: unknown };
    if (typeof from !== "string" || typeof to !== "string" || !from || !to) {
      throw new Error(`invalid MOMENTPIC_PATH_PREFIX_MAP entry at index ${index}`);
    }
    return { from, to };
  });
};

const parsePathList = (value: string | undefined, fallback: string[]): string[] => {
  const source = value === undefined ? fallback : value.split(",");
  return source
    .map((entry) => entry.trim().replace(/\\/g, "/").replace(/\/+$/g, ""))
    .filter(Boolean);
};

export const loadConfig = (overrides: Partial<AppConfig> = {}): AppConfig => {
  const port = Number(process.env.PORT ?? 3000);
  return {
    host: process.env.HOST ?? "127.0.0.1",
    port: Number.isFinite(port) ? port : 3000,
    dbPath: process.env.MOMENTPIC_DB_PATH ?? path.resolve(projectRoot, "data", "momentpic-v2.sqlite"),
    authSecret: process.env.MOMENTPIC_AUTH_SECRET ?? process.env.MOMENTPIC_ADMIN_PASSWORD ?? "change-me-local-auth-secret",
    adminUsername: (process.env.MOMENTPIC_ADMIN_USERNAME ?? "admin").trim().toLowerCase(),
    adminPassword: process.env.MOMENTPIC_ADMIN_PASSWORD ?? "change-me-admin-password",
    cookieName: process.env.MOMENTPIC_COOKIE_NAME ?? "moment_pic_v2_auth",
    cookieTtlSeconds: Number(process.env.MOMENTPIC_COOKIE_TTL_SECONDS ?? 24 * 60 * 60),
    seedDemoData: booleanFromEnv(process.env.MOMENTPIC_SEED_DEMO, true),
    legacyDbPath: process.env.MOMENTPIC_LEGACY_DB_PATH,
    pathPrefixMap: parsePathPrefixMap(process.env.MOMENTPIC_PATH_PREFIX_MAP),
    thumbnailCacheDir: process.env.MOMENTPIC_THUMBNAIL_CACHE_DIR ?? path.resolve(projectRoot, "data", "thumbnails"),
    thumbnailMaxSize: Math.max(64, Math.min(2048, Math.round(numberFromEnv(process.env.MOMENTPIC_THUMBNAIL_MAX_SIZE, 640)))),
    archiveEntryMaxBytes: Math.max(1024 * 1024, Math.round(numberFromEnv(process.env.MOMENTPIC_ARCHIVE_ENTRY_MAX_BYTES, 64 * 1024 * 1024))),
    libraryRootAllowedPrefixes: parsePathList(process.env.MOMENTPIC_LIBRARY_ALLOWED_ROOTS, [
      "/example/media",
      "/example/photos",
      "/example/media"
    ]),
    ...overrides
  };
};
