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

export const decimal = (value: Prisma.Decimal.Value): Prisma.Decimal => new Prisma.Decimal(value);

export const calculatePaymentBreakdown = (params: {
  grossAmount: Prisma.Decimal.Value;
  fee: PaymentFeeConfig;
  platformCommissionPercent: Prisma.Decimal.Value;
  totalQuota: number;
  adminRewardRub: Prisma.Decimal.Value;
}): PaymentBreakdown => {
  const gross = decimal(params.grossAmount);
  const feeAmountFromPercent = gross.mul(params.fee.feePercent).div(100);
  const paymentFeeAmount = feeAmountFromPercent.add(params.fee.fixedFeeRub).toDecimalPlaces(2);
  const netAmount = Prisma.Decimal.max(gross.sub(paymentFeeAmount), decimal(0)).toDecimalPlaces(2);
  const platformCommission = netAmount.mul(params.platformCommissionPercent).div(100).toDecimalPlaces(2);
  const adminRewardTotal = decimal(params.adminRewardRub).mul(params.totalQuota).toDecimalPlaces(2);

  return {
    grossAmount: gross.toDecimalPlaces(2),
    paymentFeeAmount,
    netAmount,
    platformCommission,
    adminRewardTotal
  };
};
