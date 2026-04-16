import { FastifyInstance } from "fastify";
import { PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { env } from "../config/env.js";
import { AuditAction } from "../constants/audit.js";
import { prisma } from "../infra/prisma.js";
import { requireRoles } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { auditService } from "../services/audit.service.js";
import { campaignService } from "../services/campaign.service.js";
import { financialService } from "../services/financial.service.js";
import { offerService } from "../services/offer.service.js";
import { redirectService } from "../services/redirect.service.js";
import { rotationService } from "../services/rotation.service.js";
import { statsService } from "../services/stats.service.js";
import { subscriptionService } from "../services/subscription.service.js";
import type { TelegramMembershipClient } from "../services/subscription.service.js";
import { withdrawService } from "../services/withdraw.service.js";
import { parseClientIp } from "../utils/request.js";
import { tgbotLink } from "../utils/links.js";

const parseTelegramId = (value: string | number | bigint): bigint => {
  try {
    return BigInt(value);
  } catch {
    throw new AppError(400, "INVALID_TELEGRAM_ID", "Некорректный Telegram ID");
  }
};

const getAdminByActor = async (actorTelegramId?: bigint) => {
  if (!actorTelegramId) {
    throw new AppError(400, "MISSING_ACTOR", "Требуется x-telegram-id");
  }

  const admin = await prisma.admin.findFirst({
    where: { user: { telegramId: actorTelegramId } },
    include: { user: true, balance: true }
  });

  if (!admin) {
    throw new AppError(403, "ADMIN_NOT_FOUND", "Профиль админа не найден");
  }

  return admin;
};

const getSponsorByActor = async (actorTelegramId?: bigint) => {
  if (!actorTelegramId) {
    throw new AppError(400, "MISSING_ACTOR", "Требуется x-telegram-id");
  }

  const sponsor = await prisma.sponsor.findFirst({
    where: { user: { telegramId: actorTelegramId } },
    include: { user: true }
  });

  if (!sponsor) {
    throw new AppError(403, "SPONSOR_NOT_FOUND", "Профиль спонсора не найден");
  }

  return sponsor;
};

export const registerRoutes = async (
  app: FastifyInstance,
  deps: {
    telegramClient: TelegramMembershipClient;
  }
): Promise<void> => {
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  app.get("/go/:token", async (request, reply) => {
    const params = z.object({ token: z.string().min(3) }).parse(request.params);
    const ip = parseClientIp(request.headers as Record<string, unknown>, request.ip);
    const userAgent = String(request.headers["user-agent"] ?? "unknown");

    const result = await redirectService.processClick({
      token: params.token,
      ip,
      userAgent
    });

    await auditService.log({
      actorRole: "ANON",
      action: AuditAction.CLICK,
      entityType: "Offer",
      entityId: result.offer?.id,
      payload: {
        token: params.token,
        blocked: result.antiFraud.blocked,
        reason: result.antiFraud.reason
      }
    });

    if (!result.offer) {
      throw new AppError(404, "OFFER_NOT_FOUND", "Оффер не найден");
    }

    if (result.antiFraud.blocked) {
      throw new AppError(429, "FRAUD_BLOCKED", "Слишком много запросов, попробуйте позже", {
        reason: result.antiFraud.reason
      });
    }

    const redirectUrl = tgbotLink(env.TELEGRAM_BOT_USERNAME, params.token);
    return reply.redirect(redirectUrl, 302);
  });

  app.get("/api/offers/:token", async (request) => {
    const params = z.object({ token: z.string().min(3) }).parse(request.params);
    const query = z
      .object({
        telegramId: z.string().optional()
      })
      .parse(request.query);

    const offer = await offerService.getOfferByToken(params.token);
    if (!offer) {
      throw new AppError(404, "OFFER_NOT_FOUND", "Оффер не найден");
    }

    let sponsors: Array<{ campaignId: string; channelId: string; title: string | null }> = [];
    let alreadyCompleted = false;

    if (query.telegramId) {
      const telegramId = parseTelegramId(query.telegramId);
      const user = await prisma.user.upsert({
        where: { telegramId },
        create: { telegramId },
        update: {}
      });

      const history = await prisma.userOfferHistory.findUnique({
        where: {
          userId_offerId: {
            userId: user.id,
            offerId: offer.id
          }
        }
      });
      alreadyCompleted = Boolean(history?.isUniquePaidLead);

      const selected = await rotationService.rotateForUser({
        offerId: offer.id,
        userId: user.id
      });

      sponsors = selected.map((item) => ({
        campaignId: item.id,
        channelId: item.telegramChannelId,
        title: item.title
      }));
    }

    return {
      offer: {
        id: offer.id,
        token: offer.token,
        title: offer.title,
        description: offer.description,
        file: offer.files[0]
          ? {
              fileType: offer.files[0].fileType,
              fileUrl: offer.files[0].fileUrl,
              telegramFileId: offer.files[0].telegramFileId,
              caption: offer.files[0].caption
            }
          : null
      },
      alreadyCompleted,
      sponsors
    };
  });

  app.post("/api/subscription/check", async (request) => {
    const body = z
      .object({
        token: z.string().min(3),
        telegramId: z.union([z.string(), z.number(), z.bigint()])
      })
      .parse(request.body);

    const result = await subscriptionService.checkAndProcess({
      token: body.token,
      telegramId: parseTelegramId(body.telegramId),
      telegramClient: deps.telegramClient
    });

    await auditService.log({
      actorRole: "USER",
      action: result.success ? AuditAction.SUBSCRIPTION_SUCCESS : AuditAction.SUBSCRIPTION_CHECK,
      entityType: "OfferToken",
      entityId: body.token,
      payload: result
    });

    return result;
  });

  app.post("/api/admin/offers", { preHandler: requireRoles(["ADMIN", "SUPER_ADMIN"]) }, async (request) => {
    const body = z
      .object({
        title: z.string().min(3),
        description: z.string().optional(),
        fileType: z.enum(["TELEGRAM_FILE_ID", "EXTERNAL_URL", "TEXT"]),
        telegramFileId: z.string().optional(),
        fileUrl: z.string().optional(),
        caption: z.string().optional()
      })
      .parse(request.body);

    const admin = await getAdminByActor(request.auth?.actorTelegramId);

    const offer = await offerService.createOffer({
      adminId: admin.id,
      title: body.title,
      description: body.description,
      fileType: body.fileType,
      telegramFileId: body.telegramFileId,
      fileUrl: body.fileUrl,
      caption: body.caption
    });

    await auditService.log({
      actorUserId: admin.userId,
      actorRole: request.auth?.role ?? "ADMIN",
      action: AuditAction.OFFER_CREATED,
      entityType: "Offer",
      entityId: offer.id,
      payload: {
        token: offer.token
      }
    });

    return {
      offerId: offer.id,
      token: offer.token,
      finalLink: offerService.buildFinalLink(offer.token)
    };
  });

  app.get("/api/admin/stats", { preHandler: requireRoles(["ADMIN", "SUPER_ADMIN"]) }, async (request) => {
    const admin = await getAdminByActor(request.auth?.actorTelegramId);
    return statsService.adminStats(admin.id);
  });

  app.post("/api/admin/withdraw", { preHandler: requireRoles(["ADMIN", "SUPER_ADMIN"]) }, async (request) => {
    const body = z
      .object({
        amount: z.number().positive(),
        details: z.record(z.any()).optional()
      })
      .parse(request.body);

    const admin = await getAdminByActor(request.auth?.actorTelegramId);
    const withdrawal = await withdrawService.createAdminWithdrawRequest({
      adminId: admin.id,
      amount: body.amount,
      details: body.details
    });

    await auditService.log({
      actorUserId: admin.userId,
      actorRole: request.auth?.role ?? "ADMIN",
      action: AuditAction.WITHDRAW_REQUEST_CREATED,
      entityType: "WithdrawRequest",
      entityId: withdrawal.id,
      payload: body
    });

    return withdrawal;
  });

  app.get("/api/admin/traffic-packages", { preHandler: requireRoles(["ADMIN", "SUPER_ADMIN"]) }, async () => {
    return campaignService.listActivePackages();
  });

  app.post("/api/admin/traffic-packages", { preHandler: requireRoles(["SUPER_ADMIN"]) }, async (request) => {
    const body = z
      .object({
        id: z.string().uuid().optional(),
        userCount: z.number().int().positive(),
        priceRub: z.number().positive(),
        code: z.string().min(2),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional()
      })
      .parse(request.body);

    return campaignService.upsertPackage(body);
  });

  app.post("/api/sponsor/campaigns", { preHandler: requireRoles(["SPONSOR", "SUPER_ADMIN"]) }, async (request) => {
    const campaignBodySchema = z.object({
      title: z.string().optional(),
      telegramChannelId: z.string().min(3),
      trafficPackageId: z.string().uuid(),
      paymentMethod: z.nativeEnum(PaymentMethod)
    });
    const body: z.infer<typeof campaignBodySchema> = campaignBodySchema.parse(request.body);

    const sponsor = await getSponsorByActor(request.auth?.actorTelegramId);
    if (sponsor.status === "BLOCKED") {
      throw new AppError(403, "SPONSOR_BLOCKED", "Аккаунт спонсора заблокирован");
    }

    const campaign = await campaignService.createCampaign({
      sponsorId: sponsor.id,
      title: body.title,
      telegramChannelId: body.telegramChannelId,
      trafficPackageId: body.trafficPackageId,
      paymentMethod: body.paymentMethod
    });

    await auditService.log({
      actorUserId: sponsor.userId,
      actorRole: request.auth?.role ?? "SPONSOR",
      action: AuditAction.CAMPAIGN_CREATED,
      entityType: "Campaign",
      entityId: campaign.campaign.id,
      payload: body
    });

    return campaign;
  });

  app.post("/api/sponsor/payments/proof", { preHandler: requireRoles(["SPONSOR", "SUPER_ADMIN"]) }, async (request) => {
    const body = z
      .object({
        paymentId: z.string().uuid(),
        proofUrl: z.string().url().optional(),
        proofNote: z.string().max(1000).optional()
      })
      .parse(request.body);

    const sponsor = await getSponsorByActor(request.auth?.actorTelegramId);
    const payment = await prisma.payment.findUnique({ where: { id: body.paymentId } });
    if (!payment || payment.sponsorId !== sponsor.id) {
      throw new AppError(404, "PAYMENT_NOT_FOUND", "Платёж не найден");
    }

    const result = await campaignService.uploadPaymentProof(body);

    await auditService.log({
      actorUserId: sponsor.userId,
      actorRole: request.auth?.role ?? "SPONSOR",
      action: AuditAction.PAYMENT_PROOF_UPLOADED,
      entityType: "Payment",
      entityId: body.paymentId,
      payload: body
    });

    return result;
  });

  app.post(
    "/api/moderation/payments/:id/approve",
    { preHandler: requireRoles(["MODERATOR", "SUPER_ADMIN"]) },
    async (request) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const moderator = request.auth?.actorTelegramId
        ? await prisma.user.findUnique({ where: { telegramId: request.auth.actorTelegramId } })
        : null;

      const result = await financialService.approvePayment(params.id, moderator?.id);
      await auditService.log({
        actorUserId: moderator?.id,
        actorRole: request.auth?.role ?? "MODERATOR",
        action: AuditAction.PAYMENT_APPROVED,
        entityType: "Payment",
        entityId: params.id,
        payload: { idempotent: result.idempotent }
      });

      return result;
    }
  );

  app.post(
    "/api/moderation/payments/:id/reject",
    { preHandler: requireRoles(["MODERATOR", "SUPER_ADMIN"]) },
    async (request) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const body = z.object({ reason: z.string().optional() }).parse(request.body ?? {});
      const moderator = request.auth?.actorTelegramId
        ? await prisma.user.findUnique({ where: { telegramId: request.auth.actorTelegramId } })
        : null;

      const result = await financialService.rejectPayment(params.id, moderator?.id, body.reason);
      await auditService.log({
        actorUserId: moderator?.id,
        actorRole: request.auth?.role ?? "MODERATOR",
        action: AuditAction.PAYMENT_REJECTED,
        entityType: "Payment",
        entityId: params.id,
        payload: { idempotent: result.idempotent, reason: body.reason }
      });

      return result;
    }
  );

  app.get("/api/sponsor/stats", { preHandler: requireRoles(["SPONSOR", "SUPER_ADMIN"]) }, async (request) => {
    const sponsor = await getSponsorByActor(request.auth?.actorTelegramId);
    return statsService.sponsorStats(sponsor.id);
  });

  app.post("/api/sponsor/withdraw", { preHandler: requireRoles(["SPONSOR", "SUPER_ADMIN"]) }, async (request) => {
    const body = z
      .object({
        amount: z.number().positive(),
        details: z.record(z.any()).optional()
      })
      .parse(request.body);

    const sponsor = await getSponsorByActor(request.auth?.actorTelegramId);
    const withdrawal = await withdrawService.createSponsorWithdrawRequest({
      sponsorId: sponsor.id,
      amount: body.amount,
      details: body.details
    });

    await auditService.log({
      actorUserId: sponsor.userId,
      actorRole: request.auth?.role ?? "SPONSOR",
      action: AuditAction.WITHDRAW_REQUEST_CREATED,
      entityType: "WithdrawRequest",
      entityId: withdrawal.id,
      payload: body
    });

    return withdrawal;
  });
};
