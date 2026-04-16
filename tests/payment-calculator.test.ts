import { describe, expect, it } from "vitest";
import { calculatePaymentBreakdown, decimal } from "../src/services/payment-calculator.service.js";

describe("calculatePaymentBreakdown", () => {
  it("calculates fee/net/commission/admin pool", () => {
    const result = calculatePaymentBreakdown({
      grossAmount: 1000,
      fee: {
        feePercent: decimal(3),
        fixedFeeRub: decimal(10)
      },
      platformCommissionPercent: decimal(8),
      totalQuota: 500,
      adminRewardRub: decimal(1)
    });

    expect(result.grossAmount.toNumber()).toBe(1000);
    expect(result.paymentFeeAmount.toNumber()).toBe(40);
    expect(result.netAmount.toNumber()).toBe(960);
    expect(result.platformCommission.toNumber()).toBe(76.8);
    expect(result.adminRewardTotal.toNumber()).toBe(500);
  });

  it("never returns negative net", () => {
    const result = calculatePaymentBreakdown({
      grossAmount: 5,
      fee: {
        feePercent: decimal(10),
        fixedFeeRub: decimal(50)
      },
      platformCommissionPercent: decimal(8),
      totalQuota: 100,
      adminRewardRub: decimal(1)
    });

    expect(result.netAmount.toNumber()).toBe(0);
    expect(result.platformCommission.toNumber()).toBe(0);
  });
});
