import { Prisma } from "@prisma/client";
export declare const financialService: {
    approvePayment(paymentId: string, moderatorUserId?: string): Promise<{
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
    }>;
    rejectPayment(paymentId: string, moderatorUserId?: string, reason?: string): Promise<{
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
    }>;
    applySuccessRewards(params: {
        userId: string;
        offerId: string;
        adminId: string;
        adminRewardRub: Prisma.Decimal;
    }): Promise<{
        adminRewardIssuedNow: boolean;
        decrementedCampaignIds: string[];
        platformCommissionAdded: Prisma.Decimal;
    }>;
};
