import type { AuthUser } from "./domain.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}
