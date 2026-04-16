import { Prisma } from "@prisma/client";
export type TelegramUserInput = {
    telegramId: bigint;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
};
export declare const userService: {
    upsertTelegramUser(input: TelegramUserInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isBlocked: boolean;
        telegramId: bigint;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        languageCode: string | null;
    }>;
    getUserByTelegramId(telegramId: bigint): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isBlocked: boolean;
        telegramId: bigint;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        languageCode: string | null;
    } | null>;
    requireAdminByTelegramId(telegramId: bigint): Promise<({
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isBlocked: boolean;
            telegramId: bigint;
            username: string | null;
            firstName: string | null;
            lastName: string | null;
            languageCode: string | null;
        };
        balance: {
            id: string;
            updatedAt: Date;
            availableAmount: Prisma.Decimal;
            pendingAmount: Prisma.Decimal;
            adminId: string;
            lifetimeEarned: Prisma.Decimal;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isSuperAdmin: boolean;
        rewardPerLeadRub: Prisma.Decimal;
    }) | null>;
    requireSponsorByTelegramId(telegramId: bigint): Promise<({
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isBlocked: boolean;
            telegramId: bigint;
            username: string | null;
            firstName: string | null;
            lastName: string | null;
            languageCode: string | null;
        };
    } & {
        status: import("@prisma/client").$Enums.SponsorStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }) | null>;
    createAdminForUser(userId: string, isSuperAdmin?: boolean, rewardPerLeadRub?: number): Promise<{
        balance: {
            id: string;
            updatedAt: Date;
            availableAmount: Prisma.Decimal;
            pendingAmount: Prisma.Decimal;
            adminId: string;
            lifetimeEarned: Prisma.Decimal;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        isSuperAdmin: boolean;
        rewardPerLeadRub: Prisma.Decimal;
    }>;
    createSponsorForUser(userId: string): Promise<{
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isBlocked: boolean;
            telegramId: bigint;
            username: string | null;
            firstName: string | null;
            lastName: string | null;
            languageCode: string | null;
        };
    } & {
        status: import("@prisma/client").$Enums.SponsorStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
};
