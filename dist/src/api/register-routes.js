"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const env_js_1 = require("../config/env.js");
const prisma_js_1 = require("../infra/prisma.js");
const auth_js_1 = require("../middleware/auth.js");
const error_js_1 = require("../middleware/error.js");
const audit_service_js_1 = require("../services/audit.service.js");
const campaign_service_js_1 = require("../services/campaign.service.js");
const financial_service_js_1 = require("../services/financial.service.js");
const offer_service_js_1 = require("../services/offer.service.js");
const redirect_service_js_1 = require("../services/redirect.service.js");
const rotation_service_js_1 = require("../services/rotation.service.js");
const stats_service_js_1 = require("../services/stats.service.js");
const subscription_service_js_1 = require("../services/subscription.service.js");
const withdraw_service_js_1 = require("../services/withdraw.service.js");
const request_js_1 = require("../utils/request.js");
const links_js_1 = require("../utils/links.js");
const parseTelegramId = (value) => {
    try {
        return BigInt(value);
    }
    catch {
        throw new error_js_1.AppError(400, "INVALID_TELEGRAM_ID", "Некорректный Telegram ID");
    }
};
const getAdminByActor = async (actorTelegramId) => {
    if (!actorTelegramId) {
        throw new error_js_1.AppError(400, "MISSING_ACTOR", "Требуется x-telegram-id");
    }
    const admin = await prisma_js_1.prisma.admin.findFirst({
        where: { user: { telegramId: actorTelegramId } },
        include: { user: true, balance: true }
    });
    if (!admin) {
        throw new error_js_1.AppError(403, "ADMIN_NOT_FOUND", "Профиль админа не найден");
    }
    return admin;
};
const getSponsorByActor = async (actorTelegramId) => {
    if (!actorTelegramId) {
        throw new error_js_1.AppError(400, "MISSING_ACTOR", "Требуется x-telegram-id");
    }
    const sponsor = await prisma_js_1.prisma.sponsor.findFirst({
        where: { user: { telegramId: actorTelegramId } },
        include: { user: true }
    });
    if (!sponsor) {
        throw new error_js_1.AppError(403, "SPONSOR_NOT_FOUND", "Профиль спонсора не найден");
    }
    return sponsor;
};
const registerRoutes = async (app, deps) => {
    app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));
    app.get("/go/:token", async (request, reply) => {
        const params = zod_1.z.object({ token: zod_1.z.string().min(3) }).parse(request.params);
        const ip = (0, request_js_1.parseClientIp)(request.headers, request.ip);
        const userAgent = String(request.headers["user-agent"] ?? "unknown");
        const result = await redirect_service_js_1.redirectService.processClick({
            token: params.token,
            ip,
            userAgent
        });
        await audit_service_js_1.auditService.log({
            actorRole: "ANON",
            action: "CLICK" /* AuditAction.CLICK */,
            entityType: "Offer",
            entityId: result.offer?.id,
            payload: {
                token: params.token,
                blocked: result.antiFraud.blocked,
                reason: result.antiFraud.reason
            }
        });
        if (!result.offer) {
            throw new error_js_1.AppError(404, "OFFER_NOT_FOUND", "Оффер не найден");
        }
        if (result.antiFraud.blocked) {
            throw new error_js_1.AppError(429, "FRAUD_BLOCKED", "Слишком много запросов, попробуйте позже", {
                reason: result.antiFraud.reason
            });
        }
        const redirectUrl = (0, links_js_1.tgbotLink)(env_js_1.env.TELEGRAM_BOT_USERNAME, params.token);
        return reply.redirect(redirectUrl, 302);
    });
    app.get("/api/offers/:token", async (request) => {
        const params = zod_1.z.object({ token: zod_1.z.string().min(3) }).parse(request.params);
        const query = zod_1.z
            .object({
            telegramId: zod_1.z.string().optional()
        })
            .parse(request.query);
        const offer = await offer_service_js_1.offerService.getOfferByToken(params.token);
        if (!offer) {
            throw new error_js_1.AppError(404, "OFFER_NOT_FOUND", "Оффер не найден");
        }
        let sponsors = [];
        let alreadyCompleted = false;
        if (query.telegramId) {
            const telegramId = parseTelegramId(query.telegramId);
            const user = await prisma_js_1.prisma.user.upsert({
                where: { telegramId },
                create: { telegramId },
                update: {}
            });
            const history = await prisma_js_1.prisma.userOfferHistory.findUnique({
                where: {
                    userId_offerId: {
                        userId: user.id,
                        offerId: offer.id
                    }
                }
            });
            alreadyCompleted = Boolean(history?.isUniquePaidLead);
            const selected = await rotation_service_js_1.rotationService.rotateForUser({
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
        const body = zod_1.z
            .object({
            token: zod_1.z.string().min(3),
            telegramId: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.bigint()])
        })
            .parse(request.body);
        const result = await subscription_service_js_1.subscriptionService.checkAndProcess({
            token: body.token,
            telegramId: parseTelegramId(body.telegramId),
            telegramClient: deps.telegramClient
        });
        await audit_service_js_1.auditService.log({
            actorRole: "USER",
            action: result.success ? "SUBSCRIPTION_SUCCESS" /* AuditAction.SUBSCRIPTION_SUCCESS */ : "SUBSCRIPTION_CHECK" /* AuditAction.SUBSCRIPTION_CHECK */,
            entityType: "OfferToken",
            entityId: body.token,
            payload: result
        });
        return result;
    });
    app.post("/api/admin/offers", { preHandler: (0, auth_js_1.requireRoles)(["ADMIN", "SUPER_ADMIN"]) }, async (request) => {
        const body = zod_1.z
            .object({
            title: zod_1.z.string().min(3),
            description: zod_1.z.string().optional(),
            fileType: zod_1.z.enum(["TELEGRAM_FILE_ID", "EXTERNAL_URL", "TEXT"]),
            telegramFileId: zod_1.z.string().optional(),
            fileUrl: zod_1.z.string().optional(),
            caption: zod_1.z.string().optional()
        })
            .parse(request.body);
        const admin = await getAdminByActor(request.auth?.actorTelegramId);
        const offer = await offer_service_js_1.offerService.createOffer({
            adminId: admin.id,
            title: body.title,
            description: body.description,
            fileType: body.fileType,
            telegramFileId: body.telegramFileId,
            fileUrl: body.fileUrl,
            caption: body.caption
        });
        await audit_service_js_1.auditService.log({
            actorUserId: admin.userId,
            actorRole: request.auth?.role ?? "ADMIN",
            action: "OFFER_CREATED" /* AuditAction.OFFER_CREATED */,
            entityType: "Offer",
            entityId: offer.id,
            payload: {
                token: offer.token
            }
        });
        return {
            offerId: offer.id,
            token: offer.token,
            finalLink: offer_service_js_1.offerService.buildFinalLink(offer.token)
        };
    });
    app.get("/api/admin/stats", { preHandler: (0, auth_js_1.requireRoles)(["ADMIN", "SUPER_ADMIN"]) }, async (request) => {
        const admin = await getAdminByActor(request.auth?.actorTelegramId);
        return stats_service_js_1.statsService.adminStats(admin.id);
    });
    app.post("/api/admin/withdraw", { preHandler: (0, auth_js_1.requireRoles)(["ADMIN", "SUPER_ADMIN"]) }, async (request) => {
        const body = zod_1.z
            .object({
            amount: zod_1.z.number().positive(),
            details: zod_1.z.record(zod_1.z.any()).optional()
        })
            .parse(request.body);
        const admin = await getAdminByActor(request.auth?.actorTelegramId);
        const withdrawal = await withdraw_service_js_1.withdrawService.createAdminWithdrawRequest({
            adminId: admin.id,
            amount: body.amount,
            details: body.details
        });
        await audit_service_js_1.auditService.log({
            actorUserId: admin.userId,
            actorRole: request.auth?.role ?? "ADMIN",
            action: "WITHDRAW_REQUEST_CREATED" /* AuditAction.WITHDRAW_REQUEST_CREATED */,
            entityType: "WithdrawRequest",
            entityId: withdrawal.id,
            payload: body
        });
        return withdrawal;
    });
    app.get("/api/admin/traffic-packages", { preHandler: (0, auth_js_1.requireRoles)(["ADMIN", "SUPER_ADMIN"]) }, async () => {
        return campaign_service_js_1.campaignService.listActivePackages();
    });
    app.post("/api/admin/traffic-packages", { preHandler: (0, auth_js_1.requireRoles)(["SUPER_ADMIN"]) }, async (request) => {
        const body = zod_1.z
            .object({
            id: zod_1.z.string().uuid().optional(),
            userCount: zod_1.z.number().int().positive(),
            priceRub: zod_1.z.number().positive(),
            code: zod_1.z.string().min(2),
            isActive: zod_1.z.boolean().optional(),
            sortOrder: zod_1.z.number().int().optional()
        })
            .parse(request.body);
        return campaign_service_js_1.campaignService.upsertPackage(body);
    });
    app.post("/api/sponsor/campaigns", { preHandler: (0, auth_js_1.requireRoles)(["SPONSOR", "SUPER_ADMIN"]) }, async (request) => {
        const campaignBodySchema = zod_1.z.object({
            title: zod_1.z.string().optional(),
            telegramChannelId: zod_1.z.string().min(3),
            trafficPackageId: zod_1.z.string().uuid(),
            paymentMethod: zod_1.z.nativeEnum(client_1.PaymentMethod)
        });
        const body = campaignBodySchema.parse(request.body);
        const sponsor = await getSponsorByActor(request.auth?.actorTelegramId);
        if (sponsor.status === "BLOCKED") {
            throw new error_js_1.AppError(403, "SPONSOR_BLOCKED", "Аккаунт спонсора заблокирован");
        }
        const campaign = await campaign_service_js_1.campaignService.createCampaign({
            sponsorId: sponsor.id,
            title: body.title,
            telegramChannelId: body.telegramChannelId,
            trafficPackageId: body.trafficPackageId,
            paymentMethod: body.paymentMethod
        });
        await audit_service_js_1.auditService.log({
            actorUserId: sponsor.userId,
            actorRole: request.auth?.role ?? "SPONSOR",
            action: "CAMPAIGN_CREATED" /* AuditAction.CAMPAIGN_CREATED */,
            entityType: "Campaign",
            entityId: campaign.campaign.id,
            payload: body
        });
        return campaign;
    });
    app.post("/api/sponsor/payments/proof", { preHandler: (0, auth_js_1.requireRoles)(["SPONSOR", "SUPER_ADMIN"]) }, async (request) => {
        const body = zod_1.z
            .object({
            paymentId: zod_1.z.string().uuid(),
            proofUrl: zod_1.z.string().url().optional(),
            proofNote: zod_1.z.string().max(1000).optional()
        })
            .parse(request.body);
        const sponsor = await getSponsorByActor(request.auth?.actorTelegramId);
        const payment = await prisma_js_1.prisma.payment.findUnique({ where: { id: body.paymentId } });
        if (!payment || payment.sponsorId !== sponsor.id) {
            throw new error_js_1.AppError(404, "PAYMENT_NOT_FOUND", "Платёж не найден");
        }
        const result = await campaign_service_js_1.campaignService.uploadPaymentProof(body);
        await audit_service_js_1.auditService.log({
            actorUserId: sponsor.userId,
            actorRole: request.auth?.role ?? "SPONSOR",
            action: "PAYMENT_PROOF_UPLOADED" /* AuditAction.PAYMENT_PROOF_UPLOADED */,
            entityType: "Payment",
            entityId: body.paymentId,
            payload: body
        });
        return result;
    });
    app.post("/api/moderation/payments/:id/approve", { preHandler: (0, auth_js_1.requireRoles)(["MODERATOR", "SUPER_ADMIN"]) }, async (request) => {
        const params = zod_1.z.object({ id: zod_1.z.string().uuid() }).parse(request.params);
        const moderator = request.auth?.actorTelegramId
            ? await prisma_js_1.prisma.user.findUnique({ where: { telegramId: request.auth.actorTelegramId } })
            : null;
        const result = await financial_service_js_1.financialService.approvePayment(params.id, moderator?.id);
        await audit_service_js_1.auditService.log({
            actorUserId: moderator?.id,
            actorRole: request.auth?.role ?? "MODERATOR",
            action: "PAYMENT_APPROVED" /* AuditAction.PAYMENT_APPROVED */,
            entityType: "Payment",
            entityId: params.id,
            payload: { idempotent: result.idempotent }
        });
        return result;
    });
    app.post("/api/moderation/payments/:id/reject", { preHandler: (0, auth_js_1.requireRoles)(["MODERATOR", "SUPER_ADMIN"]) }, async (request) => {
        const params = zod_1.z.object({ id: zod_1.z.string().uuid() }).parse(request.params);
        const body = zod_1.z.object({ reason: zod_1.z.string().optional() }).parse(request.body ?? {});
        const moderator = request.auth?.actorTelegramId
            ? await prisma_js_1.prisma.user.findUnique({ where: { telegramId: request.auth.actorTelegramId } })
            : null;
        const result = await financial_service_js_1.financialService.rejectPayment(params.id, moderator?.id, body.reason);
        await audit_service_js_1.auditService.log({
            actorUserId: moderator?.id,
            actorRole: request.auth?.role ?? "MODERATOR",
            action: "PAYMENT_REJECTED" /* AuditAction.PAYMENT_REJECTED */,
            entityType: "Payment",
            entityId: params.id,
            payload: { idempotent: result.idempotent, reason: body.reason }
        });
        return result;
    });
    app.get("/api/sponsor/stats", { preHandler: (0, auth_js_1.requireRoles)(["SPONSOR", "SUPER_ADMIN"]) }, async (request) => {
        const sponsor = await getSponsorByActor(request.auth?.actorTelegramId);
        return stats_service_js_1.statsService.sponsorStats(sponsor.id);
    });
    app.post("/api/sponsor/withdraw", { preHandler: (0, auth_js_1.requireRoles)(["SPONSOR", "SUPER_ADMIN"]) }, async (request) => {
        const body = zod_1.z
            .object({
            amount: zod_1.z.number().positive(),
            details: zod_1.z.record(zod_1.z.any()).optional()
        })
            .parse(request.body);
        const sponsor = await getSponsorByActor(request.auth?.actorTelegramId);
        const withdrawal = await withdraw_service_js_1.withdrawService.createSponsorWithdrawRequest({
            sponsorId: sponsor.id,
            amount: body.amount,
            details: body.details
        });
        await audit_service_js_1.auditService.log({
            actorUserId: sponsor.userId,
            actorRole: request.auth?.role ?? "SPONSOR",
            action: "WITHDRAW_REQUEST_CREATED" /* AuditAction.WITHDRAW_REQUEST_CREATED */,
            entityType: "WithdrawRequest",
            entityId: withdrawal.id,
            payload: body
        });
        return withdrawal;
    });
};
exports.registerRoutes = registerRoutes;
