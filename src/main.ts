import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { env } from "./config/env.js";
import { redis } from "./infra/redis.js";
import { prisma } from "./infra/prisma.js";
import { registerRoutes } from "./api/register-routes.js";
import { createBot } from "./bot/create-bot.js";
import { globalErrorHandler } from "./middleware/error.js";

const start = async (): Promise<void> => {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL
    }
  });

  app.setErrorHandler(globalErrorHandler);

  await app.register(cors, {
    origin: true
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024
    }
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "GateBox API",
        version: "1.0.0"
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs"
  });

  await redis.connect();

  const bot = createBot();

  app.post("/telegram/webhook/:secret", async (request, reply) => {
    const secret = (request.params as { secret: string }).secret;
    if (secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      reply.code(401).send({ message: "Invalid webhook secret" });
      return;
    }

    await bot.handleUpdate(request.body as any);
    reply.send({ ok: true });
  });

  await registerRoutes(app, {
    telegramClient: {
      getChatMember: (chatId: string, userId: number) => bot.telegram.getChatMember(chatId, userId)
    }
  });

  const webhookUrl = `${env.DOMAIN_BASE.replace(/\/$/, "")}/telegram/webhook/${env.TELEGRAM_WEBHOOK_SECRET}`;
  await bot.telegram.setWebhook(webhookUrl, {
    allowed_updates: ["message", "callback_query"]
  });

  app.log.info({ webhookUrl }, "Telegram webhook configured");

  await app.listen({
    port: env.PORT,
    host: "0.0.0.0"
  });

  const graceful = async (signal: string) => {
    app.log.warn({ signal }, "Shutdown signal received");
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    bot.stop(signal);
    process.exit(0);
  };

  process.on("SIGINT", () => void graceful("SIGINT"));
  process.on("SIGTERM", () => void graceful("SIGTERM"));
};

void start();
