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
  customerClerkClient: {
    users: {
      getUserList: async () => ({
        data: [{ id: USER, firstName: "Amina", username: null, emailAddresses: [] }],
      }),
    },
  },
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

async function uploadToLibrary(file = png()) {
  const { POST } = await import("./route")
  return POST(fileRequest(file))
}

async function listItems(query: string) {
  const { GET } = await import("./route")
  const res = await GET(new Request(`http://localhost/v1/customer/media${query}`))
  expect(res.status).toBe(200)
  return (await res.json()).items as { id: number; name: string; created_by_name: string | null }[]
}

async function listIds(query: string): Promise<number[]> {
  return (await listItems(query)).map((item) => item.id)
}

async function attach(campaignId: number, mediaAssetId: number) {
  const { POST } = await import("../campaigns/[id]/creatives/route")
  return POST(json({ mediaAssetId }), idParams(campaignId))
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

  describe("library routes", () => {
    it("uploads straight into the library, whatever the file's shape", async () => {
      // 4:3 fits no panel, and that is fine here: fit is judged on attach.
      nextDims = { width: 400, height: 300 }
      const res = await uploadToLibrary(png("moodboard.png"))
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({ name: "moodboard.png", status: "ready", campaigns: [] })
      expect(body.cloudinary_public_id).toBeUndefined()
    }, 30_000)

    it("refuses a format the panel can't play, an empty file, and a non-form body", async () => {
      const webp = new File([new Uint8Array(16)], "x.webp", { type: "image/webp" })
      expect((await uploadToLibrary(webp)).status).toBe(400)
      expect((await uploadToLibrary(png("empty.png", 0))).status).toBe(400)

      const { POST } = await import("./route")
      const res = await POST(json({ file: "nope" }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe("Missing file")
    }, 30_000)

    it("answers 502 and stores nothing when the upload itself fails", async () => {
      const before = await prisma.mediaAsset.count({ where: { org_id: orgId } })
      uploadFails = true
      expect((await uploadToLibrary()).status).toBe(502)
      expect(await prisma.mediaAsset.count({ where: { org_id: orgId } })).toBe(before)
    }, 30_000)

    it("lists with search, type and usage filters", async () => {
      const alpha = await (await uploadToLibrary(png("alpha-hero.png"))).json()
      const beta = await prisma.mediaAsset.create({
        data: {
          org_id: orgId,
          name: "beta-loop.mp4",
          resource_type: "video",
          cloudinary_public_id: `media-test/${orgId}/beta-${Date.now()}`,
          content_type: "video/mp4",
          size_bytes: 5000,
          width: 960,
          height: 320,
          created_by_clerk_user_id: USER,
        },
      })
      const campaign = await createCampaign()
      await prisma.campaignCreative.create({
        data: { campaign_id: campaign.id, media_asset_id: alpha.id },
      })

      const bySearch = await listIds("?search=ALPHA-he")
      expect(bySearch).toContain(alpha.id)
      expect(bySearch).not.toContain(beta.id)

      const videos = await listIds("?type=video")
      expect(videos).toContain(beta.id)
      expect(videos).not.toContain(alpha.id)

      const used = await listIds("?usage=used")
      expect(used).toContain(alpha.id)
      expect(used).not.toContain(beta.id)

      const unused = await listIds("?usage=unused")
      expect(unused).toContain(beta.id)
      expect(unused).not.toContain(alpha.id)
    }, 30_000)

    it("sorts newest first by default, or by name or file size", async () => {
      const sorted = await prisma.advertiserOrg.create({ data: { name: "Media Sort Org" } })
      extraOrgIds.push(sorted.id)
      actingOrgId = sorted.id

      const big = await (await uploadToLibrary(png("zebra.png", 900))).json()
      const small = await (await uploadToLibrary(png("Apple.png", 10))).json()
      const mid = await (await uploadToLibrary(png("mango.png", 300))).json()

      expect(await listIds("")).toEqual([mid.id, small.id, big.id])
      expect(await listIds("?sort=name")).toEqual([small.id, mid.id, big.id])
      expect(await listIds("?sort=size")).toEqual([big.id, mid.id, small.id])
      expect(await listIds("?sort=nonsense")).toEqual([mid.id, small.id, big.id])
    }, 30_000)

    it("names who uploaded each file", async () => {
      const asset = await (await uploadToLibrary(png("by-whom.png"))).json()
      const items = await listItems("?search=by-whom")
      expect(items.find((item) => item.id === asset.id)?.created_by_name).toBe("Amina")
    }, 30_000)

    it("hides another org's file behind a 404 on every route", async () => {
      const asset = await (await uploadToLibrary(png("private.png"))).json()
      actingOrgId = otherOrgId

      const { PATCH, DELETE } = await import("./[id]/route")
      expect((await PATCH(json({ name: "Hijacked" }, "PATCH"), idParams(asset.id))).status).toBe(404)
      expect((await DELETE(bare("DELETE"), idParams(asset.id))).status).toBe(404)

      const { GET } = await import("./[id]/file/route")
      expect((await GET(bare("GET"), idParams(asset.id))).status).toBe(404)

      expect(await listIds("")).not.toContain(asset.id)
      expect((await prisma.mediaAsset.findUnique({ where: { id: asset.id } }))?.name).toBe(
        "private.png",
      )
    }, 30_000)

    it("renames, trimming the name and refusing a blank one", async () => {
      const asset = await (await uploadToLibrary()).json()
      const { PATCH } = await import("./[id]/route")

      const res = await PATCH(json({ name: "  Launch hero  " }, "PATCH"), idParams(asset.id))
      expect(res.status).toBe(200)
      expect((await res.json()).name).toBe("Launch hero")

      expect((await PATCH(json({ name: "   " }, "PATCH"), idParams(asset.id))).status).toBe(400)
    }, 30_000)

    it("deletes an unused file from the library and from storage", async () => {
      const asset = await (await uploadToLibrary()).json()
      const row = await prisma.mediaAsset.findUnique({ where: { id: asset.id } })

      const { DELETE } = await import("./[id]/route")
      expect((await DELETE(bare("DELETE"), idParams(asset.id))).status).toBe(200)

      expect(await prisma.mediaAsset.findUnique({ where: { id: asset.id } })).toBeNull()
      expect(destroyPrivateAsset).toHaveBeenCalledWith(row!.cloudinary_public_id, "image")
    }, 30_000)

    it("refuses to delete a file a campaign still uses, and names the campaign", async () => {
      const campaign = await createCampaign("taxi_top", orgId, "Kilimani Launch")
      const creative = await (await uploadInline(campaign.id)).json()

      const { DELETE } = await import("./[id]/route")
      const res = await DELETE(bare("DELETE"), idParams(creative.media_asset_id))
      expect(res.status).toBe(409)
      const body = await res.json()
      expect(body.error).toContain("Kilimani Launch")
      expect(body.issues.campaigns).toEqual([{ id: campaign.id, name: "Kilimani Launch" }])

      expect(
        await prisma.mediaAsset.findUnique({ where: { id: creative.media_asset_id } }),
      ).not.toBeNull()
      expect(destroyPrivateAsset).not.toHaveBeenCalled()
    }, 30_000)

    it("streams the file through the proxy", async () => {
      const asset = await (await uploadToLibrary()).json()
      const { GET } = await import("./[id]/file/route")
      const res = await GET(bare("GET"), idParams(asset.id))
      expect(res.status).toBe(200)
      expect(res.headers.get("Content-Type")).toBe("image/png")
      expect(await res.text()).toBe("bytes")
    }, 30_000)
  })

  describe("attaching a library file", () => {
    it("attaches without uploading anything again", async () => {
      const asset = await (await uploadToLibrary()).json()
      const campaign = await createCampaign()
      const before = await prisma.mediaAsset.count({ where: { org_id: orgId } })

      const res = await attach(campaign.id, asset.id)
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body).toMatchObject({ media_asset_id: asset.id, slot: "all", warning: null })
      expect(await prisma.mediaAsset.count({ where: { org_id: orgId } })).toBe(before)
    }, 30_000)

    it("keeps the file and the other attachment when one of two campaigns is deleted", async () => {
      const asset = await (await uploadToLibrary()).json()
      const first = await createCampaign()
      const second = await createCampaign()
      expect((await attach(first.id, asset.id)).status).toBe(201)
      expect((await attach(second.id, asset.id)).status).toBe(201)

      const { DELETE } = await import("../campaigns/[id]/route")
      expect((await DELETE(bare("DELETE"), idParams(first.id))).status).toBe(200)

      expect(await prisma.mediaAsset.findUnique({ where: { id: asset.id } })).not.toBeNull()
      expect(
        await prisma.campaignCreative.count({
          where: { campaign_id: second.id, media_asset_id: asset.id },
        }),
      ).toBe(1)
      expect(destroyPrivateAsset).not.toHaveBeenCalled()
    }, 30_000)

    it("lets a file rejected for one panel be attached to a campaign it does fit", async () => {
      nextDims = { width: 320, height: 320 }
      const square = await (await uploadToLibrary(png("square.png"))).json()
      const taxi = await createCampaign("taxi_top")
      const bike = await createCampaign("delivery_bike")

      const rejected = await attach(taxi.id, square.id)
      expect(rejected.status).toBe(400)
      expect((await rejected.json()).issues.specs[0].label).toBe("Taxi-top LED")

      expect((await attach(bike.id, square.id)).status).toBe(201)
    }, 30_000)

    it("answers 404 for another org's file", async () => {
      const campaign = await createCampaign()
      actingOrgId = otherOrgId
      const foreign = await (await uploadToLibrary(png("foreign.png"))).json()
      actingOrgId = orgId

      expect((await attach(campaign.id, foreign.id)).status).toBe(404)
      expect(await prisma.campaignCreative.count({ where: { campaign_id: campaign.id } })).toBe(0)
    }, 30_000)

    it("answers 409 when the same file is attached twice", async () => {
      const asset = await (await uploadToLibrary()).json()
      const campaign = await createCampaign()
      expect((await attach(campaign.id, asset.id)).status).toBe(201)
      expect((await attach(campaign.id, asset.id)).status).toBe(409)
      expect(await prisma.campaignCreative.count({ where: { campaign_id: campaign.id } })).toBe(1)
    }, 30_000)

    it("refuses while the campaign is under review", async () => {
      const asset = await (await uploadToLibrary()).json()
      const campaign = await createCampaign()
      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: "submitted" } })
      expect((await attach(campaign.id, asset.id)).status).toBe(409)
    }, 30_000)

    it("still lets ops open an attached library file", async () => {
      const asset = await (await uploadToLibrary()).json()
      const campaign = await createCampaign()
      const creative = await (await attach(campaign.id, asset.id)).json()

      const { GET } = await import("../../campaigns/[id]/creatives/[creativeId]/file/route")
      const res = await GET(bare("GET"), creativeParams(campaign.id, creative.id))
      expect(res.status).toBe(200)
      expect(res.headers.get("Content-Type")).toBe("image/png")
    }, 30_000)
  })

  describe("org deletion", () => {
    it("removes unused files and keeps the ones a campaign still uses", async () => {
      const doomed = await prisma.advertiserOrg.create({ data: { name: "Doomed Org" } })
      extraOrgIds.push(doomed.id)
      actingOrgId = doomed.id

      const campaign = await createCampaign("taxi_top", doomed.id)
      const used = await (await uploadInline(campaign.id, png("used.png"))).json()
      const unused = await (await uploadToLibrary(png("unused.png"))).json()
      destroyPrivateAsset.mockClear()

      const { detachAndDeleteOrg, getOrgDetachmentImpact } = await import(
        "@/lib/advertiser/advertiser-org"
      )
      expect((await getOrgDetachmentImpact(doomed.id)).mediaAssetCount).toBe(2)

      await detachAndDeleteOrg(doomed.id)

      expect(await prisma.advertiserOrg.findUnique({ where: { id: doomed.id } })).toBeNull()
      expect(await prisma.mediaAsset.findUnique({ where: { id: unused.id } })).toBeNull()
      expect(destroyPrivateAsset).toHaveBeenCalledTimes(1)

      const kept = await prisma.mediaAsset.findUnique({ where: { id: used.media_asset_id } })
      expect(kept).not.toBeNull()
      expect(kept?.org_id).toBeNull()

      // Ops keeps the detached campaign, and can still open its creative.
      const { GET } = await import("../../campaigns/[id]/creatives/[creativeId]/file/route")
      const res = await GET(bare("GET"), creativeParams(campaign.id, used.id))
      expect(res.status).toBe(200)
    }, 60_000)

    it("does not treat an org that holds library files as untouched", async () => {
      const solo = await prisma.advertiserOrg.create({ data: { name: "My Organization" } })
      extraOrgIds.push(solo.id)
      await prisma.advertiserMember.create({
        data: { org_id: solo.id, clerk_user_id: `${USER}-solo`, is_owner: true },
      })

      const { isUntouchedSoloOrg } = await import("@/lib/advertiser/advertiser-org")
      expect(await isUntouchedSoloOrg(solo.id, true)).toBe(true)

      actingOrgId = solo.id
      await uploadToLibrary(png("only-thing-here.png"))
      expect(await isUntouchedSoloOrg(solo.id, true)).toBe(false)
    }, 30_000)
  })
})
