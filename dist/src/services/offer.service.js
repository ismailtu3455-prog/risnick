"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.offerService = void 0;
const client_1 = require("@prisma/client");
const prisma_js_1 = require("../infra/prisma.js");
const env_js_1 = require("../config/env.js");
const token_js_1 = require("../utils/token.js");
exports.offerService = {
    async createOffer(params) {
        const token = (0, token_js_1.generateOfferToken)();
        return prisma_js_1.prisma.offer.create({
            data: {
                token,
                adminId: params.adminId,
                title: params.title,
                description: params.description,
                files: {
                    create: {
                        fileType: params.fileType,
                        telegramFileId: params.telegramFileId,
                        fileUrl: params.fileUrl,
                        caption: params.caption
                    }
                }
            },
            include: {
                files: true
            }
        });
    },
    async getOfferByToken(token) {
        return prisma_js_1.prisma.offer.findFirst({
            where: {
                token,
                isActive: true
            },
            include: {
                admin: true,
                files: {
                    where: { isActive: true },
                    orderBy: { createdAt: "desc" },
                    take: 1
                }
            }
        });
    },
    buildFinalLink(token) {
        const base = env_js_1.env.DOMAIN_BASE.replace(/\/$/, "");
        return `${base}/go/${token}`;
    },
    async getOfferStats(offerId) {
        const [clicks, uniquePaid, successfulChecks] = await Promise.all([
            prisma_js_1.prisma.clickLog.count({ where: { offerId } }),
            prisma_js_1.prisma.userOfferHistory.count({ where: { offerId, isUniquePaidLead: true } }),
            prisma_js_1.prisma.subscriptionCheck.count({ where: { offerId, success: true } })
        ]);
        return {
            clicks,
            uniquePaid,
            successfulChecks
        };
    },
    async ensureAdminExists(adminId) {
        const admin = await prisma_js_1.prisma.admin.findUnique({ where: { id: adminId } });
        if (!admin) {
            throw new Error("ADMIN_NOT_FOUND");
        }
        return admin;
    },
    decimalFromNumber(value) {
        return new client_1.Prisma.Decimal(value);
    }
};
