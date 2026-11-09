import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

let denied: string[] = []
let driverUserId = ""
vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async (permission: string) =>
      denied.includes(permission) ? { error: actual.jsonError("Forbidden", 403) } : { access: { userId: "ops_1", email: "ops@x" } },
    ),
    requireDriverAccess: vi.fn(async () => ({ access: { userId: driverUserId } })),
  }
})
vi.mock("next/server", async () => ({
  ...(await vi.importActual<typeof import("next/server")>("next/server")),
  after: (fn: () => unknown) => void fn(),
}))
vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn() }))
const paystack = {
  bulkTransfer: vi.fn(),
  createTransferRecipient: vi.fn(),
  getKesBalance: vi.fn(),
  verifyTransfer: vi.fn(),
  listKesBanks: vi.fn(),
}
vi.mock("@/lib/payments/paystack", async () => ({
  ...(await vi.importActual<typeof import("@/lib/payments/paystack")>("@/lib/payments/paystack")),
  bulkTransfer: (...a: unknown[]) => paystack.bulkTransfer(...a),
  createTransferRecipient: (...a: unknown[]) => paystack.createTransferRecipient(...a),
  getKesBalance: (...a: unknown[]) => paystack.getKesBalance(...a),
  verifyTransfer: (...a: unknown[]) => paystack.verifyTransfer(...a),
  listKesBanks: (...a: unknown[]) => paystack.listKesBanks(...a),
}))
const notify = { notifyPayoutUpdate: vi.fn(), alertOpsFinance: vi.fn(), notifyPayoutDetailsChanged: vi.fn() }
vi.mock("@/lib/payments/money-notify", () => ({
  notifyPayoutUpdate: (...a: unknown[]) => notify.notifyPayoutUpdate(...a),
  alertOpsFinance: (...a: unknown[]) => notify.alertOpsFinance(...a),
  notifyPayoutDetailsChanged: (...a: unknown[]) => notify.notifyPayoutDetailsChanged(...a),
}))

import { POST as disburseRoute } from "@/app/v1/ops/payouts/disburse/route"
import { POST as transferApproval } from "@/app/v1/payments/paystack/transfer-approval/route"
import { PATCH as patchProfile } from "@/app/v1/driver/profile/route"
import {
  approveTransfer,
  disburse,
  estimateTransferFeeKes,
  handleTransferEvent,
  timing,
  transferReference,
} from "./payouts"

const databaseUrl = testDatabaseUrl()

describe("transferReference and fees", () => {
  it("formats the reference", () => {
    const ref = transferReference(42, new Date("2026-11-01"))
    expect(ref).toBe("adm-payout-42-202611")
    expect(ref.length).toBeGreaterThanOrEqual(16)
    expect(ref.length).toBeLessThanOrEqual(50)
  })

  it("estimates Paystack transfer fees", () => {
    expect(estimateTransferFeeKes("mpesa", 1500)).toBe(20)
    expect(estimateTransferFeeKes("mpesa", 1501)).toBe(40)
    expect(estimateTransferFeeKes("mpesa", 20001)).toBe(60)
    expect(estimateTransferFeeKes("bank", 50001)).toBe(140)
  })
})

describe.skipIf(!databaseUrl)("driver payouts", { timeout: 60_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `payout-test-${Date.now()}`
  const month = new Date("2026-11-01")
  let profileId = 0

  const payout = (over: object = {}) =>
    prisma.payout.create({
      data: { driver_profile_id: profileId, amount_kes: 1000, period_month: month, provider: "paystack", ...over },
    })

  beforeAll(async () => {
    driverUserId = `${tag}-driver`
    profileId = (
      await prisma.driverProfile.create({
        data: { clerk_user_id: driverUserId, full_name: `${tag} Driver`, status: "approved", payout_method: "mpesa", payout_mpesa_msisdn: "0710000000" },
      })
    ).id
  }, 30_000)

  beforeEach(async () => {
    denied = []
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => {})
    timing.wait = async () => undefined
    paystack.getKesBalance.mockResolvedValue(1_000_000)
    paystack.createTransferRecipient.mockResolvedValue({ recipientCode: "RCP_test" })
    paystack.bulkTransfer.mockImplementation(async (items: { reference: string }[]) =>
      items.map((i) => ({ reference: i.reference, transferCode: `TRF_${i.reference}`, status: "pending" })),
    )
    await prisma.payout.deleteMany({ where: { driver_profile_id: profileId } })
    await prisma.driverProfile.update({ where: { id: profileId }, data: { paystack_recipient_code: null, payout_mpesa_msisdn: "0710000000" } })
  })

  afterAll(async () => {
    await prisma.payout.deleteMany({ where: { driver_profile_id: profileId } })
    await prisma.driverProfile.deleteMany({ where: { id: profileId } })
    await prisma.$disconnect()
  })

  it("approves only a processing payout with the exact amount", async () => {
    const p = await payout({ status: "processing", reference: `adm-payout-${tag}-a` })
    expect(await approveTransfer({ reference: "adm-payout-unknown", amount: 100000 })).toBe(false)
    expect(await approveTransfer({ reference: p.reference, amount: 100001 })).toBe(false)
    expect(await approveTransfer({ reference: p.reference, amount: 100000 })).toBe(true)
    const pending = await payout({ status: "pending", reference: `adm-payout-${tag}-b` })
    expect(await approveTransfer({ reference: pending.reference, amount: 100000 })).toBe(false)
    expect(await approveTransfer({})).toBe(false)
    // Bulk transfers may arrive as an array: approve only if every item is ours.
    const p2 = await payout({ status: "processing", reference: `adm-payout-${tag}-c` })
    expect(await approveTransfer([{ reference: p.reference, amount: 100000 }, { reference: p2.reference, amount: 100000 }])).toBe(true)
    expect(await approveTransfer([{ reference: p.reference, amount: 100000 }, { reference: "adm-payout-unknown", amount: 100000 }])).toBe(false)
    expect(await approveTransfer([])).toBe(false)
  })

  it("the approval route answers 400 for an unknown transfer and alerts ops", async () => {
    const res = await transferApproval(
      new Request("http://localhost", { method: "POST", body: JSON.stringify({ reference: "adm-payout-x-202611", amount: 5 }) }),
    )
    expect(res.status).toBe(400)
    expect(notify.alertOpsFinance).toHaveBeenCalledWith(expect.objectContaining({ email: true }))
    expect(paystack.getKesBalance).not.toHaveBeenCalled()
  })

  it("refuses to disburse when the balance is short by KES 1, changing nothing", async () => {
    const p = await payout({ amount_kes: 1000 })
    paystack.getKesBalance.mockResolvedValue(1000 + 20 - 1)
    await expect(disburse([p.id], "ops@x")).rejects.toThrow("Paystack balance too low")
    expect((await prisma.payout.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("pending")
    expect(paystack.bulkTransfer).not.toHaveBeenCalled()
  })

  it("the disburse route needs the payouts permission", async () => {
    denied = ["payouts"]
    const res = await disburseRoute(new Request("http://localhost", { method: "POST", body: JSON.stringify({ payoutIds: [1] }) }))
    expect(res.status).toBe(403)
  })

  it("sends in chunks of 100 and marks every row processing first", async () => {
    // 150 rows need distinct (driver, month) pairs only in real use; the test reuses one profile.
    await prisma.payout.createMany({
      data: Array.from({ length: 150 }, (_, i) => ({
        driver_profile_id: profileId,
        amount_kes: 1000,
        provider: "paystack",
        period_month: new Date(Date.UTC(2020 + Math.floor(i / 12), i % 12, 1)),
      })),
    })
    const rows = await prisma.payout.findMany({ where: { driver_profile_id: profileId }, select: { id: true } })
    const result = await disburse(rows.map((r) => r.id), "ops@x")
    expect(result.queued).toBe(150)
    expect(paystack.bulkTransfer).toHaveBeenCalledTimes(2)
    expect(paystack.bulkTransfer.mock.calls[0]![0]).toHaveLength(100)
    expect(paystack.bulkTransfer.mock.calls[1]![0]).toHaveLength(50)
    expect(await prisma.payout.count({ where: { driver_profile_id: profileId, status: "processing" } })).toBe(150)
    expect(paystack.createTransferRecipient).toHaveBeenCalledTimes(1)
    expect(paystack.createTransferRecipient).toHaveBeenCalledWith(
      expect.objectContaining({ type: "mobile_money", bankCode: "MPESA", accountNumber: "0710000000" }),
    )
  })

  it("transfer.success settles once and notifies once", async () => {
    const p = await payout()
    await disburse([p.id], "ops@x")
    const { reference } = await prisma.payout.findUniqueOrThrow({ where: { id: p.id } })
    await handleTransferEvent("transfer.success", { reference: reference!, fee_charged: 2000 })
    await handleTransferEvent("transfer.success", { reference: reference!, fee_charged: 2000 })
    const after = await prisma.payout.findUniqueOrThrow({ where: { id: p.id } })
    expect(after.status).toBe("settled")
    expect(Number(after.fee_kes)).toBe(20)
    expect(notify.notifyPayoutUpdate).toHaveBeenCalledTimes(1)
    expect(notify.notifyPayoutUpdate).toHaveBeenCalledWith(expect.objectContaining({ stage: "settled", driverClerkUserId: driverUserId }))
  })

  it("a retry after failure reuses the same reference", async () => {
    const p = await payout()
    await disburse([p.id], "ops@x")
    const first = (await prisma.payout.findUniqueOrThrow({ where: { id: p.id } })).reference
    await handleTransferEvent("transfer.failed", { reference: first!, reason: "Recipient unreachable" })
    expect(notify.alertOpsFinance).toHaveBeenCalledTimes(1)
    await disburse([p.id], "ops@x")
    const again = await prisma.payout.findUniqueOrThrow({ where: { id: p.id } })
    expect(again.reference).toBe(first)
    expect(again.status).toBe("processing")
    expect(paystack.bulkTransfer.mock.calls[1]![0][0].reference).toBe(first)
  })

  it("won't send a settled payout again", async () => {
    const p = await payout({ status: "settled", reference: `adm-payout-${tag}-s` })
    expect((await disburse([p.id], "ops@x")).skipped[0]).toEqual({ id: p.id, reason: "Already settled" })
    expect(paystack.bulkTransfer).not.toHaveBeenCalled()
  })

  it("a changed payout number clears the recipient and notifies; an identical PATCH doesn't", async () => {
    await prisma.driverProfile.update({ where: { id: profileId }, data: { status: "changes_requested", paystack_recipient_code: "RCP_old" } })
    const send = (body: object) => patchProfile(new Request("http://localhost", { method: "PATCH", body: JSON.stringify(body) }))
    expect((await send({ payout_mpesa_msisdn: "0710000000" })).status).toBe(200)
    expect(notify.notifyPayoutDetailsChanged).not.toHaveBeenCalled()
    expect((await send({ payout_mpesa_msisdn: "0722000000" })).status).toBe(200)
    expect(notify.notifyPayoutDetailsChanged).toHaveBeenCalledTimes(1)
    expect((await prisma.driverProfile.findUniqueOrThrow({ where: { id: profileId } })).paystack_recipient_code).toBeNull()
    await prisma.driverProfile.update({ where: { id: profileId }, data: { status: "approved" } })
  })
})
