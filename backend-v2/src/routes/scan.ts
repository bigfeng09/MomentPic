import type { FastifyInstance } from "fastify";
import { fail, ok } from "../lib/api.js";

export const scanRoutes = async (app: FastifyInstance): Promise<void> => {
  const requireAdmin = (request: { authUser?: { role: string } }, reply: { status: (code: number) => { send: (payload: unknown) => unknown } }) => {
    if (request.authUser?.role === "admin") return true;
    reply.status(403).send(fail(4030, "admin only"));
    return false;
  };

  app.post("/api/v2/scan", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const body = request.body as { dryRun?: unknown; galleryId?: unknown; fast?: unknown } | undefined;
    const dryRun = body?.dryRun !== false;
    const galleryId = body?.galleryId == null ? null : String(body.galleryId).trim();
    const task = app.scanTasks.enqueue({ dryRun, galleryId: galleryId || null, createdBy: request.authUser!.username, fast: body?.fast === true });
    return reply.status(202).send(ok({ ...task, message: "scan task queued; poll GET /api/v2/scan/" + encodeURIComponent(task.taskId) }));
  });

  app.get("/api/v2/scan/:taskId", async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const task = app.scanTasks.get(taskId);
    if (!task) return reply.status(404).send(fail(4004, "scan task not found"));
    return ok(task);
  });

  app.get("/api/v2/scan", async () => {
    return ok({ latestActive: app.scanTasks.latestActive(), items: app.scanTasks.list(50) });
  });
};
