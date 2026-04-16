import { Telegraf } from "telegraf";
import { PaymentMethod } from "@prisma/client";
import { env } from "../config/env.js";
import { ruTexts } from "./texts/ru.js";
import { campaignService } from "../services/campaign.service.js";
import { offerService } from "../services/offer.service.js";
import { rotationService } from "../services/rotation.service.js";
import { statsService } from "../services/stats.service.js";
import { subscriptionService } from "../services/subscription.service.js";
import { userService } from "../services/user.service.js";
import { withdrawService } from "../services/withdraw.service.js";
import { offerMainKeyboard, sponsorKeyboard } from "./keyboards.js";
import { prisma } from "../infra/prisma.js";

const parseStartPayload = (text?: string): string | undefined => {
  if (!text) {
    return undefined;
  }

  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) {
    return undefined;
  }

  return parts[1];
};

const parseAdminCreate = (text: string): { title: string; description?: string; fileUrl?: string } | null => {
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

export const createBot = () => {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  const getMessageText = (ctx: { message?: { text?: string } }): string | undefined => {
    const msg = (ctx as { message?: { text?: string } }).message;
    return msg?.text;
  };

  bot.catch(async (error, ctx) => {
    console.error("Bot error", error);
    try {
      await ctx.reply(ruTexts.genericCommandError);
    } catch {
      // ignore bot reply errors
    }
  });

  bot.start(async (ctx) => {
    const tgUser = ctx.from;
    if (!tgUser) {
      return;
    }

    await userService.upsertTelegramUser({
      telegramId: BigInt(tgUser.id),
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      languageCode: tgUser.language_code
    });

    const payload = parseStartPayload(getMessageText(ctx));

    if (payload === "sponsor") {
      let sponsor = await userService.requireSponsorByTelegramId(BigInt(tgUser.id));
      if (!sponsor) {
        const user = await userService.getUserByTelegramId(BigInt(tgUser.id));
        if (user) {
          sponsor = await userService.createSponsorForUser(user.id);
        }
      }

      await ctx.reply(ruTexts.sponsorMenu);
      return;
    }

    if (!payload) {
      await ctx.reply(ruTexts.startFallback);
      return;
    }

    const offer = await offerService.getOfferByToken(payload);
    if (!offer) {
      await ctx.reply(ruTexts.offerNotFound);
      return;
    }

    await ctx.reply(ruTexts.offerIntro(offer.title, offer.description), offerMainKeyboard(payload));

    const user = await userService.getUserByTelegramId(BigInt(tgUser.id));
    if (!user) {
      return;
    }

    const history = await prisma.userOfferHistory.findUnique({
      where: {
        userId_offerId: {
          userId: user.id,
          offerId: offer.id
        }
      }
    });

    if (history?.isUniquePaidLead) {
      await ctx.reply(ruTexts.offerAlreadyCompleted);
    }
  });

  bot.action(/show_sponsors:(.+)/, async (ctx) => {
    const token = ctx.match[1];
    const tgUser = ctx.from;
    if (!tgUser) {
      return;
    }

    const user = await userService.getUserByTelegramId(BigInt(tgUser.id));
    const offer = await offerService.getOfferByToken(token);
    if (!user || !offer) {
      await ctx.answerCbQuery("Оффер не найден", { show_alert: true });
      return;
    }

    const selected = await rotationService.rotateForUser({
      offerId: offer.id,
      userId: user.id
    });

    if (selected.length === 0) {
      await ctx.editMessageText(ruTexts.noSponsors);
      return;
    }

    await ctx.editMessageText(
      ruTexts.showSponsorsTitle,
      sponsorKeyboard(
        token,
        selected.map((item) => ({ channelId: item.telegramChannelId, title: item.title }))
      )
    );
  });

  bot.action(/check_offer:(.+)/, async (ctx) => {
    const token = ctx.match[1];
    const tgUser = ctx.from;
    if (!tgUser) {
      return;
    }

    const result = await subscriptionService.checkAndProcess({
      token,
      telegramId: BigInt(tgUser.id),
      telegramClient: bot.telegram
    });

    if (result.status === "NO_SPONSORS") {
      await ctx.reply(ruTexts.checkNoSponsors);
      return;
    }

    if (result.status === "CHECK_UNAVAILABLE") {
      await ctx.reply(ruTexts.checkUnavailable);
      return;
    }

    if (!result.success) {
      await ctx.reply(ruTexts.checkPartial(result.missingCount));
      return;
    }

    await ctx.reply(ruTexts.checkSuccess);

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

    let admin = await userService.requireAdminByTelegramId(BigInt(tgUser.id));

    if (!admin && BigInt(tgUser.id) === env.TELEGRAM_SUPER_ADMIN_ID) {
      const user = await userService.getUserByTelegramId(BigInt(tgUser.id));
      if (user) {
        await userService.createAdminForUser(user.id, true, env.ADMIN_REWARD_RUB);
      }
      admin = await userService.requireAdminByTelegramId(BigInt(tgUser.id));
    }

    if (!admin) {
      await ctx.reply(ruTexts.adminAccessDenied);
      return;
    }

    await ctx.reply(ruTexts.adminMenu);
  });

  bot.command("admin_create", async (ctx) => {
    const tgUser = ctx.from;
    if (!tgUser) {
      return;
    }

    const text = getMessageText(ctx);
    if (!text) {
      await ctx.reply(ruTexts.genericCommandError);
      return;
    }

    const payload = parseAdminCreate(text);
    if (!payload) {
      await ctx.reply(ruTexts.genericCommandError);
      return;
    }

    const admin = await userService.requireAdminByTelegramId(BigInt(tgUser.id));
    if (!admin) {
      await ctx.reply(ruTexts.adminAccessDenied);
      return;
    }

    const offer = await offerService.createOffer({
      adminId: admin.id,
      title: payload.title,
      description: payload.description,
      fileType: payload.fileUrl ? "EXTERNAL_URL" : "TEXT",
      fileUrl: payload.fileUrl,
      caption: payload.fileUrl ? undefined : payload.description
    });

    await ctx.reply(ruTexts.adminOfferCreated(offerService.buildFinalLink(offer.token), offer.token));
  });

  bot.command("admin_stats", async (ctx) => {
    const tgUser = ctx.from;
    if (!tgUser) {
      return;
    }

    const admin = await userService.requireAdminByTelegramId(BigInt(tgUser.id));
    if (!admin) {
      await ctx.reply(ruTexts.adminAccessDenied);
      return;
    }

    const stats = await statsService.adminStats(admin.id);
    await ctx.reply(ruTexts.adminStats(stats));
  });

  bot.command("admin_withdraw", async (ctx) => {
    const tgUser = ctx.from;
    if (!tgUser) {
      return;
    }

    const admin = await userService.requireAdminByTelegramId(BigInt(tgUser.id));
    if (!admin) {
      await ctx.reply(ruTexts.adminAccessDenied);
      return;
    }

    const text = getMessageText(ctx);
    if (!text) {
      await ctx.reply(ruTexts.genericCommandError);
      return;
    }

    const amountRaw = text.split(/\s+/)[1];
    const amount = Number(amountRaw);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      await ctx.reply(ruTexts.genericCommandError);
      return;
    }

    const request = await withdrawService.createAdminWithdrawRequest({
      adminId: admin.id,
      amount
    });

    await ctx.reply(ruTexts.withdrawCreated(request.id));
  });

  bot.command("sponsor", async (ctx) => {
    await ctx.reply(ruTexts.sponsorMenu);
  });

  bot.command("sponsor_packages", async (ctx) => {
    const list = await campaignService.listActivePackages();
    const lines = list.map(
      (item: { id: string; userCount: number; priceRub: { toString(): string } }) =>
        `${item.id} -> ${item.userCount} пользователей = ${item.priceRub.toString()} ₽`
    );
    await ctx.reply(`${ruTexts.sponsorPackagesTitle}${lines.join("\n")}`);
  });

  bot.command("sponsor_create", async (ctx) => {
    const tgUser = ctx.from;
    if (!tgUser) {
      return;
    }

    const sponsor = await userService.requireSponsorByTelegramId(BigInt(tgUser.id));
    if (!sponsor) {
      await ctx.reply(ruTexts.sponsorAccessDenied);
      return;
    }

    const text = getMessageText(ctx);
    if (!text) {
      await ctx.reply(ruTexts.genericCommandError);
      return;
    }

    const [, channelId, packageId, methodRaw] = text.split(/\s+/);
    const paymentMethod = methodRaw as PaymentMethod;
    if (!channelId || !packageId || !Object.values(PaymentMethod).includes(paymentMethod)) {
      await ctx.reply(ruTexts.genericCommandError);
      return;
    }

    const result = await campaignService.createCampaign({
      sponsorId: sponsor.id,
      telegramChannelId: channelId,
      trafficPackageId: packageId,
      paymentMethod
    });

    await ctx.reply(
      ruTexts.sponsorCampaignCreated(
        result.campaign.id,
        result.payment.id,
        result.payment.grossAmount.toString()
      )
    );
  });

  bot.command("sponsor_proof", async (ctx) => {
    const tgUser = ctx.from;
    if (!tgUser) {
      return;
    }

    const sponsor = await userService.requireSponsorByTelegramId(BigInt(tgUser.id));
    if (!sponsor) {
      await ctx.reply(ruTexts.sponsorAccessDenied);
      return;
    }

    const text = getMessageText(ctx);
    if (!text) {
      await ctx.reply(ruTexts.genericCommandError);
      return;
    }

    const [, paymentId, ...noteParts] = text.split(/\s+/);
    if (!paymentId) {
      await ctx.reply(ruTexts.genericCommandError);
      return;
    }

    const note = noteParts.join(" ");
    await campaignService.uploadPaymentProof({
      paymentId,
      proofUrl: note.startsWith("http") ? note : undefined,
      proofNote: note
    });

    await ctx.reply(ruTexts.proofUploaded);
  });

  bot.command("sponsor_stats", async (ctx) => {
    const tgUser = ctx.from;
    if (!tgUser) {
      return;
    }

    const sponsor = await userService.requireSponsorByTelegramId(BigInt(tgUser.id));
    if (!sponsor) {
      await ctx.reply(ruTexts.sponsorAccessDenied);
      return;
    }

    const stats = await statsService.sponsorStats(sponsor.id);
    await ctx.reply(ruTexts.sponsorStats(stats));
  });

  bot.command("sponsor_withdraw", async (ctx) => {
    const tgUser = ctx.from;
    if (!tgUser) {
      return;
    }

    const sponsor = await userService.requireSponsorByTelegramId(BigInt(tgUser.id));
    if (!sponsor) {
      await ctx.reply(ruTexts.sponsorAccessDenied);
      return;
    }

    const text = getMessageText(ctx);
    if (!text) {
      await ctx.reply(ruTexts.genericCommandError);
      return;
    }

    const amountRaw = text.split(/\s+/)[1];
    const amount = Number(amountRaw);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      await ctx.reply(ruTexts.genericCommandError);
      return;
    }

    const request = await withdrawService.createSponsorWithdrawRequest({
      sponsorId: sponsor.id,
      amount
    });

    await ctx.reply(ruTexts.withdrawCreated(request.id));
  });

  return bot;
};
