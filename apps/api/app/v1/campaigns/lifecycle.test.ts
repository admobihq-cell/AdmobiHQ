import { existsSync, readFileSync } from "node:fs"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

/**
 * Full campaign lifecycle against the live database, with auth, Cloudinary and
 * all outbound notifications stubbed. Covers the state machine the four UI
 * surfaces depend on: who may edit when, what submit refuses, and how a
 * decision lands.
 *
 * CI deliberately does not inject DATABASE_URL (waking Neon on every PR). When
 * no URL is available this suite skips — run it locally after `env:pull`.
 */

/** Prefer an already-exported URL; otherwise read apps/web/.env.local (cwd = apps/api). */
function resolveDatabaseUrl(): string | undefined {
  const fromEnv = process.env.DATABASE_URL?.trim()
  if (fromEnv) return fromEnv

  const envPath = "../web/.env.local"
  if (!existsSync(envPath)) return undefined

  const line = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((l) => /^\s*DATABASE_URL\s*=/.test(l))
  if (!line) return undefined

  return line
    .replace(/^\s*DATABASE_URL\s*=\s*/, "")
    .replace(/^["']|["']$/g, "")
    .trim()
}

const databaseUrl = resolveDatabaseUrl()

const CUSTOMER = `lifecycle-adv-${Date.now()}`
const OTHER_CUSTOMER = `lifecycle-other-${Date.now()}`
let actingUserId = CUSTOMER
let actingOrgId = 0
let otherOrgId = 0

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireCustomerAccess: vi.fn(async () => ({
      access: { userId: actingUserId, orgId: actingOrgId, isOwner: true, permissions: new Set() },
    })),
    requireCustomerPermissionAccess: vi.fn(async () => ({
      access: { userId: actingUserId, orgId: actingOrgId, isOwner: true, permissions: new Set() },
    })),
    requireOpsPermissionAccess: vi.fn(async () => ({
      access: { userId: "ops_1", email: "ops@admobihq.com" },
    })),
  }
})

// Outbound side effects: asserted on, never actually sent.
const notifyUserPush = vi.fn()
const notifyOpsStaffAlert = vi.fn()
const sendEmail = vi.fn()
const sendAdminEmail = vi.fn()
vi.mock("@/lib/push/user-push", () => ({
  notifyUserPush: (...a: unknown[]) => notifyUserPush(...a),
}))
vi.mock("@/lib/push/ops-alerts", () => ({
  notifyOpsStaffAlert: (...a: unknown[]) => notifyOpsStaffAlert(...a),
}))
vi.mock("@/lib/email/send-email", () => ({
  sendEmail: (...a: unknown[]) => sendEmail(...a),
  sendAdminEmail: (...a: unknown[]) => sendAdminEmail(...a),
}))
vi.mock("@/lib/customer-clerk", () => ({
  customerClerkClient: {},
  getCustomerEmail: async () => "advertiser@example.com",
  getCustomerName: async () => "Amina",
  getCustomerCompanyName: async () => "Acme Media",
  readCompanyName: () => "Acme Media",
}))

let campaignId: number
let prisma: typeof import("@/lib/prisma").prisma
let customerOrg: { id: number }
let otherOrg: { id: number }

function json(body: unknown, method = "POST") {
  return new Request("http://localhost/x", { method, body: JSON.stringify(body) })
}

function bare(method = "POST") {
  return new Request("http://localhost/x", { method })
}

function routeParams(id: number) {
  return { params: Promise.resolve({ id: String(id) }) }
}

describe.skipIf(!databaseUrl)("campaign lifecycle", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl!
    ;({ prisma } = await import("@/lib/prisma"))

    customerOrg = await prisma.advertiserOrg.create({ data: { name: "Lifecycle Test Org" } })
    otherOrg = await prisma.advertiserOrg.create({ data: { name: "Lifecycle Other Org" } })
    actingOrgId = customerOrg.id
    otherOrgId = otherOrg.id
  }, 60_000)

  afterAll(async () => {
    if (!prisma) return
    await prisma.campaign.deleteMany({
      where: { clerk_user_id: { in: [CUSTOMER, OTHER_CUSTOMER] } },
    })
    await prisma.customerNotification.deleteMany({
      where: { clerk_user_id: { in: [CUSTOMER, OTHER_CUSTOMER] } },
    })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: [customerOrg.id, otherOrg.id] } } })
  })

  it("creates a draft", async () => {
    const { POST } = await import("../customer/campaigns/route")
    const res = await POST(json({ name: "Kilimani Launch", format: "taxi_top" }))
    expect(res.status).toBe(201)
    const body = await res.json()
    campaignId = body.id
    expect(body.status).toBe("draft")
    expect(body.flight_phase).toBe("unscheduled")
  }, 30_000)

  it("refuses to submit an incomplete draft, naming what is missing", async () => {
    const { POST } = await import("../customer/campaigns/[id]/submit/route")
    const res = await POST(bare(), routeParams(campaignId))
    expect(res.status).toBe(400)
    const body = await res.json()
    // jsonError() nests its detail payload under `issues`, the same shape the
    // driver profile-submit route uses, so driver-web's handling transfers.
    expect(body.issues.missingFields).toEqual(
      expect.arrayContaining(["market", "budget_kes", "starts_on", "ends_on"]),
    )
    expect(body.issues.missingCreatives).toEqual(["Taxi-top LED"])
    expect(notifyOpsStaffAlert).not.toHaveBeenCalled()
  }, 30_000)

  it("rejects a flight window that ends before it starts", async () => {
    const { PATCH } = await import("../customer/campaigns/[id]/route")
    const res = await PATCH(
      json({ starts_on: "2026-11-10", ends_on: "2026-11-01" }, "PATCH"),
      routeParams(campaignId),
    )
    expect(res.status).toBe(400)
  }, 30_000)

  it("fills in the remaining fields", async () => {
    const { PATCH } = await import("../customer/campaigns/[id]/route")
    const res = await PATCH(
      json(
        {
          market: "Kilimani",
          budget_kes: 120000,
          starts_on: "2026-11-01",
          ends_on: "2026-11-30",
        },
        "PATCH",
      ),
      routeParams(campaignId),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.budget_kes).toBe("120000")
    expect(body.starts_on).toBe("2026-11-01")
    expect(body.ends_on).toBe("2026-11-30")
  }, 30_000)

  it("still refuses to submit with no creative", async () => {
    const { POST } = await import("../customer/campaigns/[id]/submit/route")
    const res = await POST(bare(), routeParams(campaignId))
    expect(res.status).toBe(400)
    expect((await res.json()).issues.missingCreatives).toEqual(["Taxi-top LED"])
  }, 30_000)

  it("submits once a correctly shaped creative exists, and fires every notification", async () => {
    await prisma.campaignCreative.create({
      data: {
        campaign_id: campaignId,
        resource_type: "image",
        cloudinary_public_id: `lifecycle-test/${campaignId}`,
        content_type: "image/png",
        size_bytes: 1000,
        width: 960,
        height: 320,
      },
    })

    const { POST } = await import("../customer/campaigns/[id]/submit/route")
    const res = await POST(bare(), routeParams(campaignId))
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe("submitted")

    expect(notifyUserPush).toHaveBeenCalledWith(
      "customer",
      CUSTOMER,
      expect.objectContaining({ href: `/campaigns/${campaignId}` }),
    )
    expect(notifyOpsStaffAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "campaign_submission" }),
    )
    expect(sendEmail).toHaveBeenCalled()
    expect(sendAdminEmail).toHaveBeenCalled()

    const inbox = await prisma.customerNotification.findMany({
      where: { clerk_user_id: CUSTOMER },
    })
    expect(inbox).toHaveLength(1)
    expect(inbox[0]!.type).toBe("campaign_submitted")
  }, 60_000)

  it("freezes the campaign while it is under review", async () => {
    const { PATCH } = await import("../customer/campaigns/[id]/route")
    const res = await PATCH(json({ name: "Sneaky rename" }, "PATCH"), routeParams(campaignId))
    expect(res.status).toBe(409)
  }, 30_000)

  it("hides another advertiser's campaign behind a 404, not a 403", async () => {
    actingUserId = OTHER_CUSTOMER
    actingOrgId = otherOrgId
    const { GET, PATCH } = await import("../customer/campaigns/[id]/route")
    const res = await GET(bare("GET"), routeParams(campaignId))
    expect(res.status).toBe(404)

    const patchRes = await PATCH(json({ name: "Hijacked" }, "PATCH"), routeParams(campaignId))
    expect(patchRes.status).toBe(404)

    const { POST: submit } = await import("../customer/campaigns/[id]/submit/route")
    const submitRes = await submit(bare(), routeParams(campaignId))
    expect(submitRes.status).toBe(404)

    actingUserId = CUSTOMER
    actingOrgId = customerOrg.id
  }, 30_000)

  it("requires a reason to request changes", async () => {
    const { PATCH } = await import("./[id]/review/route")
    const res = await PATCH(json({ decision: "changes_requested" }, "PATCH"), routeParams(campaignId))
    expect(res.status).toBe(400)
  }, 30_000)

  it("requests changes and shows the reason to the advertiser", async () => {
    const reason = "Creative is 4:3 - the taxi top needs 3:1 artwork."
    const { PATCH } = await import("./[id]/review/route")
    const res = await PATCH(
      json({ decision: "changes_requested", reason }, "PATCH"),
      routeParams(campaignId),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("changes_requested")
    expect(body.review_reason).toBe(reason)

    const inbox = await prisma.customerNotification.findMany({
      where: { clerk_user_id: CUSTOMER },
      orderBy: { id: "desc" },
    })
    // The inbox body IS the reason, so the advertiser sees it without having
    // to open the campaign.
    expect(inbox[0]!.body).toBe(reason)
  }, 60_000)

  it("becomes editable again, and resubmitting clears the stale reason", async () => {
    const { PATCH } = await import("../customer/campaigns/[id]/route")
    const edit = await PATCH(json({ name: "Kilimani Launch v2" }, "PATCH"), routeParams(campaignId))
    expect(edit.status).toBe(200)

    const { POST } = await import("../customer/campaigns/[id]/submit/route")
    const res = await POST(bare(), routeParams(campaignId))
    expect((await res.json()).review_reason).toBeNull()
  }, 60_000)

  it("approves, and derives the flight phase from the dates", async () => {
    const { PATCH } = await import("./[id]/review/route")
    const res = await PATCH(json({ decision: "approved" }, "PATCH"), routeParams(campaignId))
    const body = await res.json()
    expect(body.status).toBe("approved")
    expect(body.review_reason).toBeNull()
    // Ops reviews on behalf of a company, so the decision response has to carry
    // it — the detail view re-renders from exactly this payload.
    expect(body.company_name).toBe("Acme Media")
    // Window is Nov 2026, which is ahead of this suite's run date.
    expect(body.flight_phase).toBe("scheduled")
  }, 60_000)

  it("refuses a second approval but allows an unapprove walk-back", async () => {
    const { PATCH } = await import("./[id]/review/route")
    const again = await PATCH(json({ decision: "approved" }, "PATCH"), routeParams(campaignId))
    expect(again.status).toBe(409)

    const res = await PATCH(
      json({ decision: "changes_requested", reason: "Budget changed" }, "PATCH"),
      routeParams(campaignId),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe("changes_requested")
  }, 60_000)

  it("lists the campaign for ops with its creative count", async () => {
    const { GET } = await import("./route")
    const res = await GET(new Request("http://localhost/v1/campaigns?pageSize=100"))
    expect(res.status).toBe(200)
    const body = await res.json()
    const row = body.items.find((i: { id: number }) => i.id === campaignId)
    expect(row).toBeDefined()
    expect(row.creative_count).toBe(1)
  }, 30_000)
})
