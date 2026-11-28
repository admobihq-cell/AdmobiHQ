import { describe, expect, it, vi } from "vitest"

const { publishLive } = vi.hoisted(() => ({ publishLive: vi.fn(async () => undefined) }))
vi.mock("@/lib/realtime", () => ({ publishLive, liveChannel: { ops: "ops" } }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: {
      findUnique: vi.fn(async () => ({ id: 9, status: "submitted" })),
      update: vi.fn(async () => ({ id: 9, name: "Launch", org_id: null, status: "approved" })),
    },
  },
}))
vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn(async () => undefined) }))
vi.mock("@/lib/advertiser/advertiser-org-name", () => ({ getOrgNameForOrgId: vi.fn(async () => null) }))
vi.mock("@/lib/advertiser/advertiser-notify", () => ({
  fanOutCustomerCampaignNotice: vi.fn(async () => {
    throw new Error("push provider down")
  }),
}))
vi.mock("@/lib/campaigns/campaign-dto", () => ({ toCampaignDto: vi.fn(() => ({})) }))
vi.mock("@/lib/campaigns/campaign-store", () => ({ CREATIVES_INCLUDE: {} }))
vi.mock("@/lib/customer/customer-clerk", () => ({ getCustomerEmail: vi.fn(), getCustomerName: vi.fn() }))
vi.mock("@/lib/email/render-template", () => ({ renderTemplate: vi.fn() }))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: vi.fn() }))
vi.mock("@/lib/payments/funding", () => ({ unspentBudgetKes: vi.fn() }))
vi.mock("@/lib/payments/money-notify", () => ({ notifyCreditReleased: vi.fn() }))

import { reviewCampaign, type OpsAccess } from "./review-campaign"

describe("reviewCampaign", () => {
  it("tells other ops screens about the decision even when advertiser notices fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    await reviewCampaign({ userId: "ops1", email: "a@b.co" } as OpsAccess, 9, { decision: "approved" })
    expect(publishLive).toHaveBeenCalledWith(["ops"], { topic: "campaign", id: 9, actor: "ops1" })
  })
})
