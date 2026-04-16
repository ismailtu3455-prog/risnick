"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.channelLink = exports.tgbotLink = void 0;
const tgbotLink = (botUsername, token) => `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;
exports.tgbotLink = tgbotLink;
const channelLink = (channelId) => {
    if (channelId.startsWith("@")) {
        return `https://t.me/${channelId.slice(1)}`;
    }
    if (channelId.startsWith("https://t.me/")) {
        return channelId;
    }
    return `https://t.me/${channelId}`;
};
exports.channelLink = channelLink;
