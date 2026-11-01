import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { testDatabaseUrl } from "@/lib/test-database-url"

/**
 * Media Library against the live database, with auth and Cloudinary stubbed.
 * Skips when no DATABASE_URL is available (CI), like campaigns/lifecycle.test.ts.
 */
const databaseUrl = testDatabaseUrl()

const USER = `media-adv-${Date.now()}`
let actingOrgId = 0

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireCustomerPermissionAccess: vi.fn(async () => ({
      access: { userId: USER, orgId: actingOrgId, isOwner: true, permissions: new Set() },
    })),
    requireOpsPermissionAccess: vi.fn(async () => ({
      access: { userId: "ops_1", email: "ops@admobihq.com" },
    })),
  }
})

vi.mock("@/lib/customer/customer-clerk", () => ({
  customerClerkClient: {},
  getCustomerEmail: async () => "advertiser@example.com",
  getCustomerName: async () => "Amina",
  getCustomerCompanyName: async () => "Acme Media",
  readCompanyName: () => "Acme Media",
}))

// Cloudinary is never reached. An upload "returns" whatever nextDims holds,
// which is how a test chooses the shape of the file it is uploading.
let nextDims: { width: number | null; height: number | null } = { width: 960, height: 320 }
let uploadFails = false
const destroyPrivateAsset = vi.fn()
vi.mock("@/lib/storage/private-media", () => ({
  uploadPrivateAsset: async (file: File, publicId: string) => {
    if (uploadFails) throw new Error("cloudinary down")
    return {
      publicId,
      contentType: file.type,
      sizeBytes: file.size,
      width: nextDims.width,
      height: nextDims.height,
      durationSeconds: null,
    }
  },
  destroyPrivateAsset: (...args: unknown[]) => destroyPrivateAsset(...args),
  fetchPrivateAsset: async () => new Response("bytes"),
}))

let prisma: typeof import("@/lib/prisma").prisma
let orgId = 0
let otherOrgId = 0
const extraOrgIds: number[] = []

function png(name = "taxi.png", bytes = 16): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/png" })
}

function fileRequest(file: File): Request {
  const form = new FormData()
  form.append("file", file)
  return new Request("http://localhost/x", { method: "POST", body: form })
}

function json(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function bare(method: string): Request {
  return new Request("http://localhost/x", { method })
}

const idParams = (id: number) => ({ params: Promise.resolve({ id: String(id) }) })
const creativeParams = (id: number, creativeId: number) => ({
  params: Promise.resolve({ id: String(id), creativeId: String(creativeId) }),
})

function createCampaign(format = "taxi_top", org = orgId, name = `Media test ${format}`) {
  return prisma.campaign.create({
    data: { clerk_user_id: USER, org_id: org, name, format },
  })
}

async function uploadInline(campaignId: number, file = png()) {
  const { POST } = await import("../campaigns/[id]/creatives/route")
  return POST(fileRequest(file), idParams(campaignId))
}

describe.skipIf(!databaseUrl)("media library", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl!
    ;({ prisma } = await import("@/lib/prisma"))
    orgId = (await prisma.advertiserOrg.create({ data: { name: "Media Test Org" } })).id
    otherOrgId = (await prisma.advertiserOrg.create({ data: { name: "Media Other Org" } })).id
  }, 60_000)

  beforeEach(() => {
    actingOrgId = orgId
    nextDims = { width: 960, height: 320 }
    uploadFails = false
    destroyPrivateAsset.mockClear()
  })

  afterAll(async () => {
    if (!prisma) return
    // Campaigns first: their attachments cascade away, which frees the assets.
    await prisma.campaign.deleteMany({ where: { clerk_user_id: USER } })
    await prisma.mediaAsset.deleteMany({ where: { created_by_clerk_user_id: USER } })
    await prisma.advertiserOrg.deleteMany({
      where: { id: { in: [orgId, otherOrgId, ...extraOrgIds] } },
    })
  })

  describe("inline campaign upload", () => {
    it("lands in the org's library and is attached to the campaign", async () => {
      const campaign = await createCampaign()
      const res = await uploadInline(campaign.id)
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.name).toBe("taxi.png")
      expect(body.width).toBe(960)

      const asset = await prisma.mediaAsset.findUnique({ where: { id: body.media_asset_id } })
      expect(asset?.org_id).toBe(orgId)
      expect(asset?.created_by_clerk_user_id).toBe(USER)
      expect(asset?.cloudinary_public_id.startsWith(`media/${orgId}/`)).toBe(true)
    }, 30_000)

    it("rejects a wrong-shaped file and keeps nothing", async () => {
      const campaign = await createCampaign()
      const before = await prisma.mediaAsset.count({ where: { org_id: orgId } })
      nextDims = { width: 400, height: 300 }

      const res = await uploadInline(campaign.id)
      expect(res.status).toBe(400)
      expect((await res.json()).issues.specs[0].label).toBe("Taxi-top LED")
      expect(destroyPrivateAsset).toHaveBeenCalledTimes(1)
      expect(await prisma.mediaAsset.count({ where: { org_id: orgId } })).toBe(before)
    }, 30_000)

    it("caps an over-long filename at 120 characters for the asset's name", async () => {
      const campaign = await createCampaign()
      const res = await uploadInline(campaign.id, png(`${"a".repeat(200)}.png`))
      expect(res.status).toBe(201)
      expect((await res.json()).name).toHaveLength(120)
    }, 30_000)

    it("removing a creative detaches it and keeps the file in the library", async () => {
      const campaign = await createCampaign()
      const creative = await (await uploadInline(campaign.id)).json()

      const { DELETE } = await import("../campaigns/[id]/creatives/[creativeId]/route")
      const res = await DELETE(bare("DELETE"), creativeParams(campaign.id, creative.id))
      expect(res.status).toBe(200)

      expect(await prisma.campaignCreative.findUnique({ where: { id: creative.id } })).toBeNull()
      expect(
        await prisma.mediaAsset.findUnique({ where: { id: creative.media_asset_id } }),
      ).not.toBeNull()
      expect(destroyPrivateAsset).not.toHaveBeenCalled()
    }, 30_000)

    it("deleting a draft campaign keeps its files in the library", async () => {
      const campaign = await createCampaign()
      const creative = await (await uploadInline(campaign.id)).json()

      const { DELETE } = await import("../campaigns/[id]/route")
      const res = await DELETE(bare("DELETE"), idParams(campaign.id))
      expect(res.status).toBe(200)

      expect(
        await prisma.mediaAsset.findUnique({ where: { id: creative.media_asset_id } }),
      ).not.toBeNull()
      expect(destroyPrivateAsset).not.toHaveBeenCalled()
    }, 30_000)
  })
})
