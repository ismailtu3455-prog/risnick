import { FastifyReply, FastifyRequest } from "fastify";
import type { AuthRole } from "../types/auth.js";
export declare const requireRoles: (allowed: AuthRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
