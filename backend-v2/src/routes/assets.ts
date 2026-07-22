import type { FastifyInstance, FastifyReply } from "fastify";
import { fail, ok, pageFromQuery, pageSizeFromQuery } from "../lib/api.js";
import { AlbumRepository } from "../repositories/album-repository.js";
import { AssetRepository } from "../repositories/asset-repository.js";
import { sendAssetFile } from "../services/asset-file.js";
import type { AssetDto, AuthUser } from "../types/domain.js";

export const assetRoutes = async (app: FastifyInstance): Promise<void> => {
  const albums = new AlbumRepository(app.db);
  const assets = new AssetRepository(app.db);

  app.get("/api/v2/assets", async (request) => {
    const query = request.query as {
      galleryId?: string; albumId?: string; keyword?: string; from?: string; to?: string;
      extension?: string; orientation?: string; sortBy?: string; sortOrder?: string;
      page?: string; pageSize?: string; includeTotal?: string;
    };
    return ok(assets.search({
      user: request.authUser!,
      page: pageFromQuery(query.page),
      pageSize: pageSizeFromQuery(query.pageSize, 60, 200),
      includeTotal: query.includeTotal !== "false",
      galleryId: query.galleryId?.trim() || undefined,
      albumId: query.albumId?.trim() || undefined,
      keyword: query.keyword?.trim() || undefined,
      from: query.from?.trim() || undefined,
      to: query.to?.trim() || undefined,
      extension: query.extension?.trim() || undefined,
      orientation: query.orientation?.trim(),
      sortBy: query.sortBy?.trim(),
      sortOrder: query.sortOrder?.trim()
    }));
  });

  const findAccessibleAsset = (assetId: string, request: { authUser?: AuthUser }, reply: FastifyReply) => {
    const asset = assets.findById(assetId);
    if (!asset) {
      reply.status(404).send(fail(4002, "asset not found"));
      return null;
    }
    if (!albums.canAccessAlbum(asset.albumId, request.authUser)) {
      reply.status(403).send(fail(4031, "asset album not shared with current user"));
      return null;
    }
    return asset;
  };

  app.get("/api/v2/assets/:assetId", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const asset = findAccessibleAsset(assetId, request, reply);
    if (!asset) return;
    return ok(asset);
  });

  app.get("/api/v2/assets/:assetId/original", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const asset = findAccessibleAsset(assetId, request, reply);
    if (!asset) return;
    return sendAssetFile(reply, asset, "original");
  });

  app.get("/api/v2/assets/:assetId/thumbnail", async (request, reply) => {
    const { assetId } = request.params as { assetId: string };
    const asset = findAccessibleAsset(assetId, request, reply);
    if (!asset) return;
    return sendAssetFile(reply, asset, "thumbnail");
  });
};
