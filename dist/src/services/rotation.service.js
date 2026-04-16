"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotationService = void 0;
const client_1 = require("@prisma/client");
const env_js_1 = require("../config/env.js");
const prisma_js_1 = require("../infra/prisma.js");
const rotation_selector_js_1 = require("./rotation.selector.js");
exports.rotationService = {
    async rotateForUser(params) {
        const [campaigns, existingHistory] = await Promise.all([
            prisma_js_1.prisma.campaign.findMany({
                where: {
                    status: client_1.CampaignStatus.ACTIVE,
                    remainingQuota: { gt: 0 },
                    sponsor: { status: "ACTIVE" }
                },
                orderBy: [
                    { remainingQuota: "desc" },
                    { createdAt: "asc" }
                ]
            }),
            prisma_js_1.prisma.userSponsorHistory.findMany({
                where: {
                    userId: params.userId,
                    offerId: params.offerId
                },
                orderBy: { shownAt: "asc" }
            })
        ]);
        const selected = (0, rotation_selector_js_1.pickCampaignsForUser)({
            campaigns,
            userHistory: existingHistory,
            maxCount: env_js_1.env.MAX_SPONSORS_PER_OFFER
        });
        const historyMap = new Map(existingHistory.map((item) => [item.campaignId, item]));
        await prisma_js_1.prisma.$transaction(async (tx) => {
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
                }
                else {
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
