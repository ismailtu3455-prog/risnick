import { CampaignStatus, Prisma } from "@prisma/client";
import { prisma } from "../infra/prisma.js";
import { decimal } from "./payment-calculator.service.js";

const ensurePlatformBalance = async (tx: Prisma.TransactionClient) => {
  const existing = await tx.platformBalance.findFirst();
  if (existing) {
    return existing;
  }

  return tx.platformBalance.create({
    data: {
      availableAmount: decimal(0),
      pendingAmount: decimal(0),
      lifetimeGross: decimal(0),
      lifetimeCommission: decimal(0)
    }
  });
};

export const financialService = {
  async approvePayment(paymentId: string, moderatorUserId?: string) {
    return prisma.$transaction(async (tx) => {
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  async rejectPayment(paymentId: string, moderatorUserId?: string, reason?: string) {
    return prisma.$transaction(async (tx) => {
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
            ...(payment.metadata as object | undefined),
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  async applySuccessRewards(params: {
    userId: string;
    offerId: string;
    adminId: string;
    adminRewardRub: Prisma.Decimal;
  }) {
    return prisma.$transaction(async (tx) => {
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
              availableAmount: decimal(0),
              pendingAmount: decimal(0),
              lifetimeEarned: decimal(0)
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

      const decrementedCampaignIds: string[] = [];
      for (const link of pendingSponsorLinks) {
        const changed = await tx.campaign.updateMany({
          where: {
            id: link.campaignId,
            status: CampaignStatus.ACTIVE,
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
              status: CampaignStatus.ACTIVE
            },
            data: {
              status: CampaignStatus.ENDED,
              endedAt: new Date()
            }
          });
        }
      }

      const platformBalance = await ensurePlatformBalance(tx);
      let platformCommissionAdded = decimal(0);
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
};
