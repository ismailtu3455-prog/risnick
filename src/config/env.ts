import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DOMAIN_BASE: z.string().url(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  TELEGRAM_SUPER_ADMIN_ID: z.coerce.bigint(),

  SUPER_ADMIN_API_KEY: z.string().min(1),
  ADMIN_API_KEY: z.string().min(1),
  SPONSOR_API_KEY: z.string().min(1),
  MODERATOR_API_KEY: z.string().min(1),

  ADMIN_REWARD_RUB: z.coerce.number().positive().default(1),
  PLATFORM_COMMISSION_PERCENT: z.coerce.number().min(0).max(100).default(8),
  MAX_SPONSORS_PER_OFFER: z.coerce.number().int().min(1).max(20).default(7),
  CLICK_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(30),
  MIN_CLICK_INTERVAL_MS: z.coerce.number().int().min(250).default(2500),

  CRYPTO_PAY_API_TOKEN: z.string().optional(),
  YOOMONEY_QUICKPAY_TEMPLATE: z.string().min(1),
  YOOKASSA_ENABLED: z.coerce.boolean().default(false),
  YOOKASSA_SHOP_ID: z.string().optional(),
  YOOKASSA_SECRET_KEY: z.string().optional(),

  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  throw new Error("ENV_VALIDATION_FAILED");
}

export const env = parsed.data;
