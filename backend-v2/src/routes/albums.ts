import type { FastifyInstance } from "fastify";
import { fail, ok, pageFromQuery, pageSizeFromQuery } from "../lib/api.js";
import { AlbumRepository } from "../repositories/album-repository.js";
import { AssetRepository } from "../repositories/asset-repository.js";

export const albumRoutes = async (app: FastifyInstance): Promise<void> => {
  const albums = new AlbumRepository(app.db);
  const assets = new AssetRepository(app.db);

  app.get("/api/v2/albums", async (request) => {
    const query = request.query as {
      galleryId?: string;
      page?: string;
      pageSize?: string;
      keyword?: string;
      sortBy?: string;
      sortOrder?: string;
      includeTotal?: string;
    };
    return ok(
      albums.list({
        galleryId: query.galleryId,
        keyword: query.keyword,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        includeTotal: query.includeTotal !== "false",
        user: request.authUser,
        page: pageFromQuery(query.page),
        pageSize: pageSizeFromQuery(query.pageSize, 24, 100)
      })
    );
  });

  app.get("/api/v2/albums/:albumId", async (request, reply) => {
    const { albumId } = request.params as { albumId: string };
    const album = albums.findById(albumId);
    if (!album) return reply.status(404).send(fail(4001, "album not found"));
    if (!albums.canAccessAlbum(albumId, request.authUser)) return reply.status(403).send(fail(4031, "album not shared with current user"));
    return ok(album);
  });

  app.get("/api/v2/albums/:albumId/assets", async (request, reply) => {
    const { albumId } = request.params as { albumId: string };
    const query = request.query as { page?: string; pageSize?: string; includeTotal?: string };
    if (!albums.canAccessAlbum(albumId, request.authUser)) return reply.status(403).send(fail(4031, "album not shared with current user"));
    const payload = assets.listByAlbum(
      albumId,
      pageFromQuery(query.page),
      pageSizeFromQuery(query.pageSize, 120, 300),
      query.includeTotal !== "false"
    );
    if (!payload) return reply.status(404).send(fail(4001, "album not found"));
    return ok(payload);
  });
};
