import { Prisma } from "@prisma/client";
export declare const withdrawService: {
    createAdminWithdrawRequest(params: {
        adminId: string;
        amount: number;
        details?: Record<string, unknown>;
    }): Promise<{
        status: import("@prisma/client").$Enums.WithdrawalStatus;
        details: Prisma.JsonValue | null;
        id: string;
        createdAt: Date;
        sponsorId: string | null;
        adminId: string | null;
        requesterType: import("@prisma/client").$Enums.RequesterType;
        amount: Prisma.Decimal;
        processedByUserId: string | null;
        processedAt: Date | null;
    }>;
    createSponsorWithdrawRequest(params: {
        sponsorId: string;
        amount: number;
        details?: Record<string, unknown>;
    }): Promise<{
        status: import("@prisma/client").$Enums.WithdrawalStatus;
        details: Prisma.JsonValue | null;
        id: string;
        createdAt: Date;
        sponsorId: string | null;
        adminId: string | null;
        requesterType: import("@prisma/client").$Enums.RequesterType;
        amount: Prisma.Decimal;
        processedByUserId: string | null;
        processedAt: Date | null;
    }>;
};
