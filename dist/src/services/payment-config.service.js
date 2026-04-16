"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentConfigService = void 0;
const env_js_1 = require("../config/env.js");
const prisma_js_1 = require("../infra/prisma.js");
const payment_calculator_service_js_1 = require("./payment-calculator.service.js");
const fallbackByMethod = {
    CRYPTOBOT: { feePercent: 2.5, fixedFeeRub: 0 },
    YOOMONEY_MANUAL: { feePercent: 3.5, fixedFeeRub: 0 },
    YOOKASSA: { feePercent: 3.0, fixedFeeRub: 0 }
};
exports.paymentConfigService = {
    async getFeeConfig(method) {
        const dbConfig = await prisma_js_1.prisma.paymentMethodConfig.findUnique({ where: { method } });
        if (dbConfig) {
            return {
                feePercent: dbConfig.feePercent,
                fixedFeeRub: dbConfig.fixedFeeRub
            };
        }
        const fallback = fallbackByMethod[method];
        return {
            feePercent: (0, payment_calculator_service_js_1.decimal)(fallback.feePercent),
            fixedFeeRub: (0, payment_calculator_service_js_1.decimal)(fallback.fixedFeeRub)
        };
    },
    getPlatformCommissionPercent() {
        return (0, payment_calculator_service_js_1.decimal)(env_js_1.env.PLATFORM_COMMISSION_PERCENT);
    },
    getAdminRewardRub() {
        return (0, payment_calculator_service_js_1.decimal)(env_js_1.env.ADMIN_REWARD_RUB);
    }
};
