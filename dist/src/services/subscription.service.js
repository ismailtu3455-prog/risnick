"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionService = void 0;
const client_1 = require("@prisma/client");
const prisma_js_1 = require("../infra/prisma.js");
const financial_service_js_1 = require("./financial.service.js");
const payment_config_service_js_1 = require("./payment-config.service.js");
const activeStatuses = new Set(["member", "administrator", "creator", "owner"]);
exports.subscriptionService = {
    async checkAndProcess(params) {
        const user = await prisma_js_1.prisma.user.findUnique({ where: { telegramId: params.telegramId } });
        if (!user) {
            return {
                success: false,
                status: "OFFER_NOT_FOUND",
                missingCount: 0,
                missingCampaigns: []
            };
        }
        const offer = await prisma_js_1.prisma.offer.findFirst({
            where: {
                token: params.token,
                isActive: true
            },
            include: {
                admin: true,
                files: {
                    where: { isActive: true },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });
        if (!offer) {
            return {
                success: false,
                status: "OFFER_NOT_FOUND",
                missingCount: 0,
                missingCampaigns: []
            };
        }
        const sponsorHistory = await prisma_js_1.prisma.userSponsorHistory.findMany({
            where: {
                userId: user.id,
                offerId: offer.id
            },
            include: {
                campaign: true
            }
        });
        if (sponsorHistory.length === 0) {
            await prisma_js_1.prisma.subscriptionCheck.create({
                data: {
                    userId: user.id,
                    offerId: offer.id,
                    success: false,
                    status: "NO_SPONSORS",
                    missingCount: 0,
                    details: {}
                }
            });
            return {
                success: false,
                status: "NO_SPONSORS",
                missingCount: 0,
                missingCampaigns: []
            };
        }
        const missingCampaigns = [];
        const unavailableCampaigns = [];
        for (const row of sponsorHistory) {
            try {
                const member = await params.telegramClient.getChatMember(row.campaign.telegramChannelId, Number(params.telegramId));
                const isSubscribed = activeStatuses.has(member.status);
                if (!isSubscribed) {
                    missingCampaigns.push(row.campaign.telegramChannelId);
                    await prisma_js_1.prisma.userSponsorHistory.update({
                        where: { id: row.id },
                        data: {
                            status: client_1.UserSponsorStatus.FAILED
                        }
                    });
                }
            }
            catch {
                unavailableCampaigns.push(row.campaign.telegramChannelId);
            }
        }
        if (unavailableCampaigns.length > 0) {
            await prisma_js_1.prisma.subscriptionCheck.create({
                data: {
                    userId: user.id,
                    offerId: offer.id,
                    success: false,
                    status: "CHECK_UNAVAILABLE",
                    missingCount: missingCampaigns.length,
                    details: {
                        unavailableCampaigns,
                        missingCampaigns
                    }
                }
            });
            return {
                success: false,
                status: "CHECK_UNAVAILABLE",
                missingCount: missingCampaigns.length,
                missingCampaigns
            };
        }
        if (missingCampaigns.length > 0) {
            await prisma_js_1.prisma.subscriptionCheck.create({
                data: {
                    userId: user.id,
                    offerId: offer.id,
                    success: false,
                    status: "PARTIAL",
                    missingCount: missingCampaigns.length,
                    details: {
                        missingCampaigns
                    }
                }
            });
            return {
                success: false,
                status: "PARTIAL",
                missingCount: missingCampaigns.length,
                missingCampaigns
            };
        }
        const rewards = await financial_service_js_1.financialService.applySuccessRewards({
            userId: user.id,
            offerId: offer.id,
            adminId: offer.adminId,
            adminRewardRub: payment_config_service_js_1.paymentConfigService.getAdminRewardRub()
        });
        await prisma_js_1.prisma.subscriptionCheck.create({
            data: {
                userId: user.id,
                offerId: offer.id,
                success: true,
                status: "SUCCESS",
                missingCount: 0,
                details: {
                    decrementedCampaigns: rewards.decrementedCampaignIds,
                    adminRewardIssuedNow: rewards.adminRewardIssuedNow
                }
            }
        });
        const file = offer.files[0];
        return {
            success: true,
            status: "SUCCESS",
            missingCount: 0,
            missingCampaigns: [],
            file: file
                ? {
                    fileType: file.fileType,
                    fileUrl: file.fileUrl,
                    telegramFileId: file.telegramFileId,
                    caption: file.caption
                }
                : undefined
        };
    }
};
