import { Prisma } from "@prisma/client";
export type PaymentFeeConfig = {
    feePercent: Prisma.Decimal;
    fixedFeeRub: Prisma.Decimal;
};
export type PaymentBreakdown = {
    grossAmount: Prisma.Decimal;
    paymentFeeAmount: Prisma.Decimal;
    netAmount: Prisma.Decimal;
    platformCommission: Prisma.Decimal;
    adminRewardTotal: Prisma.Decimal;
};
export declare const decimal: (value: Prisma.Decimal.Value) => Prisma.Decimal;
export declare const calculatePaymentBreakdown: (params: {
    grossAmount: Prisma.Decimal.Value;
    fee: PaymentFeeConfig;
    platformCommissionPercent: Prisma.Decimal.Value;
    totalQuota: number;
    adminRewardRub: Prisma.Decimal.Value;
}) => PaymentBreakdown;
