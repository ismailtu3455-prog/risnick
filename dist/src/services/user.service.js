"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
const client_1 = require("@prisma/client");
const prisma_js_1 = require("../infra/prisma.js");
exports.userService = {
    async upsertTelegramUser(input) {
        return prisma_js_1.prisma.user.upsert({
            where: { telegramId: input.telegramId },
            create: {
                telegramId: input.telegramId,
                username: input.username,
                firstName: input.firstName,
                lastName: input.lastName,
                languageCode: input.languageCode ?? "ru"
            },
            update: {
                username: input.username,
                firstName: input.firstName,
                lastName: input.lastName,
                languageCode: input.languageCode ?? "ru"
            }
        });
    },
    async getUserByTelegramId(telegramId) {
        return prisma_js_1.prisma.user.findUnique({ where: { telegramId } });
    },
    async requireAdminByTelegramId(telegramId) {
        return prisma_js_1.prisma.admin.findFirst({
            where: { user: { telegramId } },
            include: { user: true, balance: true }
        });
    },
    async requireSponsorByTelegramId(telegramId) {
        return prisma_js_1.prisma.sponsor.findFirst({
            where: { user: { telegramId } },
            include: { user: true }
        });
    },
    async createAdminForUser(userId, isSuperAdmin = false, rewardPerLeadRub = 1) {
        return prisma_js_1.prisma.admin.create({
            data: {
                userId,
                isSuperAdmin,
                rewardPerLeadRub: new client_1.Prisma.Decimal(rewardPerLeadRub),
                balance: {
                    create: {
                        availableAmount: new client_1.Prisma.Decimal(0),
                        pendingAmount: new client_1.Prisma.Decimal(0),
                        lifetimeEarned: new client_1.Prisma.Decimal(0)
                    }
                }
            },
            include: { balance: true }
        });
    },
    async createSponsorForUser(userId) {
        return prisma_js_1.prisma.sponsor.create({
            data: {
                userId,
                status: "ACTIVE"
            },
            include: { user: true }
        });
    }
};
