import { FastifyInstance } from "fastify";
import type { TelegramMembershipClient } from "../services/subscription.service.js";
export declare const registerRoutes: (app: FastifyInstance, deps: {
    telegramClient: TelegramMembershipClient;
}) => Promise<void>;
