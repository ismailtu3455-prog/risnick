import { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import type { AuthRole } from "../types/auth.js";

const roleKeys: Record<AuthRole, string | undefined> = {
  SUPER_ADMIN: env.SUPER_ADMIN_API_KEY,
  ADMIN: env.ADMIN_API_KEY,
  SPONSOR: env.SPONSOR_API_KEY,
  MODERATOR: env.MODERATOR_API_KEY,
  SYSTEM: undefined
};

const parseActorTelegramId = (request: FastifyRequest): bigint | undefined => {
  const raw = request.headers["x-telegram-id"];
  if (!raw || Array.isArray(raw)) {
    return undefined;
  }

  try {
    return BigInt(raw);
  } catch {
    return undefined;
  }
};

export const requireRoles = (allowed: AuthRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const apiKey = request.headers["x-api-key"];
    const rawRole = request.headers["x-role"];

    if (!apiKey || Array.isArray(apiKey) || !rawRole || Array.isArray(rawRole)) {
      reply.code(401).send({ message: "Unauthorized" });
      return;
    }

    const role = rawRole.toUpperCase() as AuthRole;
    if (!allowed.includes(role)) {
      reply.code(403).send({ message: "Forbidden for role" });
      return;
    }

    if (role !== "SYSTEM" && roleKeys[role] !== apiKey) {
      reply.code(401).send({ message: "Invalid API key" });
      return;
    }

    request.auth = {
      role,
      actorTelegramId: parseActorTelegramId(request)
    };
  };
};
