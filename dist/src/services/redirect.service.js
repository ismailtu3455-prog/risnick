"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redirectService = void 0;
const prisma_js_1 = require("../infra/prisma.js");
const anti_fraud_service_js_1 = require("./anti-fraud.service.js");
const hash_js_1 = require("../utils/hash.js");
exports.redirectService = {
    async processClick(params) {
        const ipHash = (0, hash_js_1.hashString)(params.ip);
        const userAgentHash = (0, hash_js_1.hashString)(params.userAgent || "unknown");
        const antiFraud = await anti_fraud_service_js_1.antiFraudService.checkClick({
            ipHash,
            uaHash: userAgentHash,
            token: params.token
        });
        const offer = await prisma_js_1.prisma.offer.findFirst({
            where: {
                token: params.token,
                isActive: true
            }
        });
        const click = await prisma_js_1.prisma.clickLog.create({
            data: {
                token: params.token,
                offerId: offer?.id,
                ipHash,
                userAgentHash,
                rawUserAgent: params.userAgent,
                isBlocked: antiFraud.blocked,
                blockReason: antiFraud.reason
            }
        });
        if (antiFraud.blocked) {
            await prisma_js_1.prisma.fraudFlag.create({
                data: {
                    offerId: offer?.id,
                    clickLogId: click.id,
                    reason: antiFraud.reason ?? "UNKNOWN",
                    severity: "MEDIUM",
                    metadata: {
                        token: params.token
                    }
                }
            });
        }
        return {
            offer,
            antiFraud,
            click
        };
    }
};
