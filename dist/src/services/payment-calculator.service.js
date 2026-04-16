"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePaymentBreakdown = exports.decimal = void 0;
const client_1 = require("@prisma/client");
const decimal = (value) => new client_1.Prisma.Decimal(value);
exports.decimal = decimal;
const calculatePaymentBreakdown = (params) => {
    const gross = (0, exports.decimal)(params.grossAmount);
    const feeAmountFromPercent = gross.mul(params.fee.feePercent).div(100);
    const paymentFeeAmount = feeAmountFromPercent.add(params.fee.fixedFeeRub).toDecimalPlaces(2);
    const netAmount = client_1.Prisma.Decimal.max(gross.sub(paymentFeeAmount), (0, exports.decimal)(0)).toDecimalPlaces(2);
    const platformCommission = netAmount.mul(params.platformCommissionPercent).div(100).toDecimalPlaces(2);
    const adminRewardTotal = (0, exports.decimal)(params.adminRewardRub).mul(params.totalQuota).toDecimalPlaces(2);
    return {
        grossAmount: gross.toDecimalPlaces(2),
        paymentFeeAmount,
        netAmount,
        platformCommission,
        adminRewardTotal
    };
};
exports.calculatePaymentBreakdown = calculatePaymentBreakdown;
