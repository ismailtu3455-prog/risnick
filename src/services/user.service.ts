import { Prisma } from "@prisma/client";
import { prisma } from "../infra/prisma.js";

export type TelegramUserInput = {
  telegramId: bigint;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
};

export const userService = {
  async upsertTelegramUser(input: TelegramUserInput) {
    return prisma.user.upsert({
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

  async getUserByTelegramId(telegramId: bigint) {
    return prisma.user.findUnique({ where: { telegramId } });
  },

  async requireAdminByTelegramId(telegramId: bigint) {
    return prisma.admin.findFirst({
      where: { user: { telegramId } },
      include: { user: true, balance: true }
    });
  },

  async requireSponsorByTelegramId(telegramId: bigint) {
    return prisma.sponsor.findFirst({
      where: { user: { telegramId } },
      include: { user: true }
    });
  },

  async createAdminForUser(userId: string, isSuperAdmin = false, rewardPerLeadRub = 1) {
    return prisma.admin.create({
      data: {
        userId,
        isSuperAdmin,
        rewardPerLeadRub: new Prisma.Decimal(rewardPerLeadRub),
        balance: {
          create: {
            availableAmount: new Prisma.Decimal(0),
            pendingAmount: new Prisma.Decimal(0),
            lifetimeEarned: new Prisma.Decimal(0)
          }
        }
      },
      include: { balance: true }
    });
  },

  async createSponsorForUser(userId: string) {
    return prisma.sponsor.create({
      data: {
        userId,
        status: "ACTIVE"
      },
      include: { user: true }
    });
  }
};
