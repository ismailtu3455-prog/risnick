"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickCampaignsForUser = void 0;
const pickCampaignsForUser = ({ campaigns, userHistory, maxCount }) => {
    const byCampaignId = new Map(userHistory.map((item) => [item.campaignId, item]));
    const unseen = campaigns.filter((campaign) => !byCampaignId.has(campaign.id));
    const selectedUnseen = unseen.slice(0, maxCount);
    if (selectedUnseen.length === maxCount) {
        return selectedUnseen;
    }
    const alreadySeen = campaigns.filter((campaign) => byCampaignId.has(campaign.id));
    const deficit = maxCount - selectedUnseen.length;
    return [...selectedUnseen, ...alreadySeen.slice(0, deficit)];
};
exports.pickCampaignsForUser = pickCampaignsForUser;
