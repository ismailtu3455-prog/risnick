import { UserSponsorStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../infra/prisma.js";
import { financialService } from "./financial.service.js";
import { paymentConfigService } from "./payment-config.service.js";

type TelegramMember = {
  status: string;
};

export interface TelegramMembershipClient {
  getChatMember(chatId: string, userId: number): Promise<TelegramMember>;
}

const activeStatuses = new Set(["member", "administrator", "creator", "owner"]);

export type SubscriptionCheckResult = {
  success: boolean;
  status: "SUCCESS" | "PARTIAL" | "CHECK_UNAVAILABLE" | "NO_SPONSORS" | "OFFER_NOT_FOUND";
  missingCount: number;
  missingCampaigns: string[];
  file?: {
    fileType: string;
    fileUrl?: string | null;
    telegramFileId?: string | null;
    caption?: string | null;
  };
};

export const subscriptionService = {
  async checkAndProcess(params: {
    token: string;
    telegramId: bigint;
    telegramClient: TelegramMembershipClient;
  }): Promise<SubscriptionCheckResult> {
    const user = await prisma.user.findUnique({ where: { telegramId: params.telegramId } });
    if (!user) {
      return {
        success: false,
        status: "OFFER_NOT_FOUND",
        missingCount: 0,
        missingCampaigns: []
      };
    }

    const offer = await prisma.offer.findFirst({
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

    const sponsorHistory = await prisma.userSponsorHistory.findMany({
      where: {
        userId: user.id,
        offerId: offer.id
      },
      include: {
        campaign: true
      }
    });

    if (sponsorHistory.length === 0) {
      await prisma.subscriptionCheck.create({
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

    const missingCampaigns: string[] = [];
    const unavailableCampaigns: string[] = [];

    for (const row of sponsorHistory) {
      try {
        const member = await params.telegramClient.getChatMember(
          row.campaign.telegramChannelId,
          Number(params.telegramId)
        );

        const isSubscribed = activeStatuses.has(member.status);
        if (!isSubscribed) {
          missingCampaigns.push(row.campaign.telegramChannelId);
          await prisma.userSponsorHistory.update({
            where: { id: row.id },
            data: {
              status: UserSponsorStatus.FAILED
            }
          });
        }
      } catch {
        unavailableCampaigns.push(row.campaign.telegramChannelId);
      }
    }

    if (unavailableCampaigns.length > 0) {
      await prisma.subscriptionCheck.create({
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
      await prisma.subscriptionCheck.create({
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

    const rewards = await financialService.applySuccessRewards({
      userId: user.id,
      offerId: offer.id,
      adminId: offer.adminId,
      adminRewardRub: paymentConfigService.getAdminRewardRub()
    });

    await prisma.subscriptionCheck.create({
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
