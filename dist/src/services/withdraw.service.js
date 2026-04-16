"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawService = void 0;
const client_1 = require("@prisma/client");
const prisma_js_1 = require("../infra/prisma.js");
const payment_calculator_service_js_1 = require("./payment-calculator.service.js");
exports.withdrawService = {
    async createAdminWithdrawRequest(params) {
        return prisma_js_1.prisma.$transaction(async (tx) => {
            const balance = await tx.adminBalance.findUnique({ where: { adminId: params.adminId } });
            if (!balance) {
                throw new Error("ADMIN_BALANCE_NOT_FOUND");
            }
            const amount = (0, payment_calculator_service_js_1.decimal)(params.amount);
            if (balance.availableAmount.lessThan(amount)) {
                throw new Error("INSUFFICIENT_ADMIN_BALANCE");
            }
            await tx.adminBalance.update({
                where: { id: balance.id },
                data: {
                    availableAmount: { decrement: amount },
                    pendingAmount: { increment: amount }
                }
            });
            return tx.withdrawRequest.create({
                data: {
                    requesterType: "ADMIN",
                    adminId: params.adminId,
                    amount,
                    details: (params.details ?? {})
                }
            });
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    },
    async createSponsorWithdrawRequest(params) {
        return prisma_js_1.prisma.withdrawRequest.create({
            data: {
                requesterType: "SPONSOR",
                sponsorId: params.sponsorId,
                amount: (0, payment_calculator_service_js_1.decimal)(params.amount),
                details: (params.details ?? {})
            }
        });
    }
};
