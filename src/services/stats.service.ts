import { prisma } from "../infra/prisma.js";

export const statsService = {
  async adminStats(adminId: string) {
    const [offers, clicks, uniques, success, balance] = await Promise.all([
      prisma.offer.count({ where: { adminId } }),
      prisma.clickLog.count({ where: { offer: { adminId } } }),
      prisma.userOfferHistory.count({ where: { offer: { adminId }, isUniquePaidLead: true } }),
      prisma.subscriptionCheck.count({ where: { offer: { adminId }, success: true } }),
      prisma.adminBalance.findUnique({ where: { adminId } })
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

  async sponsorStats(sponsorId: string) {
    const [campaigns, activeCampaigns, impressions, proofsPending] = await Promise.all([
      prisma.campaign.count({ where: { sponsorId } }),
      prisma.campaign.count({ where: { sponsorId, status: "ACTIVE" } }),
      prisma.campaignImpression.count({ where: { campaign: { sponsorId } } }),
      prisma.payment.count({ where: { sponsorId, status: "PENDING_APPROVAL" } })
    ]);

    return {
      campaigns,
      activeCampaigns,
      impressions,
      paymentsPendingApproval: proofsPending
    };
  }
};
