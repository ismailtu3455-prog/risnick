import { Campaign, UserSponsorHistory } from "@prisma/client";
export type RotationInput = {
    campaigns: Campaign[];
    userHistory: UserSponsorHistory[];
    maxCount: number;
};
export declare const pickCampaignsForUser: ({ campaigns, userHistory, maxCount }: RotationInput) => Campaign[];
