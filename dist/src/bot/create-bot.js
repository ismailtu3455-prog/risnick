"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBot = void 0;
const telegraf_1 = require("telegraf");
const client_1 = require("@prisma/client");
const env_js_1 = require("../config/env.js");
const ru_js_1 = require("./texts/ru.js");
const campaign_service_js_1 = require("../services/campaign.service.js");
const offer_service_js_1 = require("../services/offer.service.js");
const rotation_service_js_1 = require("../services/rotation.service.js");
const stats_service_js_1 = require("../services/stats.service.js");
const subscription_service_js_1 = require("../services/subscription.service.js");
const user_service_js_1 = require("../services/user.service.js");
const withdraw_service_js_1 = require("../services/withdraw.service.js");
const keyboards_js_1 = require("./keyboards.js");
const prisma_js_1 = require("../infra/prisma.js");
const parseStartPayload = (text) => {
    if (!text) {
        return undefined;
    }
    const parts = text.trim().split(/\s+/);
    if (parts.length < 2) {
        return undefined;
    }
    return parts[1];
};
const parseAdminCreate = (text) => {
    const raw = text.replace(/^\/admin_create\s+/, "").trim();
    const [title, description, fileUrl] = raw.split("|").map((v) => v?.trim());
    if (!title) {
        return null;
    }
    return {
        title,
        description,
        fileUrl
    };
};
const createBot = () => {
    const bot = new telegraf_1.Telegraf(env_js_1.env.TELEGRAM_BOT_TOKEN);
    const getMessageText = (ctx) => {
        const msg = ctx.message;
        return msg?.text;
    };
    bot.catch(async (error, ctx) => {
        console.error("Bot error", error);
        try {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
        }
        catch {
            // ignore bot reply errors
        }
    });
    bot.start(async (ctx) => {
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        await user_service_js_1.userService.upsertTelegramUser({
            telegramId: BigInt(tgUser.id),
            username: tgUser.username,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name,
            languageCode: tgUser.language_code
        });
        const payload = parseStartPayload(getMessageText(ctx));
        if (payload === "sponsor") {
            let sponsor = await user_service_js_1.userService.requireSponsorByTelegramId(BigInt(tgUser.id));
            if (!sponsor) {
                const user = await user_service_js_1.userService.getUserByTelegramId(BigInt(tgUser.id));
                if (user) {
                    sponsor = await user_service_js_1.userService.createSponsorForUser(user.id);
                }
            }
            await ctx.reply(ru_js_1.ruTexts.sponsorMenu);
            return;
        }
        if (!payload) {
            await ctx.reply(ru_js_1.ruTexts.startFallback);
            return;
        }
        const offer = await offer_service_js_1.offerService.getOfferByToken(payload);
        if (!offer) {
            await ctx.reply(ru_js_1.ruTexts.offerNotFound);
            return;
        }
        await ctx.reply(ru_js_1.ruTexts.offerIntro(offer.title, offer.description), (0, keyboards_js_1.offerMainKeyboard)(payload));
        const user = await user_service_js_1.userService.getUserByTelegramId(BigInt(tgUser.id));
        if (!user) {
            return;
        }
        const history = await prisma_js_1.prisma.userOfferHistory.findUnique({
            where: {
                userId_offerId: {
                    userId: user.id,
                    offerId: offer.id
                }
            }
        });
        if (history?.isUniquePaidLead) {
            await ctx.reply(ru_js_1.ruTexts.offerAlreadyCompleted);
        }
    });
    bot.action(/show_sponsors:(.+)/, async (ctx) => {
        const token = ctx.match[1];
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        const user = await user_service_js_1.userService.getUserByTelegramId(BigInt(tgUser.id));
        const offer = await offer_service_js_1.offerService.getOfferByToken(token);
        if (!user || !offer) {
            await ctx.answerCbQuery("Оффер не найден", { show_alert: true });
            return;
        }
        const selected = await rotation_service_js_1.rotationService.rotateForUser({
            offerId: offer.id,
            userId: user.id
        });
        if (selected.length === 0) {
            await ctx.editMessageText(ru_js_1.ruTexts.noSponsors);
            return;
        }
        await ctx.editMessageText(ru_js_1.ruTexts.showSponsorsTitle, (0, keyboards_js_1.sponsorKeyboard)(token, selected.map((item) => ({ channelId: item.telegramChannelId, title: item.title }))));
    });
    bot.action(/check_offer:(.+)/, async (ctx) => {
        const token = ctx.match[1];
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        const result = await subscription_service_js_1.subscriptionService.checkAndProcess({
            token,
            telegramId: BigInt(tgUser.id),
            telegramClient: bot.telegram
        });
        if (result.status === "NO_SPONSORS") {
            await ctx.reply(ru_js_1.ruTexts.checkNoSponsors);
            return;
        }
        if (result.status === "CHECK_UNAVAILABLE") {
            await ctx.reply(ru_js_1.ruTexts.checkUnavailable);
            return;
        }
        if (!result.success) {
            await ctx.reply(ru_js_1.ruTexts.checkPartial(result.missingCount));
            return;
        }
        await ctx.reply(ru_js_1.ruTexts.checkSuccess);
        if (!result.file) {
            return;
        }
        if (result.file.fileType === "TELEGRAM_FILE_ID" && result.file.telegramFileId) {
            await ctx.replyWithDocument(result.file.telegramFileId, {
                caption: result.file.caption ?? undefined
            });
            return;
        }
        if (result.file.fileType === "EXTERNAL_URL" && result.file.fileUrl) {
            await ctx.reply(`Файл: ${result.file.fileUrl}`);
            return;
        }
        if (result.file.fileType === "TEXT" && result.file.caption) {
            await ctx.reply(result.file.caption);
        }
    });
    bot.command("admin", async (ctx) => {
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        let admin = await user_service_js_1.userService.requireAdminByTelegramId(BigInt(tgUser.id));
        if (!admin && BigInt(tgUser.id) === env_js_1.env.TELEGRAM_SUPER_ADMIN_ID) {
            const user = await user_service_js_1.userService.getUserByTelegramId(BigInt(tgUser.id));
            if (user) {
                await user_service_js_1.userService.createAdminForUser(user.id, true, env_js_1.env.ADMIN_REWARD_RUB);
            }
            admin = await user_service_js_1.userService.requireAdminByTelegramId(BigInt(tgUser.id));
        }
        if (!admin) {
            await ctx.reply(ru_js_1.ruTexts.adminAccessDenied);
            return;
        }
        await ctx.reply(ru_js_1.ruTexts.adminMenu);
    });
    bot.command("admin_create", async (ctx) => {
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        const text = getMessageText(ctx);
        if (!text) {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
            return;
        }
        const payload = parseAdminCreate(text);
        if (!payload) {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
            return;
        }
        const admin = await user_service_js_1.userService.requireAdminByTelegramId(BigInt(tgUser.id));
        if (!admin) {
            await ctx.reply(ru_js_1.ruTexts.adminAccessDenied);
            return;
        }
        const offer = await offer_service_js_1.offerService.createOffer({
            adminId: admin.id,
            title: payload.title,
            description: payload.description,
            fileType: payload.fileUrl ? "EXTERNAL_URL" : "TEXT",
            fileUrl: payload.fileUrl,
            caption: payload.fileUrl ? undefined : payload.description
        });
        await ctx.reply(ru_js_1.ruTexts.adminOfferCreated(offer_service_js_1.offerService.buildFinalLink(offer.token), offer.token));
    });
    bot.command("admin_stats", async (ctx) => {
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        const admin = await user_service_js_1.userService.requireAdminByTelegramId(BigInt(tgUser.id));
        if (!admin) {
            await ctx.reply(ru_js_1.ruTexts.adminAccessDenied);
            return;
        }
        const stats = await stats_service_js_1.statsService.adminStats(admin.id);
        await ctx.reply(ru_js_1.ruTexts.adminStats(stats));
    });
    bot.command("admin_withdraw", async (ctx) => {
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        const admin = await user_service_js_1.userService.requireAdminByTelegramId(BigInt(tgUser.id));
        if (!admin) {
            await ctx.reply(ru_js_1.ruTexts.adminAccessDenied);
            return;
        }
        const text = getMessageText(ctx);
        if (!text) {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
            return;
        }
        const amountRaw = text.split(/\s+/)[1];
        const amount = Number(amountRaw);
        if (!amount || Number.isNaN(amount) || amount <= 0) {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
            return;
        }
        const request = await withdraw_service_js_1.withdrawService.createAdminWithdrawRequest({
            adminId: admin.id,
            amount
        });
        await ctx.reply(ru_js_1.ruTexts.withdrawCreated(request.id));
    });
    bot.command("sponsor", async (ctx) => {
        await ctx.reply(ru_js_1.ruTexts.sponsorMenu);
    });
    bot.command("sponsor_packages", async (ctx) => {
        const list = await campaign_service_js_1.campaignService.listActivePackages();
        const lines = list.map((item) => `${item.id} -> ${item.userCount} пользователей = ${item.priceRub.toString()} ₽`);
        await ctx.reply(`${ru_js_1.ruTexts.sponsorPackagesTitle}${lines.join("\n")}`);
    });
    bot.command("sponsor_create", async (ctx) => {
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        const sponsor = await user_service_js_1.userService.requireSponsorByTelegramId(BigInt(tgUser.id));
        if (!sponsor) {
            await ctx.reply(ru_js_1.ruTexts.sponsorAccessDenied);
            return;
        }
        const text = getMessageText(ctx);
        if (!text) {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
            return;
        }
        const [, channelId, packageId, methodRaw] = text.split(/\s+/);
        const paymentMethod = methodRaw;
        if (!channelId || !packageId || !Object.values(client_1.PaymentMethod).includes(paymentMethod)) {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
            return;
        }
        const result = await campaign_service_js_1.campaignService.createCampaign({
            sponsorId: sponsor.id,
            telegramChannelId: channelId,
            trafficPackageId: packageId,
            paymentMethod
        });
        await ctx.reply(ru_js_1.ruTexts.sponsorCampaignCreated(result.campaign.id, result.payment.id, result.payment.grossAmount.toString()));
    });
    bot.command("sponsor_proof", async (ctx) => {
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        const sponsor = await user_service_js_1.userService.requireSponsorByTelegramId(BigInt(tgUser.id));
        if (!sponsor) {
            await ctx.reply(ru_js_1.ruTexts.sponsorAccessDenied);
            return;
        }
        const text = getMessageText(ctx);
        if (!text) {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
            return;
        }
        const [, paymentId, ...noteParts] = text.split(/\s+/);
        if (!paymentId) {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
            return;
        }
        const note = noteParts.join(" ");
        await campaign_service_js_1.campaignService.uploadPaymentProof({
            paymentId,
            proofUrl: note.startsWith("http") ? note : undefined,
            proofNote: note
        });
        await ctx.reply(ru_js_1.ruTexts.proofUploaded);
    });
    bot.command("sponsor_stats", async (ctx) => {
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        const sponsor = await user_service_js_1.userService.requireSponsorByTelegramId(BigInt(tgUser.id));
        if (!sponsor) {
            await ctx.reply(ru_js_1.ruTexts.sponsorAccessDenied);
            return;
        }
        const stats = await stats_service_js_1.statsService.sponsorStats(sponsor.id);
        await ctx.reply(ru_js_1.ruTexts.sponsorStats(stats));
    });
    bot.command("sponsor_withdraw", async (ctx) => {
        const tgUser = ctx.from;
        if (!tgUser) {
            return;
        }
        const sponsor = await user_service_js_1.userService.requireSponsorByTelegramId(BigInt(tgUser.id));
        if (!sponsor) {
            await ctx.reply(ru_js_1.ruTexts.sponsorAccessDenied);
            return;
        }
        const text = getMessageText(ctx);
        if (!text) {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
            return;
        }
        const amountRaw = text.split(/\s+/)[1];
        const amount = Number(amountRaw);
        if (!amount || Number.isNaN(amount) || amount <= 0) {
            await ctx.reply(ru_js_1.ruTexts.genericCommandError);
            return;
        }
        const request = await withdraw_service_js_1.withdrawService.createSponsorWithdrawRequest({
            sponsorId: sponsor.id,
            amount
        });
        await ctx.reply(ru_js_1.ruTexts.withdrawCreated(request.id));
    });
    return bot;
};
exports.createBot = createBot;
