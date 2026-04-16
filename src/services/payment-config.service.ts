import { PaymentMethod, Prisma } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../infra/prisma.js";
import { decimal } from "./payment-calculator.service.js";

const fallbackByMethod: Record<PaymentMethod, { feePercent: number; fixedFeeRub: number }> = {
  CRYPTOBOT: { feePercent: 2.5, fixedFeeRub: 0 },
  YOOMONEY_MANUAL: { feePercent: 3.5, fixedFeeRub: 0 },
  YOOKASSA: { feePercent: 3.0, fixedFeeRub: 0 }
};

export const paymentConfigService = {
  async getFeeConfig(method: PaymentMethod): Promise<{ feePercent: Prisma.Decimal; fixedFeeRub: Prisma.Decimal }> {
    const dbConfig = await prisma.paymentMethodConfig.findUnique({ where: { method } });
    if (dbConfig) {
      return {
        feePercent: dbConfig.feePercent,
        fixedFeeRub: dbConfig.fixedFeeRub
      };
    }

    const fallback = fallbackByMethod[method];
    return {
      feePercent: decimal(fallback.feePercent),
      fixedFeeRub: decimal(fallback.fixedFeeRub)
    };
  },

  getPlatformCommissionPercent(): Prisma.Decimal {
    return decimal(env.PLATFORM_COMMISSION_PERCENT);
  },

  getAdminRewardRub(): Prisma.Decimal {
    return decimal(env.ADMIN_REWARD_RUB);
  }
};
