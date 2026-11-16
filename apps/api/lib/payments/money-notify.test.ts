import { beforeEach, describe, expect, it, vi } from "vitest"

const notifyCustomerUsers = vi.fn()
const listOrgMemberIdsWithPermission = vi.fn()
const sendEmail = vi.fn()
const sendAdminEmail = vi.fn()
const notifyOpsStaffAlert = vi.fn()
const notifyUserPush = vi.fn()
const getCustomerEmail = vi.fn()
const getDriverEmail = vi.fn()
const orgFindUnique = vi.fn()
const customerNotificationCreateMany = vi.fn()
const driverNotificationCreate = vi.fn()

vi.mock("@/lib/advertiser/advertiser-notify", () => ({
  notifyCustomerUsers: (...a: unknown[]) => notifyCustomerUsers(...a),
  listOrgMemberIdsWithPermission: (...a: unknown[]) => listOrgMemberIdsWithPermission(...a),
}))
vi.mock("@/lib/email/send-email", () => ({
  sendEmail: (...a: unknown[]) => sendEmail(...a),
  sendAdminEmail: (...a: unknown[]) => sendAdminEmail(...a),
}))
vi.mock("@/lib/email/render-template", () => ({ renderTemplate: async () => "<html />" }))
vi.mock("@/lib/push/ops-alerts", () => ({
  notifyOpsStaffAlert: (...a: unknown[]) => notifyOpsStaffAlert(...a),
}))
vi.mock("@/lib/push/user-push", () => ({ notifyUserPush: (...a: unknown[]) => notifyUserPush(...a) }))
vi.mock("@/lib/customer/customer-clerk", () => ({ getCustomerEmail: (...a: unknown[]) => getCustomerEmail(...a) }))
vi.mock("@/lib/driver/driver-clerk", () => ({ getDriverEmail: (...a: unknown[]) => getDriverEmail(...a) }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    advertiserOrg: { findUnique: (...a: unknown[]) => orgFindUnique(...a) },
    customerNotification: { createMany: (...a: unknown[]) => customerNotificationCreateMany(...a) },
    driverNotification: { create: (...a: unknown[]) => driverNotificationCreate(...a) },
  },
}))

const m = () => import("./money-notify")

beforeEach(() => {
  vi.clearAllMocks()
  listOrgMemberIdsWithPermission.mockResolvedValue(["user_a", "user_b"])
  getCustomerEmail.mockResolvedValue("a@x.co")
  orgFindUnique.mockResolvedValue({ name: "Acme", billing_email: "A@x.co" })
})

describe("notifyPaymentReceived", () => {
  it("campaign payment: one email per distinct address, no inbox row", async () => {
    const { notifyPaymentReceived } = await m()
    await notifyPaymentReceived({
      orgId: 1,
      payerUserId: "user_a",
      amountKes: 50000,
      channel: "mobile_money",
      invoiceNumber: "INV-2026-000001",
      campaign: { id: 7, name: "Launch" },
    })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0]![1]).toBe("Receipt: KES 50,000 for Launch")
    expect(notifyCustomerUsers).not.toHaveBeenCalled()
  })

  it("top-up: one email plus an inbox notice titled Payment received", async () => {
    orgFindUnique.mockResolvedValue({ name: "Acme", billing_email: "billing@x.co" })
    const { notifyPaymentReceived } = await m()
    await notifyPaymentReceived({
      orgId: 1,
      payerUserId: "user_a",
      amountKes: 2000,
      channel: "card",
      invoiceNumber: "INV-2026-000002",
      campaign: null,
    })
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(sendEmail.mock.calls[0]![0]).toEqual(["a@x.co", "billing@x.co"])
    expect(notifyCustomerUsers).toHaveBeenCalledWith(
      ["user_a", "user_b"],
      expect.objectContaining({ type: "payment_received", title: "Payment received", body: "KES 2,000 added to your balance." }),
    )
  })

  it("sends no email when neither address exists", async () => {
    getCustomerEmail.mockResolvedValue(null)
    orgFindUnique.mockResolvedValue({ name: "Acme", billing_email: null })
    const { notifyPaymentReceived } = await m()
    await notifyPaymentReceived({
      orgId: 1, payerUserId: "u", amountKes: 10, channel: null, invoiceNumber: "INV", campaign: null,
    })
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("never rejects when sendEmail throws", async () => {
    sendEmail.mockRejectedValue(new Error("resend down"))
    const err = vi.spyOn(console, "error").mockImplementation(() => {})
    const { notifyPaymentReceived } = await m()
    await expect(
      notifyPaymentReceived({
        orgId: 1, payerUserId: "u", amountKes: 10, channel: null, invoiceNumber: "INV", campaign: null,
      }),
    ).resolves.toBeUndefined()
    expect(sendAdminEmail).toHaveBeenCalledTimes(1)
    err.mockRestore()
  })

  it("alerts ops (push + admin email) for every settled payment", async () => {
    const { notifyPaymentReceived } = await m()
    await notifyPaymentReceived({
      orgId: 1, payerUserId: "u", amountKes: 50000, channel: "mobile_money", invoiceNumber: "INV-9",
      campaign: { id: 7, name: "Launch" },
    })
    expect(notifyOpsStaffAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "finance", title: "Payment received: KES 50,000 from Acme" }),
    )
    expect(sendAdminEmail).toHaveBeenCalledWith("Payment received: KES 50,000 from Acme", "<html />")
  })
})

describe("notifyCreditReleased", () => {
  it("completed reason says finished under budget", async () => {
    const { notifyCreditReleased } = await m()
    await notifyCreditReleased({ orgId: 1, amountKes: 2000, campaign: { id: 7, name: "Launch" }, reason: "completed" })
    const input = notifyCustomerUsers.mock.calls[0]![1]
    expect(input.title).toBe("KES 2,000 back in your balance")
    expect(input.body).toContain("finished under budget")
    expect(input.type).toBe("credit_released")
  })
})

describe("notifyRefundUpdate", () => {
  it("delayed also alerts ops by push and email", async () => {
    const { notifyRefundUpdate } = await m()
    await notifyRefundUpdate({ orgId: 1, amountKes: 500, method: "mpesa", stage: "delayed" })
    expect(customerNotificationCreateMany).toHaveBeenCalled()
    expect(notifyOpsStaffAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "finance", href: "/(ops)/finances", title: "Refund needs attention: Acme" }),
    )
    expect(sendAdminEmail).toHaveBeenCalledTimes(1)
  })

  it("sent emails the payer-side addresses and pushes", async () => {
    const { notifyRefundUpdate } = await m()
    await notifyRefundUpdate({ orgId: 1, amountKes: 500, method: "card", stage: "sent" })
    expect(notifyCustomerUsers).toHaveBeenCalledWith(
      ["user_a", "user_b"],
      expect.objectContaining({
        type: "refund_sent",
        body: "KES 500 is going back to your card. It can take up to 10 business days.",
      }),
    )
    expect(sendEmail).toHaveBeenCalledWith(["A@x.co"], "Refund on its way", "<html />")
  })
})

describe("alertOpsFinance", () => {
  it("pushes a finance alert to the finances screen; email only when asked", async () => {
    const { alertOpsFinance } = await m()
    await alertOpsFinance({ title: "T", body: "B" })
    expect(notifyOpsStaffAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "finance", href: "/(ops)/finances", title: "T", body: "B" }),
    )
    expect(sendAdminEmail).not.toHaveBeenCalled()
    await alertOpsFinance({ title: "T", body: "B", email: true })
    expect(sendAdminEmail).toHaveBeenCalledWith("T", "<html />")
  })
})

describe("driver notices", () => {
  it("payout settled writes an inbox row and a push", async () => {
    const { notifyPayoutUpdate } = await m()
    await notifyPayoutUpdate({ driverClerkUserId: "drv", amountKes: 3000, method: "mpesa", stage: "settled" })
    expect(driverNotificationCreate).toHaveBeenCalledWith({
      data: { clerk_user_id: "drv", type: "payout_settled", title: "Payout sent", body: "KES 3,000 sent to your M-Pesa." },
    })
    expect(notifyUserPush).toHaveBeenCalledWith("driver", "drv", expect.objectContaining({ title: "Payout sent" }))
  })

  it("payout details changed is also emailed", async () => {
    getDriverEmail.mockResolvedValue("d@x.co")
    const { notifyPayoutDetailsChanged } = await m()
    await notifyPayoutDetailsChanged("drv")
    expect(driverNotificationCreate).toHaveBeenCalled()
    expect(sendEmail).toHaveBeenCalledWith("d@x.co", "Your payout details changed", "<html />")
  })
})
