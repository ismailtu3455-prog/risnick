import { Prisma } from "@prisma/client";
import { prisma } from "../infra/prisma.js";
import { decimal } from "./payment-calculator.service.js";

export const withdrawService = {
  async createAdminWithdrawRequest(params: {
    adminId: string;
    amount: number;
    details?: Record<string, unknown>;
  }) {
    return prisma.$transaction(async (tx) => {
      const balance = await tx.adminBalance.findUnique({ where: { adminId: params.adminId } });
      if (!balance) {
        throw new Error("ADMIN_BALANCE_NOT_FOUND");
      }

      const amount = decimal(params.amount);
      if (balance.availableAmount.lessThan(amount)) {
        throw new Error("INSUFFICIENT_ADMIN_BALANCE");
      }

      await tx.adminBalance.update({
        where: { id: balance.id },
        data: {
          availableAmount: { decrement: amount },
          pendingAmount: { increment: amount }
        }
      });

      return tx.withdrawRequest.create({
        data: {
          requesterType: "ADMIN",
          adminId: params.adminId,
          amount,
          details: (params.details ?? {}) as Prisma.InputJsonValue
        }
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  async createSponsorWithdrawRequest(params: {
    sponsorId: string;
    amount: number;
    details?: Record<string, unknown>;
  }) {
    return prisma.withdrawRequest.create({
      data: {
        requesterType: "SPONSOR",
        sponsorId: params.sponsorId,
        amount: decimal(params.amount),
        details: (params.details ?? {}) as Prisma.InputJsonValue
      }
    });
  }
};
