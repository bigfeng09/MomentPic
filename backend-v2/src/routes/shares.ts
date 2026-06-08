import type { FastifyInstance } from "fastify";
import { fail, ok } from "../lib/api.js";
import { AlbumRepository } from "../repositories/album-repository.js";
import { AssetRepository } from "../repositories/asset-repository.js";
import { ShareRepository } from "../repositories/share-repository.js";
import { sendAssetFile } from "../services/asset-file.js";

const htmlEscape = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch] ?? ch);

const page = (title: string, body: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${htmlEscape(title)}</title><style>body{margin:0;background:#fffaf2;color:#211f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.wrap{max-width:960px;margin:0 auto;padding:18px}h1{font-size:22px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.item{padding:8px;border:1px solid #e8ddd3;border-radius:10px;background:#fff}.item img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;background:#f2ece4;border-radius:6px}.asset img{display:block;max-width:100%;height:auto;background:#f2ece4;border-radius:8px}a{color:#4d3927;text-decoration:none}</style></head><body><div class="wrap">${body}</div></body></html>`;

const shareAssetUrl = (token: string, variant: "original" | "thumbnail"): string => `/s/${encodeURIComponent(token)}/${variant}`;

const shareAlbumAssetUrl = (token: string, assetId: string, variant: "original" | "thumbnail"): string =>
  `/s/${encodeURIComponent(token)}/assets/${encodeURIComponent(assetId)}/${variant}`;

export const shareRoutes = async (app: FastifyInstance): Promise<void> => {
  const shares = new ShareRepository(app.db);
  const albums = new AlbumRepository(app.db);
  const assets = new AssetRepository(app.db);

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

  app.post("/api/v2/public-shares", async (request, reply) => {
    const body = request.body as { type?: unknown; targetId?: unknown } | undefined;
    try {
      return ok(shares.findOrCreatePublicShare(body?.type, body?.targetId, request.authUser!));
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

  app.get("/s/:token/:variant", async (request, reply) => {
    const { token, variant } = request.params as { token: string; variant: string };
    if (variant !== "original" && variant !== "thumbnail") {
      return reply.status(404).type("text/html; charset=utf-8").send(page("分享不存在", "<h1>分享不存在或已失效</h1>"));
    }
    const share = shares.findPublicShare(token);
    if (!share || share.type !== "asset") return reply.status(404).send(fail(4004, "public asset share not found"));
    const asset = assets.findById(share.targetId);
    if (!asset) return reply.status(404).send(fail(4002, "asset not found"));
    return sendAssetFile(reply, asset, variant);
  });

  app.get("/s/:token/assets/:assetId/:variant", async (request, reply) => {
    const { token, assetId, variant } = request.params as { token: string; assetId: string; variant: string };
    if (variant !== "original" && variant !== "thumbnail") return reply.status(404).send(fail(4004, "public asset route not found"));
    const share = shares.findPublicShare(token);
    if (!share || share.type !== "album") return reply.status(404).send(fail(4004, "public album share not found"));
    const asset = assets.findById(assetId);
    if (!asset || asset.albumId !== share.targetId) return reply.status(404).send(fail(4002, "asset not found in public share"));
    return sendAssetFile(reply, asset, variant);
  });

  app.get("/s/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const share = shares.findPublicShare(token);
    if (!share) return reply.status(404).type("text/html; charset=utf-8").send(page("分享不存在", "<h1>分享不存在或已失效</h1>"));

    if (share.type === "asset") {
      const asset = assets.findById(share.targetId);
      if (!asset) return reply.status(404).type("text/html; charset=utf-8").send(page("图片不存在", "<h1>图片不存在</h1>"));
      return reply
        .type("text/html; charset=utf-8")
        .send(
          page(
            asset.name,
            `<h1>${htmlEscape(asset.name)}</h1><div class="asset"><a href="${shareAssetUrl(token, "original")}"><img src="${shareAssetUrl(
              token,
              "thumbnail"
            )}" alt="${htmlEscape(asset.name)}"></a></div>`
          )
        );
    }

    const album = albums.findById(share.targetId);
    if (!album) return reply.status(404).type("text/html; charset=utf-8").send(page("相册不存在", "<h1>相册不存在</h1>"));
    const assetPage = assets.listByAlbum(album.id, 1, 300);
    const items = (assetPage?.items ?? [])
      .map(
        (asset) =>
          `<a class="item" href="${shareAlbumAssetUrl(token, asset.id, "original")}"><img src="${shareAlbumAssetUrl(
            token,
            asset.id,
            "thumbnail"
          )}" alt="${htmlEscape(asset.name)}"><span>${htmlEscape(asset.name)}</span></a>`
      )
      .join("");
    return reply
      .type("text/html; charset=utf-8")
      .send(page(album.name, `<h1>${htmlEscape(album.name)}</h1><p>${album.assetCount} 张</p><div class="grid">${items}</div>`));
  });
};
