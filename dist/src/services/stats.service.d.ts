export declare const statsService: {
    adminStats(adminId: string): Promise<{
        offers: number;
        clicks: number;
        uniquePaidLeads: number;
        successfulOpens: number;
        balance: {
            available: number | import("@prisma/client/runtime/library").Decimal;
            pending: number | import("@prisma/client/runtime/library").Decimal;
            lifetime: number | import("@prisma/client/runtime/library").Decimal;
        };
    }>;
    sponsorStats(sponsorId: string): Promise<{
        campaigns: number;
        activeCampaigns: number;
        impressions: number;
        paymentsPendingApproval: number;
    }>;
};
