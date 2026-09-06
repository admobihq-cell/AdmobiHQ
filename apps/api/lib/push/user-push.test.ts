import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * notifyUserPush is fire-and-forget from a route's trailing notification
 * block, so every failure here is silent by design. That makes it exactly the
 * code that needs a test: nothing downstream will ever complain.
 */

const findMany = vi.fn()
const deleteMany = vi.fn()
const driverFindMany = vi.fn()
const driverDeleteMany = vi.fn()
const sendExpoPushMessages = vi.fn()
const recordPushTickets = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customerPushToken: {
      findMany: (...args: unknown[]) => findMany(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
    driverPushToken: {
      findMany: (...args: unknown[]) => driverFindMany(...args),
      deleteMany: (...args: unknown[]) => driverDeleteMany(...args),
    },
  },
}))

vi.mock("@/lib/push/expo-push", () => ({
  sendExpoPushMessages: (...args: unknown[]) => sendExpoPushMessages(...args),
}))

vi.mock("@/lib/push/receipts", () => ({
  recordPushTickets: (...args: unknown[]) => recordPushTickets(...args),
}))

async function subject() {
  const { notifyUserPush } = await import("./user-push")
  return notifyUserPush
}

beforeEach(() => {
  vi.clearAllMocks()
  sendExpoPushMessages.mockResolvedValue({ outcomes: [], invalidTokens: [] })
  recordPushTickets.mockResolvedValue(undefined)
})

describe("notifyUserPush", () => {
  it("sends one message per registered device", async () => {
    findMany.mockResolvedValue([
      { expo_push_token: "ExponentPushToken[a]" },
      { expo_push_token: "ExponentPushToken[b]" },
    ])

    await (await subject())("customer", "user_1", { title: "Approved", body: "Nice" })

    expect(sendExpoPushMessages).toHaveBeenCalledTimes(1)
    const messages = sendExpoPushMessages.mock.calls[0]![0] as { to: string }[]
    expect(messages.map((m) => m.to)).toEqual([
      "ExponentPushToken[a]",
      "ExponentPushToken[b]",
    ])
  })

  it("scopes the token lookup to the one user", async () => {
    findMany.mockResolvedValue([{ expo_push_token: "ExponentPushToken[a]" }])
    await (await subject())("customer", "user_1", { title: "t", body: "b" })
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clerk_user_id: "user_1" } }),
    )
  })

  // A web-only advertiser has no device. This is the common case, not an
  // error — it must not reach Expo or log noise.
  it("is a silent no-op when the user has no registered device", async () => {
    findMany.mockResolvedValue([])
    await (await subject())("customer", "user_1", { title: "t", body: "b" })
    expect(sendExpoPushMessages).not.toHaveBeenCalled()
    expect(recordPushTickets).not.toHaveBeenCalled()
  })

  it("carries href in data so the app can deep-link on tap", async () => {
    findMany.mockResolvedValue([{ expo_push_token: "ExponentPushToken[a]" }])
    await (await subject())("customer", "user_1", {
      title: "t",
      body: "b",
      href: "/campaigns/42",
    })
    const messages = sendExpoPushMessages.mock.calls[0]![0] as { data: Record<string, string> }[]
    expect(messages[0]!.data).toEqual({ href: "/campaigns/42" })
  })

  it("omits href from data when there is none", async () => {
    findMany.mockResolvedValue([{ expo_push_token: "ExponentPushToken[a]" }])
    await (await subject())("customer", "user_1", { title: "t", body: "b" })
    const messages = sendExpoPushMessages.mock.calls[0]![0] as { data: Record<string, string> }[]
    expect(messages[0]!.data).toEqual({})
  })

  it("records tickets under the calling audience", async () => {
    findMany.mockResolvedValue([{ expo_push_token: "ExponentPushToken[a]" }])
    sendExpoPushMessages.mockResolvedValue({
      outcomes: [{ status: "queued", token: "ExponentPushToken[a]", ticketId: "t1" }],
      invalidTokens: [],
    })
    await (await subject())("customer", "user_1", { title: "t", body: "b" })
    expect(recordPushTickets).toHaveBeenCalledWith(
      expect.objectContaining({ audience: "customer" }),
    )
  })

  it("prunes dead tokens from the matching table only", async () => {
    findMany.mockResolvedValue([{ expo_push_token: "ExponentPushToken[dead]" }])
    sendExpoPushMessages.mockResolvedValue({
      outcomes: [],
      invalidTokens: ["ExponentPushToken[dead]"],
    })
    await (await subject())("customer", "user_1", { title: "t", body: "b" })
    expect(deleteMany).toHaveBeenCalledWith({
      where: { expo_push_token: { in: ["ExponentPushToken[dead]"] } },
    })
    expect(driverDeleteMany).not.toHaveBeenCalled()
  })

  it("reads and prunes the driver table for the driver audience", async () => {
    driverFindMany.mockResolvedValue([{ expo_push_token: "ExponentPushToken[d]" }])
    sendExpoPushMessages.mockResolvedValue({
      outcomes: [],
      invalidTokens: ["ExponentPushToken[d]"],
    })
    await (await subject())("driver", "driver_1", { title: "t", body: "b" })
    expect(driverFindMany).toHaveBeenCalled()
    expect(findMany).not.toHaveBeenCalled()
    expect(driverDeleteMany).toHaveBeenCalled()
    expect(recordPushTickets).toHaveBeenCalledWith(
      expect.objectContaining({ audience: "driver" }),
    )
  })

  // The caller has already committed its DB write by the time this runs, so a
  // throw here would turn a successful campaign submission into a 500.
  it("swallows a token-lookup failure instead of throwing", async () => {
    findMany.mockRejectedValue(new Error("db down"))
    await expect(
      (await subject())("customer", "user_1", { title: "t", body: "b" }),
    ).resolves.toBeUndefined()
  })

  it("swallows an Expo failure instead of throwing", async () => {
    findMany.mockResolvedValue([{ expo_push_token: "ExponentPushToken[a]" }])
    sendExpoPushMessages.mockRejectedValue(new Error("expo down"))
    await expect(
      (await subject())("customer", "user_1", { title: "t", body: "b" }),
    ).resolves.toBeUndefined()
  })
})
