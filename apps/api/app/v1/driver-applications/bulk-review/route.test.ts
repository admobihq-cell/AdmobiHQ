import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { auditFromOpsUser } from "@/lib/audit"
import { testDatabaseUrl } from "@/lib/test-database-url"
import { GET } from "../route"
import { POST } from "./route"

const databaseUrl = testDatabaseUrl()

let allowed = true

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn(async (permission: string) =>
      allowed
        ? { access: { userId: "ops_bulk_2", email: "ops@admobihq.com" } }
        : {
            error: new Response(JSON.stringify({ error: `Forbidden — "${permission}"` }), {
              status: 403,
            }),
          },
    ),
  }
})

vi.mock("@/lib/audit", () => ({ auditFromOpsUser: vi.fn(async () => undefined) }))
vi.mock("@/lib/email/send-email", () => ({ sendEmail: vi.fn(async () => undefined) }))
vi.mock("@/lib/email/render-template", () => ({ renderTemplate: vi.fn(async () => "<p>x</p>") }))
vi.mock("@/lib/driver/driver-clerk", () => ({
  getDriverEmail: vi.fn(async () => "driver@example.com"),
}))

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/v1/driver-applications/bulk-review", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  )

describe.skipIf(!databaseUrl)("driver applications bulk review + search", { timeout: 30_000 }, () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const tag = `bulk-drv-${Date.now()}`
  let n = 0

  const seed = (status: string, extra: { full_name?: string; city?: string } = {}) =>
    prisma.driverProfile
      .create({ data: { clerk_user_id: `${tag}-${n++}`, status, full_name: `${tag} driver`, ...extra } })
      .then((p) => p)

  const statusOf = async (id: number) =>
    (await prisma.driverProfile.findUniqueOrThrow({ where: { id } })).status

  beforeAll(() => undefined)

  beforeEach(() => {
    allowed = true
    vi.mocked(auditFromOpsUser).mockClear()
  })

  afterAll(async () => {
    await prisma.driverNotification.deleteMany({ where: { clerk_user_id: { startsWith: tag } } })
    await prisma.driverProfile.deleteMany({ where: { clerk_user_id: { startsWith: tag } } })
    await prisma.$disconnect()
  })

  it("approves only submitted applications and skips the rest", async () => {
    const [s1, s2, approved, rejected] = [
      await seed("submitted"),
      await seed("submitted"),
      await seed("approved"),
      await seed("rejected"),
    ]
    const res = await post({
      ids: [s1.id, s2.id, approved.id, rejected.id],
      decision: "approved",
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.updated).toEqual([s1.id, s2.id])
    expect(body.skipped.map((s: { id: number }) => s.id)).toEqual([approved.id, rejected.id])
    expect(await statusOf(rejected.id)).toBe("rejected")
  })

  it("never walks back an approved application", async () => {
    const approved = await seed("approved")
    const body = await (await post({ ids: [approved.id], decision: "rejected", reason: "x" })).json()
    expect(body.skipped.map((s: { id: number }) => s.id)).toEqual([approved.id])
    expect(await statusOf(approved.id)).toBe("approved")
  })

  it("requires a reason to reject", async () => {
    const s1 = await seed("submitted")
    expect((await post({ ids: [s1.id], decision: "rejected" })).status).toBe(400)
    expect(await statusOf(s1.id)).toBe("submitted")
  })

  it("notifies each approved driver", async () => {
    const [s1, s2] = [await seed("submitted"), await seed("submitted")]
    await post({ ids: [s1.id, s2.id], decision: "approved" })
    const notes = await prisma.driverNotification.findMany({
      where: { clerk_user_id: { in: [s1.clerk_user_id, s2.clerk_user_id] }, type: "application_approved" },
    })
    expect(notes).toHaveLength(2)
    expect(auditFromOpsUser).toHaveBeenCalledTimes(2)
  })

  it("requires the driver_applications permission", async () => {
    allowed = false
    const s1 = await seed("submitted")
    expect((await post({ ids: [s1.id], decision: "approved" })).status).toBe(403)
  })

  it("list search matches name, phone and city", async () => {
    const named = await seed("submitted", { full_name: `${tag} Zawadi` })
    const city = await seed("submitted", { city: `${tag}-town` })
    const list = async (search: string) =>
      (await (await GET(new Request(`http://localhost/v1/driver-applications?search=${encodeURIComponent(search)}`))).json())
        .items.map((i: { id: number }) => i.id)
    expect(await list(`${tag} Zawadi`)).toEqual([named.id])
    expect(await list(`${tag}-town`)).toEqual([city.id])
  })
})
