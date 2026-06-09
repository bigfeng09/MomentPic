import type { FastifyInstance } from "fastify";
import { fail, ok } from "../lib/api.js";
import { GalleryRepository } from "../repositories/gallery-repository.js";

export const galleryRoutes = async (app: FastifyInstance): Promise<void> => {
  const galleries = new GalleryRepository(app.db);
  const requireAdmin = (request: { authUser?: { role: string } }, reply: { status: (code: number) => { send: (payload: unknown) => unknown } }) => {
    if (request.authUser?.role === "admin") return true;
    reply.status(403).send(fail(4030, "admin only"));
    return false;
  };

  app.get("/api/v2/galleries", async () => ok({ items: galleries.list() }));
  app.get("/api/v2/library-roots", async () => ok({ items: galleries.list() }));

  app.post("/api/v2/galleries", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const body = request.body as { name?: unknown; path?: unknown } | undefined;
    try {
      const item = galleries.create({ name: body?.name, path: body?.path, allowedPrefixes: app.config.libraryRootAllowedPrefixes });
      return ok({
        item,
        created: true,
        scan: {
          dryRunAvailable: true,
          message: "Library root was registered only. Use POST /api/v2/galleries/:id/scan with dryRun=true to preview; dryRun=false imports after a DB backup guard."
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "gallery create failed";
      const status = message === "library path already exists" ? 409 : 400;
      return reply.status(status).send(fail(status === 409 ? 4009 : 4000, message));
    }
  });

  app.patch("/api/v2/galleries/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = request.body as { name?: unknown; enabled?: unknown } | undefined;
    try {
      const item = galleries.update(id, { name: body?.name, enabled: body?.enabled });
      if (!item) return reply.status(404).send(fail(4004, "gallery not found"));
      return ok({ item });
    } catch (error) {
      const message = error instanceof Error ? error.message : "gallery update failed";
      return reply.status(400).send(fail(4000, message));
    }
  });

  app.post("/api/v2/galleries/:id/scan", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = request.body as { dryRun?: unknown; fast?: unknown } | undefined;
    const dryRun = body?.dryRun !== false;
    const gallery = app.db.prepare("SELECT id FROM library_roots WHERE id = ?").get(id) as { id: string } | undefined;
    if (!gallery) return reply.status(404).send(fail(4004, "gallery not found"));
    const task = app.scanTasks.enqueue({ dryRun, galleryId: id, createdBy: request.authUser!.username, fast: body?.fast === true });
    return reply.status(202).send(ok({ ...task, message: "scan task queued; poll GET /api/v2/scan/" + encodeURIComponent(task.taskId) }));
  });
};
