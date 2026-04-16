export declare const ruTexts: {
    startFallback: string;
    offerNotFound: string;
    offerIntro: (title: string, description?: string | null) => string;
    offerAlreadyCompleted: string;
    showSponsorsTitle: string;
    noSponsors: string;
    checkSuccess: string;
    checkPartial: (missing: number) => string;
    checkUnavailable: string;
    checkNoSponsors: string;
    adminAccessDenied: string;
    adminMenu: string;
    adminOfferCreated: (link: string, token: string) => string;
    adminStats: (stats: {
        offers: number;
        clicks: number;
        uniquePaidLeads: number;
        successfulOpens: number;
        balance: {
            available: unknown;
            pending: unknown;
            lifetime: unknown;
        };
    }) => string;
    sponsorMenu: string;
    sponsorCampaignCreated: (campaignId: string, paymentId: string, gross: string) => string;
    sponsorAccessDenied: string;
    genericCommandError: string;
    withdrawCreated: (id: string) => string;
    sponsorPackagesTitle: string;
    proofUploaded: string;
    sponsorStats: (stats: {
        campaigns: number;
        activeCampaigns: number;
        impressions: number;
        paymentsPendingApproval: number;
    }) => string;
};
