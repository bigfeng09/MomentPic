import type { FastifyInstance, FastifyReply } from "fastify";
import { fail, ok } from "../lib/api.js";
import { AlbumRepository } from "../repositories/album-repository.js";
import { AssetRepository } from "../repositories/asset-repository.js";
import { sendAssetFile } from "../services/asset-file.js";
import type { AssetDto, AuthUser } from "../types/domain.js";

export const assetRoutes = async (app: FastifyInstance): Promise<void> => {
  const albums = new AlbumRepository(app.db);
  const assets = new AssetRepository(app.db);

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
