import { Markup } from "telegraf";
import { channelLink } from "../utils/links.js";

export const offerMainKeyboard = (token: string) =>
  Markup.inlineKeyboard([[Markup.button.callback("Показать спонсоров", `show_sponsors:${token}`)]]);

export const sponsorKeyboard = (
  token: string,
  sponsors: Array<{ channelId: string; title: string | null }>
) => {
  const sponsorRows = sponsors.map((item) => [
    Markup.button.url(item.title ?? item.channelId, channelLink(item.channelId))
  ]);
  const checkRow = [Markup.button.callback("Проверить", `check_offer:${token}`)];
  return Markup.inlineKeyboard([...sponsorRows, checkRow] as any);
};
