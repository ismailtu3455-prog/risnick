export declare const redirectService: {
    processClick(params: {
        token: string;
        ip: string;
        userAgent: string;
    }): Promise<{
        offer: {
            id: string;
            createdAt: Date;
            isActive: boolean;
            updatedAt: Date;
            title: string;
            adminId: string;
            token: string;
            description: string | null;
        } | null;
        antiFraud: import("./anti-fraud.service.js").AntiFraudResult;
        click: {
            id: string;
            createdAt: Date;
            userId: string | null;
            offerId: string | null;
            token: string;
            ipHash: string;
            userAgentHash: string;
            rawUserAgent: string | null;
            isBlocked: boolean;
            blockReason: string | null;
        };
    }>;
};
