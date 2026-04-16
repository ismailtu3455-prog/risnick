type TelegramMember = {
    status: string;
};
export interface TelegramMembershipClient {
    getChatMember(chatId: string, userId: number): Promise<TelegramMember>;
}
export type SubscriptionCheckResult = {
    success: boolean;
    status: "SUCCESS" | "PARTIAL" | "CHECK_UNAVAILABLE" | "NO_SPONSORS" | "OFFER_NOT_FOUND";
    missingCount: number;
    missingCampaigns: string[];
    file?: {
        fileType: string;
        fileUrl?: string | null;
        telegramFileId?: string | null;
        caption?: string | null;
    };
};
export declare const subscriptionService: {
    checkAndProcess(params: {
        token: string;
        telegramId: bigint;
        telegramClient: TelegramMembershipClient;
    }): Promise<SubscriptionCheckResult>;
};
export {};
