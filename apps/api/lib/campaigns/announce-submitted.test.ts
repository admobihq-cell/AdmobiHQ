import { describe, expect, it, vi } from "vitest"

const { publishLive } = vi.hoisted(() => ({ publishLive: vi.fn(async () => undefined) }))
vi.mock("@/lib/realtime", () => ({ publishLive, liveChannel: { ops: "ops" } }))
vi.mock("@/lib/audit", () => ({ auditFromCustomerUser: vi.fn(async () => undefined) }))
vi.mock("@/lib/customer/customer-clerk", () => ({
  getCustomerEmail: vi.fn(async () => null),
  getCustomerName: vi.fn(async () => null),
}))
vi.mock("@/lib/advertiser/advertiser-notify", () => ({
  fanOutCustomerCampaignNotice: vi.fn(async () => {
    throw new Error("push provider down")
  }),
}))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: vi.fn(), sendAdminEmail: vi.fn() }))
vi.mock("@/lib/push/ops-alerts", () => ({ notifyOpsStaffAlert: vi.fn() }))

import { announceCampaignSubmitted, type SubmittedCampaign } from "./submit-campaign"

describe("announceCampaignSubmitted", () => {
  it("tells the ops review queue even when the advertiser notices fail", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    await announceCampaignSubmitted({ id: 77, name: "Launch", org_id: 5 } as SubmittedCampaign, { userId: "u1" })
    expect(publishLive).toHaveBeenCalledWith(["ops"], { topic: "review-queue", id: 77, actor: "u1" })
  })
})
