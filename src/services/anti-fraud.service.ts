import { redis } from "../infra/redis.js";
import { env } from "../config/env.js";

export type AntiFraudResult = {
  blocked: boolean;
  reason?: string;
};

export const antiFraudService = {
  async checkClick(params: {
    ipHash: string;
    uaHash: string;
    token: string;
  }): Promise<AntiFraudResult> {
    const minuteKey = `rf:click:minute:${params.ipHash}`;
    const lastClickKey = `rf:click:last:${params.ipHash}:${params.token}`;

    const pipeline = redis.multi();
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 60, "NX");
    pipeline.get(lastClickKey);
    const result = await pipeline.exec();

    if (!result) {
      return { blocked: false };
    }

    const minuteHits = Number(result[0]?.[1] ?? 0);
    const lastClickTsRaw = result[2]?.[1] as string | null;

    if (minuteHits > env.CLICK_RATE_LIMIT_PER_MINUTE) {
      return { blocked: true, reason: "RATE_LIMIT_IP" };
    }

    const nowTs = Date.now();
    if (lastClickTsRaw) {
      const diff = nowTs - Number(lastClickTsRaw);
      if (diff < env.MIN_CLICK_INTERVAL_MS) {
        return { blocked: true, reason: "CLICK_TOO_FAST" };
      }
    }

    await redis.set(lastClickKey, String(nowTs), "EX", Math.ceil(env.MIN_CLICK_INTERVAL_MS / 1000) + 3);

    return { blocked: false };
  }
};
