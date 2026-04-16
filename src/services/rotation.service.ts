import { CampaignStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../infra/prisma.js";
import { pickCampaignsForUser } from "./rotation.selector.js";

export const rotationService = {
  async rotateForUser(params: {
    offerId: string;
    userId: string;
  }) {
    const [campaigns, existingHistory] = await Promise.all([
      prisma.campaign.findMany({
        where: {
          status: CampaignStatus.ACTIVE,
          remainingQuota: { gt: 0 },
          sponsor: { status: "ACTIVE" }
        },
        orderBy: [
          { remainingQuota: "desc" },
          { createdAt: "asc" }
        ]
      }),
      prisma.userSponsorHistory.findMany({
        where: {
          userId: params.userId,
          offerId: params.offerId
        },
        orderBy: { shownAt: "asc" }
      })
    ]);

    const selected = pickCampaignsForUser({
      campaigns,
      userHistory: existingHistory,
      maxCount: env.MAX_SPONSORS_PER_OFFER
    });

    const historyMap = new Map(existingHistory.map((item) => [item.campaignId, item]));

    await prisma.$transaction(async (tx) => {
      for (const campaign of selected) {
        const history = historyMap.get(campaign.id);
        const isRepeat = Boolean(history);

        await tx.campaignImpression.create({
          data: {
            campaignId: campaign.id,
            offerId: params.offerId,
            userId: params.userId,
            isRepeat
          }
        });

        if (history) {
          await tx.userSponsorHistory.update({
            where: { id: history.id },
            data: {
              shownCount: { increment: 1 },
              lastShownAt: new Date()
            }
          });
        } else {
          await tx.userSponsorHistory.create({
            data: {
              userId: params.userId,
              offerId: params.offerId,
              campaignId: campaign.id,
              status: "SHOWN"
            }
          });
        }
      }
    });

    return selected;
  }
};
