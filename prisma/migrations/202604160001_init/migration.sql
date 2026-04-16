CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "CampaignStatus" AS ENUM ('PENDING_PAYMENT', 'WAITING_APPROVAL', 'ACTIVE', 'PAUSED', 'ENDED', 'REJECTED');
CREATE TYPE "SponsorStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED');
CREATE TYPE "PaymentMethod" AS ENUM ('CRYPTOBOT', 'YOOMONEY_MANUAL', 'YOOKASSA');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_PROOF', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FAILED');
CREATE TYPE "ProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE "RequesterType" AS ENUM ('ADMIN', 'SPONSOR');
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "UserSponsorStatus" AS ENUM ('SHOWN', 'SUBSCRIBED', 'FAILED');

CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "languageCode" TEXT DEFAULT 'ru',
    "isBlocked" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Admin" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
    "rewardPerLeadRub" NUMERIC(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sponsor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "status" "SponsorStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Offer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "adminId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfferFile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offerId" UUID NOT NULL,
    "fileType" TEXT NOT NULL,
    "telegramFileId" TEXT,
    "fileUrl" TEXT,
    "caption" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfferFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrafficPackage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "userCount" INTEGER NOT NULL,
    "priceRub" NUMERIC(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrafficPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sponsorId" UUID NOT NULL,
    "trafficPackageId" UUID NOT NULL,
    "title" TEXT,
    "telegramChannelId" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "totalQuota" INTEGER NOT NULL,
    "remainingQuota" INTEGER NOT NULL,
    "priceGross" NUMERIC(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignImpression" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "isRepeat" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignImpression_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserOfferHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "firstSuccessAt" TIMESTAMP(3),
    "lastAccessAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "isUniquePaidLead" BOOLEAN NOT NULL DEFAULT FALSE,
    "adminRewardIssued" BOOLEAN NOT NULL DEFAULT FALSE,
    "platformShareIssued" BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT "UserOfferHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSponsorHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "status" "UserSponsorStatus" NOT NULL DEFAULT 'SHOWN',
    "shownCount" INTEGER NOT NULL DEFAULT 1,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastShownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscribedAt" TIMESTAMP(3),
    CONSTRAINT "UserSponsorHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubscriptionCheck" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "success" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sponsorId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING_PROOF',
    "grossAmount" NUMERIC(12,2) NOT NULL,
    "paymentFeeAmount" NUMERIC(12,2) NOT NULL,
    "netAmount" NUMERIC(12,2) NOT NULL,
    "platformCommission" NUMERIC(12,2) NOT NULL,
    "adminRewardTotal" NUMERIC(12,2) NOT NULL,
    "externalPaymentId" TEXT,
    "metadata" JSONB,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentProof" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paymentId" UUID NOT NULL,
    "proofUrl" TEXT,
    "proofNote" TEXT,
    "status" "ProofStatus" NOT NULL DEFAULT 'PENDING',
    "moderatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminBalance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "adminId" UUID NOT NULL,
    "availableAmount" NUMERIC(12,2) NOT NULL,
    "pendingAmount" NUMERIC(12,2) NOT NULL,
    "lifetimeEarned" NUMERIC(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformBalance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "availableAmount" NUMERIC(12,2) NOT NULL,
    "pendingAmount" NUMERIC(12,2) NOT NULL,
    "lifetimeGross" NUMERIC(12,2) NOT NULL,
    "lifetimeCommission" NUMERIC(12,2) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformBalance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WithdrawRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requesterType" "RequesterType" NOT NULL,
    "adminId" UUID,
    "sponsorId" UUID,
    "amount" NUMERIC(12,2) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "details" JSONB,
    "processedByUserId" UUID,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WithdrawRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClickLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "offerId" UUID,
    "userId" UUID,
    "ipHash" TEXT NOT NULL,
    "userAgentHash" TEXT NOT NULL,
    "rawUserAgent" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT FALSE,
    "blockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClickLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorUserId" UUID,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FraudFlag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "offerId" UUID,
    "clickLogId" UUID,
    "reason" TEXT NOT NULL,
    "severity" "FraudSeverity" NOT NULL DEFAULT 'MEDIUM',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FraudFlag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentMethodConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "method" "PaymentMethod" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "feePercent" NUMERIC(7,4) NOT NULL,
    "fixedFeeRub" NUMERIC(12,2) NOT NULL,
    "meta" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentMethodConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");
CREATE UNIQUE INDEX "Sponsor_userId_key" ON "Sponsor"("userId");
CREATE UNIQUE INDEX "Offer_token_key" ON "Offer"("token");
CREATE UNIQUE INDEX "TrafficPackage_code_key" ON "TrafficPackage"("code");
CREATE UNIQUE INDEX "TrafficPackage_userCount_key" ON "TrafficPackage"("userCount");
CREATE UNIQUE INDEX "UserOfferHistory_userId_offerId_key" ON "UserOfferHistory"("userId", "offerId");
CREATE UNIQUE INDEX "UserSponsorHistory_userId_offerId_campaignId_key" ON "UserSponsorHistory"("userId", "offerId", "campaignId");
CREATE UNIQUE INDEX "Payment_campaignId_key" ON "Payment"("campaignId");
CREATE UNIQUE INDEX "AdminBalance_adminId_key" ON "AdminBalance"("adminId");
CREATE UNIQUE INDEX "PaymentMethodConfig_method_key" ON "PaymentMethodConfig"("method");

CREATE INDEX "Admin_isSuperAdmin_idx" ON "Admin"("isSuperAdmin");
CREATE INDEX "Sponsor_status_idx" ON "Sponsor"("status");
CREATE INDEX "Offer_adminId_createdAt_idx" ON "Offer"("adminId", "createdAt");
CREATE INDEX "Offer_isActive_idx" ON "Offer"("isActive");
CREATE INDEX "OfferFile_offerId_isActive_idx" ON "OfferFile"("offerId", "isActive");
CREATE INDEX "Campaign_sponsorId_createdAt_idx" ON "Campaign"("sponsorId", "createdAt");
CREATE INDEX "Campaign_status_remainingQuota_idx" ON "Campaign"("status", "remainingQuota");
CREATE INDEX "CampaignImpression_campaignId_createdAt_idx" ON "CampaignImpression"("campaignId", "createdAt");
CREATE INDEX "CampaignImpression_offerId_userId_idx" ON "CampaignImpression"("offerId", "userId");
CREATE INDEX "UserOfferHistory_offerId_isUniquePaidLead_idx" ON "UserOfferHistory"("offerId", "isUniquePaidLead");
CREATE INDEX "UserSponsorHistory_offerId_userId_idx" ON "UserSponsorHistory"("offerId", "userId");
CREATE INDEX "SubscriptionCheck_offerId_createdAt_idx" ON "SubscriptionCheck"("offerId", "createdAt");
CREATE INDEX "SubscriptionCheck_userId_offerId_idx" ON "SubscriptionCheck"("userId", "offerId");
CREATE INDEX "Payment_sponsorId_createdAt_idx" ON "Payment"("sponsorId", "createdAt");
CREATE INDEX "Payment_status_paymentMethod_idx" ON "Payment"("status", "paymentMethod");
CREATE INDEX "PaymentProof_paymentId_status_idx" ON "PaymentProof"("paymentId", "status");
CREATE INDEX "WithdrawRequest_requesterType_status_idx" ON "WithdrawRequest"("requesterType", "status");
CREATE INDEX "WithdrawRequest_adminId_idx" ON "WithdrawRequest"("adminId");
CREATE INDEX "WithdrawRequest_sponsorId_idx" ON "WithdrawRequest"("sponsorId");
CREATE INDEX "ClickLog_token_createdAt_idx" ON "ClickLog"("token", "createdAt");
CREATE INDEX "ClickLog_ipHash_createdAt_idx" ON "ClickLog"("ipHash", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "FraudFlag_severity_createdAt_idx" ON "FraudFlag"("severity", "createdAt");

ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OfferFile" ADD CONSTRAINT "OfferFile_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_trafficPackageId_fkey" FOREIGN KEY ("trafficPackageId") REFERENCES "TrafficPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignImpression" ADD CONSTRAINT "CampaignImpression_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignImpression" ADD CONSTRAINT "CampaignImpression_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CampaignImpression" ADD CONSTRAINT "CampaignImpression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserOfferHistory" ADD CONSTRAINT "UserOfferHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserOfferHistory" ADD CONSTRAINT "UserOfferHistory_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSponsorHistory" ADD CONSTRAINT "UserSponsorHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSponsorHistory" ADD CONSTRAINT "UserSponsorHistory_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserSponsorHistory" ADD CONSTRAINT "UserSponsorHistory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionCheck" ADD CONSTRAINT "SubscriptionCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SubscriptionCheck" ADD CONSTRAINT "SubscriptionCheck_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminBalance" ADD CONSTRAINT "AdminBalance_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WithdrawRequest" ADD CONSTRAINT "WithdrawRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WithdrawRequest" ADD CONSTRAINT "WithdrawRequest_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClickLog" ADD CONSTRAINT "ClickLog_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClickLog" ADD CONSTRAINT "ClickLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_clickLogId_fkey" FOREIGN KEY ("clickLogId") REFERENCES "ClickLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
