"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const swagger_1 = __importDefault(require("@fastify/swagger"));
const swagger_ui_1 = __importDefault(require("@fastify/swagger-ui"));
const env_js_1 = require("./config/env.js");
const redis_js_1 = require("./infra/redis.js");
const prisma_js_1 = require("./infra/prisma.js");
const register_routes_js_1 = require("./api/register-routes.js");
const create_bot_js_1 = require("./bot/create-bot.js");
const error_js_1 = require("./middleware/error.js");
const start = async () => {
    const app = (0, fastify_1.default)({
        logger: {
            level: env_js_1.env.LOG_LEVEL
        }
    });
    app.setErrorHandler(error_js_1.globalErrorHandler);
    await app.register(cors_1.default, {
        origin: true
    });
    await app.register(multipart_1.default, {
        limits: {
            fileSize: 5 * 1024 * 1024
        }
    });
    await app.register(swagger_1.default, {
        openapi: {
            info: {
                title: "GateBox API",
                version: "1.0.0"
            }
        }
    });
    await app.register(swagger_ui_1.default, {
        routePrefix: "/docs"
    });
    await redis_js_1.redis.connect();
    const bot = (0, create_bot_js_1.createBot)();
    app.post("/telegram/webhook/:secret", async (request, reply) => {
        const secret = request.params.secret;
        if (secret !== env_js_1.env.TELEGRAM_WEBHOOK_SECRET) {
            reply.code(401).send({ message: "Invalid webhook secret" });
            return;
        }
        await bot.handleUpdate(request.body);
        reply.send({ ok: true });
    });
    await (0, register_routes_js_1.registerRoutes)(app, {
        telegramClient: {
            getChatMember: (chatId, userId) => bot.telegram.getChatMember(chatId, userId)
        }
    });
    const webhookUrl = `${env_js_1.env.DOMAIN_BASE.replace(/\/$/, "")}/telegram/webhook/${env_js_1.env.TELEGRAM_WEBHOOK_SECRET}`;
    await bot.telegram.setWebhook(webhookUrl, {
        allowed_updates: ["message", "callback_query"]
    });
    app.log.info({ webhookUrl }, "Telegram webhook configured");
    await app.listen({
        port: env_js_1.env.PORT,
        host: "0.0.0.0"
    });
    const graceful = async (signal) => {
        app.log.warn({ signal }, "Shutdown signal received");
        await app.close();
        await prisma_js_1.prisma.$disconnect();
        await redis_js_1.redis.quit();
        bot.stop(signal);
        process.exit(0);
    };
    process.on("SIGINT", () => void graceful("SIGINT"));
    process.on("SIGTERM", () => void graceful("SIGTERM"));
};
void start();
