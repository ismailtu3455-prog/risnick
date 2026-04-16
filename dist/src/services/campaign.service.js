"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignService = void 0;
const client_1 = require("@prisma/client");
const prisma_js_1 = require("../infra/prisma.js");
const payment_calculator_service_js_1 = require("./payment-calculator.service.js");
const payment_config_service_js_1 = require("./payment-config.service.js");
exports.campaignService = {
    async createCampaign(params) {
        const trafficPackage = await prisma_js_1.prisma.trafficPackage.findFirst({
            where: {
                id: params.trafficPackageId,
                isActive: true
            }
        });
        if (!trafficPackage) {
            throw new Error("TRAFFIC_PACKAGE_NOT_FOUND");
        }
        const fee = await payment_config_service_js_1.paymentConfigService.getFeeConfig(params.paymentMethod);
        const breakdown = (0, payment_calculator_service_js_1.calculatePaymentBreakdown)({
            grossAmount: trafficPackage.priceRub,
            fee,
            platformCommissionPercent: payment_config_service_js_1.paymentConfigService.getPlatformCommissionPercent(),
            totalQuota: trafficPackage.userCount,
            adminRewardRub: payment_config_service_js_1.paymentConfigService.getAdminRewardRub()
        });
        return prisma_js_1.prisma.$transaction(async (tx) => {
            const campaign = await tx.campaign.create({
                data: {
                    sponsorId: params.sponsorId,
                    trafficPackageId: trafficPackage.id,
                    title: params.title,
                    telegramChannelId: params.telegramChannelId,
                    totalQuota: trafficPackage.userCount,
                    remainingQuota: trafficPackage.userCount,
                    priceGross: trafficPackage.priceRub,
                    paymentMethod: params.paymentMethod,
                    status: "PENDING_PAYMENT"
                }
            });
            const payment = await tx.payment.create({
                data: {
                    sponsorId: params.sponsorId,
                    campaignId: campaign.id,
                    paymentMethod: params.paymentMethod,
                    status: client_1.PaymentStatus.PENDING_PROOF,
                    grossAmount: breakdown.grossAmount,
                    paymentFeeAmount: breakdown.paymentFeeAmount,
                    netAmount: breakdown.netAmount,
                    platformCommission: breakdown.platformCommission,
                    adminRewardTotal: breakdown.adminRewardTotal
                }
            });
            return { campaign, payment };
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    },
    async uploadPaymentProof(params) {
        return prisma_js_1.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({ where: { id: params.paymentId } });
            if (!payment) {
                throw new Error("PAYMENT_NOT_FOUND");
            }
            if (payment.status === "APPROVED") {
                return { payment, idempotent: true };
            }
            const proof = await tx.paymentProof.create({
                data: {
                    paymentId: payment.id,
                    proofUrl: params.proofUrl,
                    proofNote: params.proofNote,
                    status: "PENDING"
                }
            });
            const updatedPayment = await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: "PENDING_APPROVAL"
                }
            });
            await tx.campaign.update({
                where: { id: payment.campaignId },
                data: {
                    status: "WAITING_APPROVAL"
                }
            });
            return { payment: updatedPayment, proof, idempotent: false };
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    },
    async listActivePackages() {
        return prisma_js_1.prisma.trafficPackage.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { userCount: "asc" }]
        });
    },
    async upsertPackage(params) {
        const payload = {
            userCount: params.userCount,
            priceRub: (0, payment_calculator_service_js_1.decimal)(params.priceRub),
            code: params.code,
            isActive: params.isActive ?? true,
            sortOrder: params.sortOrder ?? params.userCount
        };
        if (params.id) {
            return prisma_js_1.prisma.trafficPackage.update({
                where: { id: params.id },
                data: payload
            });
        }
        return prisma_js_1.prisma.trafficPackage.create({
            data: payload
        });
    }
};
