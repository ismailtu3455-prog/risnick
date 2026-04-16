import { Campaign, UserSponsorHistory } from "@prisma/client";

export type RotationInput = {
  campaigns: Campaign[];
  userHistory: UserSponsorHistory[];
  maxCount: number;
};

export const pickCampaignsForUser = ({ campaigns, userHistory, maxCount }: RotationInput): Campaign[] => {
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
