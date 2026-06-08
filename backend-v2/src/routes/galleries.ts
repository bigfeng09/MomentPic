import type { FastifyInstance } from "fastify";
import { ok } from "../lib/api.js";
import { GalleryRepository } from "../repositories/gallery-repository.js";

export const galleryRoutes = async (app: FastifyInstance): Promise<void> => {
  const galleries = new GalleryRepository(app.db);

  app.get("/api/v2/galleries", async () => ok({ items: galleries.list() }));
};
