"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsService = void 0;
const prisma_js_1 = require("../infra/prisma.js");
exports.statsService = {
    async adminStats(adminId) {
        const [offers, clicks, uniques, success, balance] = await Promise.all([
            prisma_js_1.prisma.offer.count({ where: { adminId } }),
            prisma_js_1.prisma.clickLog.count({ where: { offer: { adminId } } }),
            prisma_js_1.prisma.userOfferHistory.count({ where: { offer: { adminId }, isUniquePaidLead: true } }),
            prisma_js_1.prisma.subscriptionCheck.count({ where: { offer: { adminId }, success: true } }),
            prisma_js_1.prisma.adminBalance.findUnique({ where: { adminId } })
        ]);
        return {
            offers,
            clicks,
            uniquePaidLeads: uniques,
            successfulOpens: success,
            balance: {
                available: balance?.availableAmount ?? 0,
                pending: balance?.pendingAmount ?? 0,
                lifetime: balance?.lifetimeEarned ?? 0
            }
        };
    },
    async sponsorStats(sponsorId) {
        const [campaigns, activeCampaigns, impressions, proofsPending] = await Promise.all([
            prisma_js_1.prisma.campaign.count({ where: { sponsorId } }),
            prisma_js_1.prisma.campaign.count({ where: { sponsorId, status: "ACTIVE" } }),
            prisma_js_1.prisma.campaignImpression.count({ where: { campaign: { sponsorId } } }),
            prisma_js_1.prisma.payment.count({ where: { sponsorId, status: "PENDING_APPROVAL" } })
        ]);
        return {
            campaigns,
            activeCampaigns,
            impressions,
            paymentsPendingApproval: proofsPending
        };
    }
};
