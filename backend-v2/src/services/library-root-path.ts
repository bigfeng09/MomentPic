const dangerousPaths = new Set([
  "/",
  "/mnt",
  "/mnt/user",
  "/mnt/user/appdata",
  "/boot",
  "/etc",
  "/root",
  "/usr",
  "/var",
  "/bin",
  "/sbin",
  "/proc",
  "/sys",
  "/dev"
]);

export const normalizeLibraryPath = (value: unknown): string => {
  let normalized = String(value ?? "").trim().replace(/\0/g, "");
  normalized = normalized.replace(/\\/g, "/");
  normalized = normalized.replace(/\/{2,}/g, "/");
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/g, "");
  return normalized;
};

const isAbsoluteServerPath = (value: string): boolean => value.startsWith("/") || /^[A-Za-z]:\//.test(value);

const isWithinPrefix = (value: string, prefix: string): boolean => {
  const normalizedPrefix = normalizeLibraryPath(prefix);
  return value === normalizedPrefix || value.startsWith(`${normalizedPrefix}/`);
};

export const assertSafeLibraryPath = (value: unknown, allowedPrefixes: string[]): string => {
  const libraryPath = normalizeLibraryPath(value);
  if (!libraryPath) throw new Error("path required");
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(libraryPath)) {
    throw new Error("path must be a server filesystem path, not a URL");
  }
  if (!isAbsoluteServerPath(libraryPath)) {
    throw new Error("path must be an absolute server path");
  }
  if (dangerousPaths.has(libraryPath)) {
    throw new Error("path is not allowed for library scanning");
  }
  if (libraryPath.length > 1024) throw new Error("path is too long");
  const normalizedAllowed = allowedPrefixes.map(normalizeLibraryPath).filter(Boolean);
  if (normalizedAllowed.length > 0 && !normalizedAllowed.some((prefix) => isWithinPrefix(libraryPath, prefix))) {
    throw new Error(`path must be under an allowed media root: ${normalizedAllowed.join(", ")}`);
  }
  return libraryPath;
};
