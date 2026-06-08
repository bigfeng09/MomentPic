import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { AppConfig } from "../config.js";
import type { AuthUser, UserRole } from "../types/domain.js";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const normalizeUsername = (value: unknown): string => String(value ?? "").trim().toLowerCase();

export const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto
    .scryptSync(password, salt, SCRYPT_KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: 64 * 1024 * 1024
    })
    .toString("base64url");
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`;
};

export const verifyPassword = (password: string, storedHash: string): boolean => {
  const [method, nText, rText, pText, salt, expectedHash] = storedHash.split("$");
  if (method !== "scrypt" || !nText || !rText || !pText || !salt || !expectedHash) return false;
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (![n, r, p].every((value) => Number.isInteger(value) && value > 0)) return false;
  const actualHash = crypto
    .scryptSync(password, salt, Buffer.from(expectedHash, "base64url").length, {
      N: n,
      r,
      p,
      maxmem: 64 * 1024 * 1024
    })
    .toString("base64url");
  return safeEqual(actualHash, expectedHash);
};

const sign = (payload: string, secret: string): string =>
  crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export const createAuthToken = (secret: string, user: AuthUser, expiresAtMs: number): string => {
  const payload = Buffer.from(JSON.stringify({ username: user.username, role: user.role, exp: expiresAtMs }), "utf8").toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
};

export const verifyAuthToken = (secret: string, token: string, nowMs = Date.now()): AuthUser | null => {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload, secret))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      username?: unknown;
      role?: unknown;
      exp?: unknown;
    };
    const username = normalizeUsername(decoded.username);
    const role = decoded.role as UserRole;
    if (!username || (role !== "admin" && role !== "user")) return null;
    if (typeof decoded.exp !== "number" || decoded.exp <= nowMs) return null;
    return { username, role };
  } catch {
    return null;
  }
};

export const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, item) => {
      const separator = item.indexOf("=");
      if (separator <= 0) return acc;
      const key = item.slice(0, separator).trim();
      const value = item.slice(separator + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

export const getAuthUser = (request: FastifyRequest, config: AppConfig): AuthUser | null => {
  const cookieHeader = Array.isArray(request.headers.cookie) ? request.headers.cookie[0] : request.headers.cookie;
  const token = parseCookies(cookieHeader)[config.cookieName];
  return token ? verifyAuthToken(config.authSecret, token) : null;
};

export const buildAuthCookie = (config: AppConfig, token: string): string =>
  `${config.cookieName}=${encodeURIComponent(token)}; Max-Age=${config.cookieTtlSeconds}; Path=/; HttpOnly; SameSite=Lax`;

export const buildClearAuthCookie = (config: AppConfig): string =>
  `${config.cookieName}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
