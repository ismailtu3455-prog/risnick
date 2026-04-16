import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import type { Campaign, UserSponsorHistory } from "@prisma/client";
import { pickCampaignsForUser } from "../src/services/rotation.selector.js";

const campaign = (id: string): Campaign => ({
  id,
  sponsorId: `s-${id}`,
  trafficPackageId: `t-${id}`,
  title: null,
  telegramChannelId: `@channel_${id}`,
  status: "ACTIVE",
  totalQuota: 100,
  remainingQuota: 100,
  priceGross: new Prisma.Decimal(100),
  paymentMethod: "CRYPTOBOT",
  approvedAt: null,
  activatedAt: null,
  endedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
});

const history = (campaignId: string): UserSponsorHistory => ({
  id: `h-${campaignId}`,
  userId: "u1",
  offerId: "o1",
  campaignId,
  status: "SHOWN",
  shownCount: 1,
  shownAt: new Date(),
  lastShownAt: new Date(),
  subscribedAt: null
});

describe("pickCampaignsForUser", () => {
  it("prioritizes unseen campaigns", () => {
    const result = pickCampaignsForUser({
      campaigns: [campaign("c1"), campaign("c2"), campaign("c3")],
      userHistory: [history("c1")],
      maxCount: 2
    });

    expect(result.map((item) => item.id)).toEqual(["c2", "c3"]);
  });

  it("reuses seen campaigns when unseen are not enough", () => {
    const result = pickCampaignsForUser({
      campaigns: [campaign("c1"), campaign("c2")],
      userHistory: [history("c1")],
      maxCount: 2
    });

    expect(result.map((item) => item.id)).toEqual(["c2", "c1"]);
  });
});
