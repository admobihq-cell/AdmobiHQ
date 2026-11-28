import { describe, expect, it, vi } from "vitest"

const { publishLive } = vi.hoisted(() => ({ publishLive: vi.fn(async () => undefined) }))
vi.mock("@/lib/realtime", () => ({ publishLive, liveChannel: { ops: "ops", user: (id: string) => `user:${id}` } }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    driverProfile: {
      findUnique: vi.fn(async () => ({ id: 4, status: "submitted" })),
      update: vi.fn(async () => ({ id: 4, status: "approved", clerk_user_id: "drv1", documents: [] })),
    },
    driverNotification: { create: vi.fn(async () => ({})) },
  },
}))
vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn(async () => undefined) }))
vi.mock("@/lib/driver/driver-clerk", () => ({ getDriverEmail: vi.fn(async () => null) }))
vi.mock("@/lib/driver/driver-profile-dto", () => ({ toDriverProfileDto: vi.fn(() => ({})) }))
vi.mock("@/lib/email/render-template", () => ({ renderTemplate: vi.fn() }))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: vi.fn() }))

import type { OpsAccess } from "@/lib/campaigns/review-campaign"
import { reviewDriverApplication } from "./review-driver-application"

describe("reviewDriverApplication", () => {
  it("tells other ops screens and the driver about the decision", async () => {
    await reviewDriverApplication({ userId: "ops1", email: "a@b.co" } as OpsAccess, 4, { decision: "approved" })
    expect(publishLive).toHaveBeenCalledWith(["ops"], { topic: "application", id: 4, type: "reviewed", actor: "ops1" })
    expect(publishLive).toHaveBeenCalledWith(["user:drv1"], { topic: "notification", type: "application_approved" })
  })
})
