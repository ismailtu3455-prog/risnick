export const tgbotLink = (botUsername: string, token: string): string =>
  `https://t.me/${botUsername}?start=${encodeURIComponent(token)}`;

export const channelLink = (channelId: string): string => {
  if (channelId.startsWith("@")) {
    return `https://t.me/${channelId.slice(1)}`;
  }

  if (channelId.startsWith("https://t.me/")) {
    return channelId;
  }

  return `https://t.me/${channelId}`;
};
