export declare const auditService: {
    log(params: {
        actorUserId?: string;
        actorRole: string;
        action: string;
        entityType: string;
        entityId?: string;
        payload?: unknown;
    }): Promise<void>;
};
