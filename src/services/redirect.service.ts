import { prisma } from "../infra/prisma.js";
import { antiFraudService } from "./anti-fraud.service.js";
import { hashString } from "../utils/hash.js";

export const redirectService = {
  async processClick(params: {
    token: string;
    ip: string;
    userAgent: string;
  }) {
    const ipHash = hashString(params.ip);
    const userAgentHash = hashString(params.userAgent || "unknown");

    const antiFraud = await antiFraudService.checkClick({
      ipHash,
      uaHash: userAgentHash,
      token: params.token
    });

    const offer = await prisma.offer.findFirst({
      where: {
        token: params.token,
        isActive: true
      }
    });

    const click = await prisma.clickLog.create({
      data: {
        token: params.token,
        offerId: offer?.id,
        ipHash,
        userAgentHash,
        rawUserAgent: params.userAgent,
        isBlocked: antiFraud.blocked,
        blockReason: antiFraud.reason
      }
    });

    if (antiFraud.blocked) {
      await prisma.fraudFlag.create({
        data: {
          offerId: offer?.id,
          clickLogId: click.id,
          reason: antiFraud.reason ?? "UNKNOWN",
          severity: "MEDIUM",
          metadata: {
            token: params.token
          }
        }
      });
    }

    return {
      offer,
      antiFraud,
      click
    };
  }
};
