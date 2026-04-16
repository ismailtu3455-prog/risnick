import { Prisma } from "@prisma/client";
import { prisma } from "../infra/prisma.js";
import { env } from "../config/env.js";
import { generateOfferToken } from "../utils/token.js";

export const offerService = {
  async createOffer(params: {
    adminId: string;
    title: string;
    description?: string;
    fileType: "TELEGRAM_FILE_ID" | "EXTERNAL_URL" | "TEXT";
    telegramFileId?: string;
    fileUrl?: string;
    caption?: string;
  }) {
    const token = generateOfferToken();

    return prisma.offer.create({
      data: {
        token,
        adminId: params.adminId,
        title: params.title,
        description: params.description,
        files: {
          create: {
            fileType: params.fileType,
            telegramFileId: params.telegramFileId,
            fileUrl: params.fileUrl,
            caption: params.caption
          }
        }
      },
      include: {
        files: true
      }
    });
  },

  async getOfferByToken(token: string) {
    return prisma.offer.findFirst({
      where: {
        token,
        isActive: true
      },
      include: {
        admin: true,
        files: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });
  },

  buildFinalLink(token: string): string {
    const base = env.DOMAIN_BASE.replace(/\/$/, "");
    return `${base}/go/${token}`;
  },

  async getOfferStats(offerId: string) {
    const [clicks, uniquePaid, successfulChecks] = await Promise.all([
      prisma.clickLog.count({ where: { offerId } }),
      prisma.userOfferHistory.count({ where: { offerId, isUniquePaidLead: true } }),
      prisma.subscriptionCheck.count({ where: { offerId, success: true } })
    ]);

    return {
      clicks,
      uniquePaid,
      successfulChecks
    };
  },

  async ensureAdminExists(adminId: string) {
    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new Error("ADMIN_NOT_FOUND");
    }
    return admin;
  },

  decimalFromNumber(value: number) {
    return new Prisma.Decimal(value);
  }
};
