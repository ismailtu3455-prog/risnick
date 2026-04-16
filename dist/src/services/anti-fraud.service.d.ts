export type AntiFraudResult = {
    blocked: boolean;
    reason?: string;
};
export declare const antiFraudService: {
    checkClick(params: {
        ipHash: string;
        uaHash: string;
        token: string;
    }): Promise<AntiFraudResult>;
};
