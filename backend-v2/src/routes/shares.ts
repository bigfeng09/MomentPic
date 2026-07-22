import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { fail, ok } from "../lib/api.js";
import { parseCookies } from "../lib/auth.js";
import { AlbumRepository } from "../repositories/album-repository.js";
import { AssetRepository } from "../repositories/asset-repository.js";
import { ShareRepository, type PublicShareDto } from "../repositories/share-repository.js";
import { sendAssetFile } from "../services/asset-file.js";

const htmlEscape = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] ?? ch);

const page = (title: string, body: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${htmlEscape(title)}</title><style>body{margin:0;background:#fffaf2;color:#211f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.wrap{max-width:960px;margin:0 auto;padding:18px}h1{font-size:22px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.item{padding:8px;border:1px solid #e8ddd3;border-radius:10px;background:#fff}.item img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#f2ece4;border-radius:6px}.asset img{display:block;max-width:100%;height:auto;background:#f2ece4;border-radius:8px}a{color:#4d3927;text-decoration:none}input,button{font:inherit;padding:10px 12px;border:1px solid #d8c8b8;border-radius:8px}button{margin-left:8px;background:#4d3927;color:white}</style></head><body><div class="wrap">${body}</div></body></html>`;

const shareAssetUrl = (token: string, variant: "original" | "thumbnail"): string =>
  `/s/${encodeURIComponent(token)}/${variant}`;

const shareAlbumAssetUrl = (token: string, assetId: string, variant: "original" | "thumbnail"): string =>
  `/s/${encodeURIComponent(token)}/assets/${encodeURIComponent(assetId)}/${variant}`;

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const shareCookieName = (token: string): string => `momentpic_share_${token}`;
const shareTicket = (secret: string, share: PublicShareDto): string =>
  crypto.createHmac("sha256", secret).update(`${share.token}:${share.updatedAt}`).digest("base64url");

const shareAccessGranted = (request: FastifyRequest, share: PublicShareDto, secret: string): boolean => {
  if (!share.passwordProtected) return true;
  const cookieHeader = Array.isArray(request.headers.cookie) ? request.headers.cookie[0] : request.headers.cookie;
  const ticket = parseCookies(cookieHeader)[shareCookieName(share.token)];
  return Boolean(ticket && safeEqual(ticket, shareTicket(secret, share)));
};

const buildShareCookie = (secret: string, share: PublicShareDto): string => {
  const expirySeconds = share.expiresAt ? Math.floor((Date.parse(share.expiresAt) - Date.now()) / 1000) : 86_400;
  const maxAge = Math.max(1, Math.min(86_400, expirySeconds));
  return `${shareCookieName(share.token)}=${encodeURIComponent(shareTicket(secret, share))}; Max-Age=${maxAge}; Path=/s/${share.token}; HttpOnly; SameSite=Lax`;
};

const passwordForm = (token: string, invalid: boolean): string =>
  page("Protected share", `<h1>Protected share</h1><p>${invalid ? "Incorrect password. Try again." : "Enter the share password."}</p><form method="post" action="/s/${encodeURIComponent(token)}/unlock"><input name="password" type="password" required autocomplete="current-password"><button type="submit">Open</button></form>`);

export const shareRoutes = async (app: FastifyInstance): Promise<void> => {
  const shares = new ShareRepository(app.db);
  const albums = new AlbumRepository(app.db);
  const assets = new AssetRepository(app.db);

  if (!app.hasContentTypeParser("application/x-www-form-urlencoded")) {
    app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_request, body, done) => done(null, body));
  }

  const requireAdmin = (request: { authUser?: { role: string } }, reply: { status: (code: number) => { send: (payload: unknown) => unknown } }) => {
    if (request.authUser?.role === "admin") return true;
    reply.status(403).send(fail(4030, "admin only"));
    return false;
  };

  app.get("/api/v2/favorite-albums", async (request) => ok({ items: shares.listFavoriteAlbums(request.authUser!) }));

  app.put("/api/v2/favorite-albums", async (request) => {
    const body = request.body as { items?: Array<{ id?: unknown }> } | undefined;
    const albumIds = Array.isArray(body?.items) ? body.items.map((item) => String(item?.id ?? "")) : [];
    return ok({ items: shares.replaceFavoriteAlbums(request.authUser!, albumIds) });
  });

  app.post("/api/v2/favorite-albums/:albumId", async (request, reply) => {
    const { albumId } = request.params as { albumId: string };
    try {
      shares.setFavoriteAlbum(request.authUser!, albumId, true);
      return ok({ albumId, favorite: true });
    } catch (error) {
      return reply.status(403).send(fail(4031, error instanceof Error ? error.message : "favorite failed"));
    }
  });

  app.delete("/api/v2/favorite-albums/:albumId", async (request, reply) => {
    const { albumId } = request.params as { albumId: string };
    try {
      shares.setFavoriteAlbum(request.authUser!, albumId, false);
      return ok({ albumId, favorite: false });
    } catch (error) {
      return reply.status(403).send(fail(4031, error instanceof Error ? error.message : "favorite failed"));
    }
  });

  app.get("/api/v2/users/:username/shared-albums", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { username } = request.params as { username: string };
    return ok({ items: shares.listSharedAlbums(username), albumIds: shares.listSharedAlbumIds(username) });
  });

  app.put("/api/v2/users/:username/shared-albums", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { username } = request.params as { username: string };
    const body = request.body as { albumIds?: unknown[] } | undefined;
    try {
      const albumIds = Array.isArray(body?.albumIds) ? body.albumIds.map((id) => String(id)) : [];
      return ok({ albumIds: shares.replaceSharedAlbums(username, albumIds) });
    } catch (error) {
      return reply.status(400).send(fail(4000, error instanceof Error ? error.message : "share update failed"));
    }
  });

  app.put("/api/v2/users/:username/shared-albums/:albumId", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { username, albumId } = request.params as { username: string; albumId: string };
    const body = request.body as { shared?: unknown } | undefined;
    try {
      shares.setSharedAlbum(username, albumId, body?.shared !== false);
      return ok({ username, albumId, shared: body?.shared !== false });
    } catch (error) {
      return reply.status(400).send(fail(4000, error instanceof Error ? error.message : "share update failed"));
    }
  });

  app.delete("/api/v2/users/:username/shared-albums/:albumId", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { username, albumId } = request.params as { username: string; albumId: string };
    shares.setSharedAlbum(username, albumId, false);
    return ok({ username, albumId, shared: false });
  });

  app.get("/api/v2/public-shares", async (request) => {
    return ok({ items: shares.listPublicShares(request.authUser!) });
  });

  app.post("/api/v2/public-shares", async (request, reply) => {
    const body = request.body as {
      type?: unknown; targetId?: unknown; expiresAt?: unknown; expiresInHours?: unknown;
      password?: unknown; allowOriginal?: unknown;
    } | undefined;
    try {
      let expiresAt: string | null | undefined;
      if (body && Object.prototype.hasOwnProperty.call(body, "expiresAt")) {
        expiresAt = body.expiresAt == null || String(body.expiresAt).trim() === "" ? null : String(body.expiresAt).trim();
      } else if (body?.expiresInHours != null) {
        const hours = Number(body.expiresInHours);
        if (!Number.isFinite(hours) || hours < 1 || hours > 8760) throw new Error("expiresInHours must be from 1 to 8760");
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }
      const password = body && Object.prototype.hasOwnProperty.call(body, "password") ? String(body.password ?? "") : undefined;
      return ok(shares.findOrCreatePublicShare(body?.type, body?.targetId, request.authUser!, {
        expiresAt,
        password,
        allowOriginal: body?.allowOriginal == null ? undefined : body.allowOriginal !== false
      }));
    } catch (error) {
      return reply.status(400).send(fail(4000, error instanceof Error ? error.message : "public share failed"));
    }
  });

  app.delete("/api/v2/public-shares/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    try {
      return ok({ deleted: shares.deletePublicShare(token, request.authUser!) });
    } catch (error) {
      return reply.status(403).send(fail(4030, error instanceof Error ? error.message : "public share delete failed"));
    }
  });

  app.post("/s/:token/unlock", async (request, reply) => {
    const { token } = request.params as { token: string };
    const share = shares.findPublicShare(token);
    if (!share) return reply.status(404).type("text/html; charset=utf-8").send(page("分享不存在", "<h1>分享不存在或已失效</h1>"));
    if (shares.isPublicShareExpired(share)) {
      return reply.status(410).type("text/html; charset=utf-8").send(page("Share expired", "<h1>This share has expired</h1>"));
    }
    const password = new URLSearchParams(typeof request.body === "string" ? request.body : "").get("password") ?? "";
    if (!shares.verifyPublicSharePassword(token, password)) {
      return reply.status(401).type("text/html; charset=utf-8").send(passwordForm(token, true));
    }
    reply.header("set-cookie", buildShareCookie(app.config.authSecret, share));
    return reply.status(303).header("location", `/s/${encodeURIComponent(token)}`).send();
  });

  app.get("/s/:token/:variant", async (request, reply) => {
    const { token, variant } = request.params as { token: string; variant: string };
    if (variant !== "original" && variant !== "thumbnail") {
      return reply.status(404).type("text/html; charset=utf-8").send(page("分享不存在", "<h1>分享不存在或已失效</h1>"));
    }
    const share = shares.findPublicShare(token);
    if (!share || share.type !== "asset") return reply.status(404).send(fail(4004, "public asset share not found"));
    if (shares.isPublicShareExpired(share)) return reply.status(410).send(fail(4100, "public share expired"));
    if (!shareAccessGranted(request, share, app.config.authSecret)) return reply.status(401).send(fail(4011, "share password required"));
    if (variant === "original" && !share.allowOriginal) {
      return reply.status(403).send(fail(4032, "original download disabled for this share"));
    }
    const asset = assets.findById(share.targetId);
    if (!asset) return reply.status(404).send(fail(4002, "asset not found"));
    return sendAssetFile(reply, asset, variant);
  });

  app.get("/s/:token/assets/:assetId/:variant", async (request, reply) => {
    const { token, assetId, variant } = request.params as { token: string; assetId: string; variant: string };
    if (variant !== "original" && variant !== "thumbnail") return reply.status(404).send(fail(4004, "public asset route not found"));
    const share = shares.findPublicShare(token);
    if (!share || share.type !== "album") return reply.status(404).send(fail(4004, "public album share not found"));
    if (shares.isPublicShareExpired(share)) return reply.status(410).send(fail(4100, "public share expired"));
    if (!shareAccessGranted(request, share, app.config.authSecret)) return reply.status(401).send(fail(4011, "share password required"));
    if (variant === "original" && !share.allowOriginal) {
      return reply.status(403).send(fail(4032, "original download disabled for this share"));
    }
    const asset = assets.findById(assetId);
    if (!asset || asset.albumId !== share.targetId) return reply.status(404).send(fail(4002, "asset not found in public share"));
    return sendAssetFile(reply, asset, variant);
  });

  app.get("/s/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const share = shares.findPublicShare(token);
    if (!share) return reply.status(404).type("text/html; charset=utf-8").send(page("分享不存在", "<h1>分享不存在或已失效</h1>"));

    if (shares.isPublicShareExpired(share)) {
      return reply.status(410).type("text/html; charset=utf-8").send(page("Share expired", "<h1>This share has expired</h1>"));
    }
    if (!shareAccessGranted(request, share, app.config.authSecret)) {
      return reply.status(401).type("text/html; charset=utf-8").send(passwordForm(token, false));
    }
    if (share.type === "asset") {
      const asset = assets.findById(share.targetId);
      if (!asset) return reply.status(404).type("text/html; charset=utf-8").send(page("图片不存在", "<h1>图片不存在</h1>"));
      return reply
        .type("text/html; charset=utf-8")
        .send(
          page(
            asset.name,
            `<h1>${htmlEscape(asset.name)}</h1><div class="asset">${share.allowOriginal ? `<a href="${shareAssetUrl(token, "original")}">` : ""}<img src="${shareAssetUrl(
              token,
              "thumbnail"
            )}" alt="${htmlEscape(asset.name)}">${share.allowOriginal ? "</a>" : ""}</div>`
          )
        );
    }

    const album = albums.findById(share.targetId);
    if (!album) return reply.status(404).type("text/html; charset=utf-8").send(page("相册不存在", "<h1>相册不存在</h1>"));
    const assetPage = assets.listByAlbum(album.id, 1, 300);
    const items = (assetPage?.items ?? [])
      .map(
        (asset) =>
          `${share.allowOriginal ? `<a class="item" href="${shareAlbumAssetUrl(token, asset.id, "original")}">` : '<div class="item">'}<img src="${shareAlbumAssetUrl(
            token,
            asset.id,
            "thumbnail"
          )}" alt="${htmlEscape(asset.name)}"><span>${htmlEscape(asset.name)}</span>${share.allowOriginal ? "</a>" : "</div>"}`
      )
      .join("");
    return reply
      .type("text/html; charset=utf-8")
      .send(page(album.name, `<h1>${htmlEscape(album.name)}</h1><p>${album.assetCount} 张</p><div class="grid">${items}</div>`));
  });
};
