import { PaymentMethod, Prisma } from "@prisma/client";
export declare const paymentConfigService: {
    getFeeConfig(method: PaymentMethod): Promise<{
        feePercent: Prisma.Decimal;
        fixedFeeRub: Prisma.Decimal;
    }>;
    getPlatformCommissionPercent(): Prisma.Decimal;
    getAdminRewardRub(): Prisma.Decimal;
};
