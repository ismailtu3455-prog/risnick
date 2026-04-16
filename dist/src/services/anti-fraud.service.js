"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.antiFraudService = void 0;
const redis_js_1 = require("../infra/redis.js");
const env_js_1 = require("../config/env.js");
exports.antiFraudService = {
    async checkClick(params) {
        const minuteKey = `rf:click:minute:${params.ipHash}`;
        const lastClickKey = `rf:click:last:${params.ipHash}:${params.token}`;
        const pipeline = redis_js_1.redis.multi();
        pipeline.incr(minuteKey);
        pipeline.expire(minuteKey, 60, "NX");
        pipeline.get(lastClickKey);
        const result = await pipeline.exec();
        if (!result) {
            return { blocked: false };
        }
        const minuteHits = Number(result[0]?.[1] ?? 0);
        const lastClickTsRaw = result[2]?.[1];
        if (minuteHits > env_js_1.env.CLICK_RATE_LIMIT_PER_MINUTE) {
            return { blocked: true, reason: "RATE_LIMIT_IP" };
        }
        const nowTs = Date.now();
        if (lastClickTsRaw) {
            const diff = nowTs - Number(lastClickTsRaw);
            if (diff < env_js_1.env.MIN_CLICK_INTERVAL_MS) {
                return { blocked: true, reason: "CLICK_TOO_FAST" };
            }
        }
        await redis_js_1.redis.set(lastClickKey, String(nowTs), "EX", Math.ceil(env_js_1.env.MIN_CLICK_INTERVAL_MS / 1000) + 3);
        return { blocked: false };
    }
};
