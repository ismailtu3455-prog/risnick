import { Prisma } from "@prisma/client";
export declare const offerService: {
    createOffer(params: {
        adminId: string;
        title: string;
        description?: string;
        fileType: "TELEGRAM_FILE_ID" | "EXTERNAL_URL" | "TEXT";
        telegramFileId?: string;
        fileUrl?: string;
        caption?: string;
    }): Promise<{
        files: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            offerId: string;
            fileType: string;
            telegramFileId: string | null;
            fileUrl: string | null;
            caption: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        title: string;
        adminId: string;
        token: string;
        description: string | null;
    }>;
    getOfferByToken(token: string): Promise<({
        admin: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            isSuperAdmin: boolean;
            rewardPerLeadRub: Prisma.Decimal;
        };
        files: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            offerId: string;
            fileType: string;
            telegramFileId: string | null;
            fileUrl: string | null;
            caption: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        title: string;
        adminId: string;
        token: string;
        description: string | null;
    }) | null>;
    buildFinalLink(token: string): string;
    getOfferStats(offerId: string): Promise<{
        clicks: number;
        uniquePaid: number;
        successfulChecks: number;
    }>;
    ensureAdminExists(adminId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isSuperAdmin: boolean;
        rewardPerLeadRub: Prisma.Decimal;
    }>;
    decimalFromNumber(value: number): Prisma.Decimal;
};
