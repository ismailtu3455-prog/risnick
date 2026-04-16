import { Markup } from "telegraf";
export declare const offerMainKeyboard: (token: string) => Markup.Markup<import("@telegraf/types").InlineKeyboardMarkup>;
export declare const sponsorKeyboard: (token: string, sponsors: Array<{
    channelId: string;
    title: string | null;
}>) => Markup.Markup<import("@telegraf/types").InlineKeyboardMarkup>;
