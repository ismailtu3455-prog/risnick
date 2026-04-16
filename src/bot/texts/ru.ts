export const ruTexts = {
  startFallback:
    "Привет. Перейдите по рекламной ссылке, чтобы открыть оффер и получить доступ к файлу.",
  offerNotFound: "Оффер не найден или отключён.",
  offerIntro: (title: string, description?: string | null) =>
    [`Доступ к файлу: ${title}`, description ?? "", "Нажмите кнопку ниже, чтобы увидеть спонсоров."].filter(Boolean).join("\n\n"),
  offerAlreadyCompleted:
    "Вы уже проходили этот оффер ранее. Повторный вход не считается как новый оплачиваемый лид.",
  showSponsorsTitle: "Список спонсоров. Подпишитесь и нажмите «Проверить».",
  noSponsors: "Сейчас нет активных спонсоров для этого оффера. Попробуйте позже.",
  checkSuccess: "Условия выполнены. Доступ к файлу открыт.",
  checkPartial: (missing: number) => `Не выполнены условия по ${missing} спонсору(ам).`,
  checkUnavailable:
    "Сейчас не удалось проверить подписки (ограничение Telegram API или недоступный канал). Повторите позже.",
  checkNoSponsors:
    "Сначала откройте список спонсоров, затем подпишитесь и запустите проверку.",
  adminAccessDenied: "У вас нет прав админа.",
  adminMenu:
    "Админ-панель:\n/admin_create <title>|<description>|<file_url>\n/admin_stats\n/admin_withdraw <amount>",
  adminOfferCreated: (link: string, token: string) =>
    `Оффер создан.\nToken: ${token}\nСсылка: ${link}`,
  adminStats: (stats: {
    offers: number;
    clicks: number;
    uniquePaidLeads: number;
    successfulOpens: number;
    balance: { available: unknown; pending: unknown; lifetime: unknown };
  }) =>
    [
      `Офферы: ${stats.offers}`,
      `Переходы: ${stats.clicks}`,
      `Уникальные лиды: ${stats.uniquePaidLeads}`,
      `Успешные открытия: ${stats.successfulOpens}`,
      `Баланс: ${stats.balance.available} ₽ (pending: ${stats.balance.pending}, lifetime: ${stats.balance.lifetime})`
    ].join("\n"),
  sponsorMenu:
    "Панель спонсора:\n/sponsor_create <@channel> <package_id> <CRYPTOBOT|YOOMONEY_MANUAL>\n/sponsor_packages\n/sponsor_proof <payment_id> <url_or_note>\n/sponsor_stats\n/sponsor_withdraw <amount>",
  sponsorCampaignCreated: (campaignId: string, paymentId: string, gross: string) =>
    `Кампания создана.\nCampaign ID: ${campaignId}\nPayment ID: ${paymentId}\nК оплате: ${gross} ₽\nПосле оплаты отправьте /sponsor_proof`,
  sponsorAccessDenied: "У вас нет профиля спонсора.",
  genericCommandError: "Не удалось выполнить команду. Проверьте формат и попробуйте снова.",
  withdrawCreated: (id: string) => `Заявка на вывод создана: ${id}`,
  sponsorPackagesTitle: "Доступные пакеты трафика:\n",
  proofUploaded: "Скрин оплаты отправлен на модерацию.",
  sponsorStats: (stats: {
    campaigns: number;
    activeCampaigns: number;
    impressions: number;
    paymentsPendingApproval: number;
  }) =>
    [
      `Кампаний: ${stats.campaigns}`,
      `Активных: ${stats.activeCampaigns}`,
      `Показов: ${stats.impressions}`,
      `Оплат на модерации: ${stats.paymentsPendingApproval}`
    ].join("\n")
};
