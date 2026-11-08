import { beforeEach, describe, expect, it, vi } from "vitest"

const findMany = vi.fn()
const sendExpoPushMessages = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: { opsPushToken: { findMany: (...a: unknown[]) => findMany(...a), deleteMany: vi.fn() } },
}))
vi.mock("@/lib/push/expo-push", () => ({
  sendExpoPushMessages: (...a: unknown[]) => sendExpoPushMessages(...a),
}))
vi.mock("@/lib/push/receipts", () => ({ recordPushTickets: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, "log").mockImplementation(() => {})
  findMany.mockResolvedValue([{ id: 1, expo_push_token: "ExponentPushToken[x]" }])
  sendExpoPushMessages.mockResolvedValue({ outcomes: [], invalidTokens: [] })
})

const hrefOfFirstMessage = () => sendExpoPushMessages.mock.calls[0]![0][0].data.href

describe("notifyOpsStaffAlert href", () => {
  it("uses an href override verbatim", async () => {
    const { notifyOpsStaffAlert } = await import("./ops-alerts")
    await notifyOpsStaffAlert({ type: "finance", entityId: 0, submitterName: "Finance", href: "/(ops)/finances" })
    expect(hrefOfFirstMessage()).toBe("/(ops)/finances")
  })

  it("keeps the segment/id path without an override", async () => {
    const { notifyOpsStaffAlert } = await import("./ops-alerts")
    await notifyOpsStaffAlert({ type: "support", entityId: 12, submitterName: "Jane" })
    expect(hrefOfFirstMessage()).toBe("/(ops)/support/12")
  })
})
