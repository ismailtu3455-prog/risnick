import { prisma } from "../infra/prisma.js";

export const auditService = {
  async log(params: {
    actorUserId?: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId?: string;
    payload?: unknown;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        payload: params.payload as object | undefined
      }
    });
  }
};
