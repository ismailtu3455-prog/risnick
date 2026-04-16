"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRoles = void 0;
const env_js_1 = require("../config/env.js");
const roleKeys = {
    SUPER_ADMIN: env_js_1.env.SUPER_ADMIN_API_KEY,
    ADMIN: env_js_1.env.ADMIN_API_KEY,
    SPONSOR: env_js_1.env.SPONSOR_API_KEY,
    MODERATOR: env_js_1.env.MODERATOR_API_KEY,
    SYSTEM: undefined
};
const parseActorTelegramId = (request) => {
    const raw = request.headers["x-telegram-id"];
    if (!raw || Array.isArray(raw)) {
        return undefined;
    }
    try {
        return BigInt(raw);
    }
    catch {
        return undefined;
    }
};
const requireRoles = (allowed) => {
    return async (request, reply) => {
        const apiKey = request.headers["x-api-key"];
        const rawRole = request.headers["x-role"];
        if (!apiKey || Array.isArray(apiKey) || !rawRole || Array.isArray(rawRole)) {
            reply.code(401).send({ message: "Unauthorized" });
            return;
        }
        const role = rawRole.toUpperCase();
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
exports.requireRoles = requireRoles;
