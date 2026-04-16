"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sponsorKeyboard = exports.offerMainKeyboard = void 0;
const telegraf_1 = require("telegraf");
const links_js_1 = require("../utils/links.js");
const offerMainKeyboard = (token) => telegraf_1.Markup.inlineKeyboard([[telegraf_1.Markup.button.callback("Показать спонсоров", `show_sponsors:${token}`)]]);
exports.offerMainKeyboard = offerMainKeyboard;
const sponsorKeyboard = (token, sponsors) => {
    const sponsorRows = sponsors.map((item) => [
        telegraf_1.Markup.button.url(item.title ?? item.channelId, (0, links_js_1.channelLink)(item.channelId))
    ]);
    const checkRow = [telegraf_1.Markup.button.callback("Проверить", `check_offer:${token}`)];
    return telegraf_1.Markup.inlineKeyboard([...sponsorRows, checkRow]);
};
exports.sponsorKeyboard = sponsorKeyboard;
