import { PaymentMethod, Prisma } from "@prisma/client";
export declare const campaignService: {
    createCampaign(params: {
        sponsorId: string;
        title?: string;
        telegramChannelId: string;
        trafficPackageId: string;
        paymentMethod: PaymentMethod;
    }): Promise<{
        campaign: {
            status: import("@prisma/client").$Enums.CampaignStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            telegramChannelId: string;
            totalQuota: number;
            remainingQuota: number;
            priceGross: Prisma.Decimal;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            approvedAt: Date | null;
            activatedAt: Date | null;
            endedAt: Date | null;
            sponsorId: string;
            trafficPackageId: string;
        };
        payment: {
            status: import("@prisma/client").$Enums.PaymentStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            approvedAt: Date | null;
            sponsorId: string;
            grossAmount: Prisma.Decimal;
            paymentFeeAmount: Prisma.Decimal;
            netAmount: Prisma.Decimal;
            platformCommission: Prisma.Decimal;
            adminRewardTotal: Prisma.Decimal;
            externalPaymentId: string | null;
            metadata: Prisma.JsonValue | null;
            rejectedAt: Date | null;
            campaignId: string;
        };
    }>;
    uploadPaymentProof(params: {
        paymentId: string;
        proofUrl?: string;
        proofNote?: string;
    }): Promise<{
        payment: {
            status: import("@prisma/client").$Enums.PaymentStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            approvedAt: Date | null;
            sponsorId: string;
            grossAmount: Prisma.Decimal;
            paymentFeeAmount: Prisma.Decimal;
            netAmount: Prisma.Decimal;
            platformCommission: Prisma.Decimal;
            adminRewardTotal: Prisma.Decimal;
            externalPaymentId: string | null;
            metadata: Prisma.JsonValue | null;
            rejectedAt: Date | null;
            campaignId: string;
        };
        idempotent: boolean;
        proof?: undefined;
    } | {
        payment: {
            status: import("@prisma/client").$Enums.PaymentStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
            approvedAt: Date | null;
            sponsorId: string;
            grossAmount: Prisma.Decimal;
            paymentFeeAmount: Prisma.Decimal;
            netAmount: Prisma.Decimal;
            platformCommission: Prisma.Decimal;
            adminRewardTotal: Prisma.Decimal;
            externalPaymentId: string | null;
            metadata: Prisma.JsonValue | null;
            rejectedAt: Date | null;
            campaignId: string;
        };
        proof: {
            status: import("@prisma/client").$Enums.ProofStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            proofUrl: string | null;
            proofNote: string | null;
            moderatedByUserId: string | null;
            paymentId: string;
        };
        idempotent: boolean;
    }>;
    listActivePackages(): Promise<{
        code: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        userCount: number;
        priceRub: Prisma.Decimal;
        sortOrder: number;
    }[]>;
    upsertPackage(params: {
        id?: string;
        userCount: number;
        priceRub: number;
        code: string;
        isActive?: boolean;
        sortOrder?: number;
    }): Promise<{
        code: string;
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        userCount: number;
        priceRub: Prisma.Decimal;
        sortOrder: number;
    }>;
};
