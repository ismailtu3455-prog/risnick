"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = void 0;
const prisma_js_1 = require("../infra/prisma.js");
exports.auditService = {
    async log(params) {
        await prisma_js_1.prisma.auditLog.create({
            data: {
                actorUserId: params.actorUserId,
                actorRole: params.actorRole,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                payload: params.payload
            }
        });
    }
};
