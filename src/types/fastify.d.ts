import "fastify";
import type { AuthRole } from "./auth.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: {
      role: AuthRole;
      actorTelegramId?: bigint;
    };
  }
}
