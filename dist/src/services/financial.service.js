"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financialService = void 0;
const client_1 = require("@prisma/client");
const prisma_js_1 = require("../infra/prisma.js");
const payment_calculator_service_js_1 = require("./payment-calculator.service.js");
const ensurePlatformBalance = async (tx) => {
    const existing = await tx.platformBalance.findFirst();
    if (existing) {
        return existing;
    }
    return tx.platformBalance.create({
        data: {
            availableAmount: (0, payment_calculator_service_js_1.decimal)(0),
            pendingAmount: (0, payment_calculator_service_js_1.decimal)(0),
            lifetimeGross: (0, payment_calculator_service_js_1.decimal)(0),
            lifetimeCommission: (0, payment_calculator_service_js_1.decimal)(0)
        }
    });
};
exports.financialService = {
    async approvePayment(paymentId, moderatorUserId) {
        return prisma_js_1.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id: paymentId },
                include: { campaign: true }
            });
            if (!payment) {
                throw new Error("PAYMENT_NOT_FOUND");
            }
            if (payment.status === "APPROVED") {
                return { payment, idempotent: true };
            }
            if (payment.status === "REJECTED") {
                throw new Error("PAYMENT_ALREADY_REJECTED");
            }
            const updatedPayment = await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: "APPROVED",
                    approvedAt: new Date()
                }
            });
            await tx.paymentProof.updateMany({
                where: { paymentId: payment.id, status: "PENDING" },
                data: {
                    status: "APPROVED",
                    moderatedByUserId: moderatorUserId
                }
            });
            await tx.campaign.update({
                where: { id: payment.campaignId },
                data: {
                    status: "ACTIVE",
                    approvedAt: new Date(),
                    activatedAt: new Date()
                }
            });
            const platformBalance = await ensurePlatformBalance(tx);
            await tx.platformBalance.update({
                where: { id: platformBalance.id },
                data: {
                    pendingAmount: { increment: payment.netAmount },
                    lifetimeGross: { increment: payment.grossAmount }
                }
            });
            return { payment: updatedPayment, idempotent: false };
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    },
    async rejectPayment(paymentId, moderatorUserId, reason) {
        return prisma_js_1.prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id: paymentId },
                include: { campaign: true }
            });
            if (!payment) {
                throw new Error("PAYMENT_NOT_FOUND");
            }
            if (payment.status === "REJECTED") {
                return { payment, idempotent: true };
            }
            if (payment.status === "APPROVED") {
                throw new Error("PAYMENT_ALREADY_APPROVED");
            }
            const updatedPayment = await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: "REJECTED",
                    rejectedAt: new Date(),
                    metadata: {
                        ...payment.metadata,
                        rejectionReason: reason ?? null
                    }
                }
            });
            await tx.paymentProof.updateMany({
                where: { paymentId: payment.id, status: "PENDING" },
                data: {
                    status: "REJECTED",
                    moderatedByUserId: moderatorUserId
                }
            });
            await tx.campaign.update({
                where: { id: payment.campaignId },
                data: {
                    status: "REJECTED"
                }
            });
            return { payment: updatedPayment, idempotent: false };
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    },
    async applySuccessRewards(params) {
        return prisma_js_1.prisma.$transaction(async (tx) => {
            const history = await tx.userOfferHistory.findUnique({
                where: {
                    userId_offerId: {
                        userId: params.userId,
                        offerId: params.offerId
                    }
                }
            });
            const userHistory = history
                ? await tx.userOfferHistory.update({
                    where: { id: history.id },
                    data: {
                        lastAccessAt: new Date(),
                        successCount: { increment: 1 }
                    }
                })
                : await tx.userOfferHistory.create({
                    data: {
                        userId: params.userId,
                        offerId: params.offerId,
                        firstSuccessAt: new Date(),
                        lastAccessAt: new Date(),
                        successCount: 1,
                        isUniquePaidLead: true,
                        adminRewardIssued: false,
                        platformShareIssued: false
                    }
                });
            const wasFirstSuccess = !userHistory.firstSuccessAt;
            if (wasFirstSuccess) {
                await tx.userOfferHistory.update({
                    where: { id: userHistory.id },
                    data: {
                        firstSuccessAt: new Date(),
                        isUniquePaidLead: true
                    }
                });
            }
            let adminRewardIssuedNow = false;
            if (!userHistory.adminRewardIssued) {
                let adminBalance = await tx.adminBalance.findUnique({ where: { adminId: params.adminId } });
                if (!adminBalance) {
                    adminBalance = await tx.adminBalance.create({
                        data: {
                            adminId: params.adminId,
                            availableAmount: (0, payment_calculator_service_js_1.decimal)(0),
                            pendingAmount: (0, payment_calculator_service_js_1.decimal)(0),
                            lifetimeEarned: (0, payment_calculator_service_js_1.decimal)(0)
                        }
                    });
                }
                await tx.adminBalance.update({
                    where: { id: adminBalance.id },
                    data: {
                        availableAmount: { increment: params.adminRewardRub },
                        lifetimeEarned: { increment: params.adminRewardRub }
                    }
                });
                await tx.userOfferHistory.update({
                    where: { id: userHistory.id },
                    data: {
                        adminRewardIssued: true
                    }
                });
                adminRewardIssuedNow = true;
            }
            const pendingSponsorLinks = await tx.userSponsorHistory.findMany({
                where: {
                    userId: params.userId,
                    offerId: params.offerId,
                    status: { not: "SUBSCRIBED" }
                }
            });
            const decrementedCampaignIds = [];
            for (const link of pendingSponsorLinks) {
                const changed = await tx.campaign.updateMany({
                    where: {
                        id: link.campaignId,
                        status: client_1.CampaignStatus.ACTIVE,
                        remainingQuota: { gt: 0 }
                    },
                    data: {
                        remainingQuota: { decrement: 1 }
                    }
                });
                await tx.userSponsorHistory.update({
                    where: { id: link.id },
                    data: {
                        status: "SUBSCRIBED",
                        subscribedAt: new Date(),
                        lastShownAt: new Date()
                    }
                });
                if (changed.count > 0) {
                    decrementedCampaignIds.push(link.campaignId);
                    await tx.campaign.updateMany({
                        where: {
                            id: link.campaignId,
                            remainingQuota: 0,
                            status: client_1.CampaignStatus.ACTIVE
                        },
                        data: {
                            status: client_1.CampaignStatus.ENDED,
                            endedAt: new Date()
                        }
                    });
                }
            }
            const platformBalance = await ensurePlatformBalance(tx);
            let platformCommissionAdded = (0, payment_calculator_service_js_1.decimal)(0);
            for (const campaignId of decrementedCampaignIds) {
                const campaign = await tx.campaign.findUnique({ where: { id: campaignId } });
                const payment = await tx.payment.findUnique({ where: { campaignId } });
                if (!campaign || !payment || campaign.totalQuota <= 0) {
                    continue;
                }
                const perLeadCommission = payment.platformCommission.div(campaign.totalQuota).toDecimalPlaces(4);
                platformCommissionAdded = platformCommissionAdded.add(perLeadCommission);
            }
            if (platformCommissionAdded.greaterThan(0)) {
                await tx.platformBalance.update({
                    where: { id: platformBalance.id },
                    data: {
                        availableAmount: { increment: platformCommissionAdded },
                        pendingAmount: { decrement: platformCommissionAdded },
                        lifetimeCommission: { increment: platformCommissionAdded }
                    }
                });
            }
            return {
                adminRewardIssuedNow,
                decrementedCampaignIds,
                platformCommissionAdded
            };
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
    }
};
