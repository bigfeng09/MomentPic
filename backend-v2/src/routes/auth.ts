import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { fail, ok } from "../lib/api.js";
import { buildAuthCookie, buildClearAuthCookie, createAuthToken, normalizeUsername, verifyPassword } from "../lib/auth.js";
import { UserRepository } from "../repositories/user-repository.js";

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  const users = new UserRepository(app.db);
  const requireAdmin = (request: { authUser?: { role: string } }, reply: { status: (code: number) => { send: (payload: unknown) => unknown } }) => {
    if (request.authUser?.role === "admin") return true;
    reply.status(403).send(fail(4030, "admin only"));
    return false;
  };

  app.post("/api/v2/auth/login", async (request, reply) => {
    const body = request.body as { username?: unknown; password?: unknown } | undefined;
    const username = normalizeUsername(body?.username);
    const password = String(body?.password ?? "");
    if (!username || !password) return reply.status(400).send(fail(4000, "username and password required"));

    const user = users.findByUsername(username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return reply.status(401).send(fail(4010, "用户名或密码错误"));
    }

    const expiresAtMs = Date.now() + app.config.cookieTtlSeconds * 1000;
    const authUser = { username: user.username, role: user.role };
    const token = createAuthToken(app.config.authSecret, authUser, expiresAtMs);
    reply.header("set-cookie", buildAuthCookie(app.config, token));
    return ok({ ...authUser, expiresAt: new Date(expiresAtMs).toISOString() });
  });

  app.post("/api/v2/auth/logout", async (_request, reply) => {
    reply.header("set-cookie", buildClearAuthCookie(app.config));
    return ok({ success: true });
  });

  app.get("/api/v2/me", async (request) => ok({ user: request.authUser }));

  app.get("/api/v2/users", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    return ok({ items: users.list() });
  });

  app.post("/api/v2/users", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const body = request.body as { username?: unknown; password?: unknown; role?: unknown } | undefined;
    try {
      return ok(users.upsert(body?.username, String(body?.password ?? ""), body?.role));
    } catch (error) {
      return reply.status(400).send(fail(4000, error instanceof Error ? error.message : "user upsert failed"));
    }
  });

  const updateUserHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;
    const params = request.params as { username: string };
    const body = request.body as { username?: unknown; password?: unknown; role?: unknown } | undefined;
    try {
      return ok(users.update(params.username, body?.username ?? params.username, String(body?.password ?? ""), body?.role, app.config.adminUsername));
    } catch (error) {
      const message = error instanceof Error ? error.message : "user update failed";
      const status = message === "user not found" ? 404 : 400;
      return reply.status(status).send(fail(status === 404 ? 4001 : 4000, message));
    }
  };

  app.patch("/api/v2/users/:username", updateUserHandler);
  app.post("/api/v2/users/:username", updateUserHandler);

  app.delete("/api/v2/users/:username", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = request.params as { username: string };
    try {
      users.delete(params.username, app.config.adminUsername);
      return ok({ success: true });
    } catch (error) {
      return reply.status(400).send(fail(4000, error instanceof Error ? error.message : "user delete failed"));
    }
  });

  app.post("/api/v2/users/:username/delete", async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const params = request.params as { username: string };
    try {
      users.delete(params.username, app.config.adminUsername);
      return ok({ success: true });
    } catch (error) {
      return reply.status(400).send(fail(4000, error instanceof Error ? error.message : "user delete failed"));
    }
  });
};
