import type { FastifyInstance } from "fastify";
import { ok } from "../lib/api.js";

export const healthRoutes = async (app: FastifyInstance): Promise<void> => {
  app.get("/api/v2/health", async () => ok({ status: "ok", version: "v2" }));
};
