export declare const rotationService: {
    rotateForUser(params: {
        offerId: string;
        userId: string;
    }): Promise<{
        status: import("@prisma/client").$Enums.CampaignStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        telegramChannelId: string;
        totalQuota: number;
        remainingQuota: number;
        priceGross: import("@prisma/client/runtime/library").Decimal;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        approvedAt: Date | null;
        activatedAt: Date | null;
        endedAt: Date | null;
        sponsorId: string;
        trafficPackageId: string;
    }[]>;
};
