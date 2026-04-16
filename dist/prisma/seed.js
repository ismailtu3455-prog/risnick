"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const prisma = new client_1.PrismaClient();
const packages = [
    { users: 500, price: 600 },
    { users: 1000, price: 1250 },
    { users: 1500, price: 1875 },
    { users: 2000, price: 2500 },
    { users: 3000, price: 3750 },
    { users: 4000, price: 5000 },
    { users: 5000, price: 6250 },
    { users: 7000, price: 8750 },
    { users: 10000, price: 12500 }
];
const superAdminTelegramId = BigInt(process.env.TELEGRAM_SUPER_ADMIN_ID ?? "5649053560");
const adminRewardRub = Number(process.env.ADMIN_REWARD_RUB ?? "1");
const yoomoneyQuickpayTemplate = process.env.YOOMONEY_QUICKPAY_TEMPLATE ?? "";
async function main() {
    const superUser = await prisma.user.upsert({
        where: { telegramId: superAdminTelegramId },
        update: { username: "gatebox_super_admin", firstName: "Super", lastName: "Admin" },
        create: {
            telegramId: superAdminTelegramId,
            username: "gatebox_super_admin",
            firstName: "Super",
            lastName: "Admin",
            languageCode: "ru"
        }
    });
    const testAdminUser = await prisma.user.upsert({
        where: { telegramId: BigInt("1111111111") },
        update: { username: "test_admin" },
        create: {
            telegramId: BigInt("1111111111"),
            username: "test_admin",
            firstName: "Test",
            lastName: "Admin",
            languageCode: "ru"
        }
    });
    const testSponsorUser = await prisma.user.upsert({
        where: { telegramId: BigInt("2222222222") },
        update: { username: "test_sponsor" },
        create: {
            telegramId: BigInt("2222222222"),
            username: "test_sponsor",
            firstName: "Test",
            lastName: "Sponsor",
            languageCode: "ru"
        }
    });
    const superAdmin = await prisma.admin.upsert({
        where: { userId: superUser.id },
        update: { isSuperAdmin: true, rewardPerLeadRub: adminRewardRub },
        create: {
            userId: superUser.id,
            isSuperAdmin: true,
            rewardPerLeadRub: adminRewardRub
        }
    });
    const testAdmin = await prisma.admin.upsert({
        where: { userId: testAdminUser.id },
        update: { isSuperAdmin: false, rewardPerLeadRub: adminRewardRub },
        create: {
            userId: testAdminUser.id,
            isSuperAdmin: false,
            rewardPerLeadRub: adminRewardRub
        }
    });
    await prisma.adminBalance.upsert({
        where: { adminId: superAdmin.id },
        update: {},
        create: {
            adminId: superAdmin.id,
            availableAmount: 0,
            pendingAmount: 0,
            lifetimeEarned: 0
        }
    });
    await prisma.adminBalance.upsert({
        where: { adminId: testAdmin.id },
        update: {},
        create: {
            adminId: testAdmin.id,
            availableAmount: 0,
            pendingAmount: 0,
            lifetimeEarned: 0
        }
    });
    await prisma.sponsor.upsert({
        where: { userId: testSponsorUser.id },
        update: { status: "ACTIVE" },
        create: {
            userId: testSponsorUser.id,
            status: "ACTIVE"
        }
    });
    for (const pkg of packages) {
        await prisma.trafficPackage.upsert({
            where: { userCount: pkg.users },
            update: {
                code: `PKG_${pkg.users}`,
                priceRub: pkg.price,
                isActive: true,
                sortOrder: pkg.users
            },
            create: {
                code: `PKG_${pkg.users}`,
                userCount: pkg.users,
                priceRub: pkg.price,
                isActive: true,
                sortOrder: pkg.users
            }
        });
    }
    await prisma.paymentMethodConfig.upsert({
        where: { method: client_1.PaymentMethod.CRYPTOBOT },
        update: {
            isActive: true,
            feePercent: 2.5,
            fixedFeeRub: 0,
            meta: {
                mode: "manual_or_api",
                apiEnabled: false
            }
        },
        create: {
            method: client_1.PaymentMethod.CRYPTOBOT,
            isActive: true,
            feePercent: 2.5,
            fixedFeeRub: 0,
            meta: {
                mode: "manual_or_api",
                apiEnabled: false
            }
        }
    });
    await prisma.paymentMethodConfig.upsert({
        where: { method: client_1.PaymentMethod.YOOMONEY_MANUAL },
        update: {
            isActive: true,
            feePercent: 3.5,
            fixedFeeRub: 0,
            meta: {
                mode: "manual",
                quickpayTemplate: yoomoneyQuickpayTemplate,
                yookassaEnabled: false
            }
        },
        create: {
            method: client_1.PaymentMethod.YOOMONEY_MANUAL,
            isActive: true,
            feePercent: 3.5,
            fixedFeeRub: 0,
            meta: {
                mode: "manual",
                quickpayTemplate: yoomoneyQuickpayTemplate,
                yookassaEnabled: false
            }
        }
    });
    await prisma.paymentMethodConfig.upsert({
        where: { method: client_1.PaymentMethod.YOOKASSA },
        update: {
            isActive: false,
            feePercent: 3,
            fixedFeeRub: 0,
            meta: {
                mode: "api",
                enabledByEnv: false
            }
        },
        create: {
            method: client_1.PaymentMethod.YOOKASSA,
            isActive: false,
            feePercent: 3,
            fixedFeeRub: 0,
            meta: {
                mode: "api",
                enabledByEnv: false
            }
        }
    });
    const existingPlatform = await prisma.platformBalance.findFirst();
    if (!existingPlatform) {
        await prisma.platformBalance.create({
            data: {
                availableAmount: 0,
                pendingAmount: 0,
                lifetimeGross: 0,
                lifetimeCommission: 0
            }
        });
    }
    console.log("Seed complete");
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
