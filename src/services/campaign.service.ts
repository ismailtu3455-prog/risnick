import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../infra/prisma.js";
import { calculatePaymentBreakdown, decimal } from "./payment-calculator.service.js";
import { paymentConfigService } from "./payment-config.service.js";

export const campaignService = {
  async createCampaign(params: {
    sponsorId: string;
    title?: string;
    telegramChannelId: string;
    trafficPackageId: string;
    paymentMethod: PaymentMethod;
  }) {
    const trafficPackage = await prisma.trafficPackage.findFirst({
      where: {
        id: params.trafficPackageId,
        isActive: true
      }
    });

    if (!trafficPackage) {
      throw new Error("TRAFFIC_PACKAGE_NOT_FOUND");
    }

    const fee = await paymentConfigService.getFeeConfig(params.paymentMethod);
    const breakdown = calculatePaymentBreakdown({
      grossAmount: trafficPackage.priceRub,
      fee,
      platformCommissionPercent: paymentConfigService.getPlatformCommissionPercent(),
      totalQuota: trafficPackage.userCount,
      adminRewardRub: paymentConfigService.getAdminRewardRub()
    });

    return prisma.$transaction(async (tx) => {
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
          status: PaymentStatus.PENDING_PROOF,
          grossAmount: breakdown.grossAmount,
          paymentFeeAmount: breakdown.paymentFeeAmount,
          netAmount: breakdown.netAmount,
          platformCommission: breakdown.platformCommission,
          adminRewardTotal: breakdown.adminRewardTotal
        }
      });

      return { campaign, payment };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  async uploadPaymentProof(params: {
    paymentId: string;
    proofUrl?: string;
    proofNote?: string;
  }) {
    return prisma.$transaction(async (tx) => {
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  async listActivePackages() {
    return prisma.trafficPackage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { userCount: "asc" }]
    });
  },

  async upsertPackage(params: {
    id?: string;
    userCount: number;
    priceRub: number;
    code: string;
    isActive?: boolean;
    sortOrder?: number;
  }) {
    const payload = {
      userCount: params.userCount,
      priceRub: decimal(params.priceRub),
      code: params.code,
      isActive: params.isActive ?? true,
      sortOrder: params.sortOrder ?? params.userCount
    };

    if (params.id) {
      return prisma.trafficPackage.update({
        where: { id: params.id },
        data: payload
      });
    }

    return prisma.trafficPackage.create({
      data: payload
    });
  }
};
