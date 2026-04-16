"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(3000),
    DOMAIN_BASE: zod_1.z.string().url(),
    DATABASE_URL: zod_1.z.string().min(1),
    REDIS_URL: zod_1.z.string().min(1),
    TELEGRAM_BOT_TOKEN: zod_1.z.string().min(1),
    TELEGRAM_BOT_USERNAME: zod_1.z.string().min(1),
    TELEGRAM_WEBHOOK_SECRET: zod_1.z.string().min(1),
    TELEGRAM_SUPER_ADMIN_ID: zod_1.z.coerce.bigint(),
    SUPER_ADMIN_API_KEY: zod_1.z.string().min(1),
    ADMIN_API_KEY: zod_1.z.string().min(1),
    SPONSOR_API_KEY: zod_1.z.string().min(1),
    MODERATOR_API_KEY: zod_1.z.string().min(1),
    ADMIN_REWARD_RUB: zod_1.z.coerce.number().positive().default(1),
    PLATFORM_COMMISSION_PERCENT: zod_1.z.coerce.number().min(0).max(100).default(8),
    MAX_SPONSORS_PER_OFFER: zod_1.z.coerce.number().int().min(1).max(20).default(7),
    CLICK_RATE_LIMIT_PER_MINUTE: zod_1.z.coerce.number().int().min(1).default(30),
    MIN_CLICK_INTERVAL_MS: zod_1.z.coerce.number().int().min(250).default(2500),
    CRYPTO_PAY_API_TOKEN: zod_1.z.string().optional(),
    YOOMONEY_QUICKPAY_TEMPLATE: zod_1.z.string().min(1),
    YOOKASSA_ENABLED: zod_1.z.coerce.boolean().default(false),
    YOOKASSA_SHOP_ID: zod_1.z.string().optional(),
    YOOKASSA_SECRET_KEY: zod_1.z.string().optional(),
    LOG_LEVEL: zod_1.z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info")
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
    throw new Error("ENV_VALIDATION_FAILED");
}
exports.env = parsed.data;
