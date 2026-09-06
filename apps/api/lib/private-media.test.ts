import { beforeAll, describe, expect, it, vi } from "vitest"

/**
 * These assert the SHAPE OF THE SIGNED DELIVERY URL, offline. That URL is
 * where the real risk lives in this module: a wrong transformation silently
 * changes what bytes come back, and the failure only shows up as a broken
 * preview or a corrupt hand-off to the supplier — never as an exception.
 *
 * The upload/destroy paths hit the network and are covered by the manual
 * round-trip in the task's verification step, not here.
 */

// A syntactically valid CLOUDINARY_URL so the SDK self-configures without
// reaching the network. cloudinary.url() is pure string building.
//
// The import is warmed here rather than left to the first `it`: pulling in the
// Cloudinary SDK takes ~6s cold, which blows the 5s default timeout on
// whichever test happens to run first. Paying it once in a hook with its own
// timeout keeps every test fast and honest.
beforeAll(async () => {
  process.env.CLOUDINARY_URL = "cloudinary://123456789012345:test-api-secret@test-cloud"
  vi.resetModules()
  await import("./private-media")
  await import("./campaign-creative-storage")
}, 30_000)

async function urlFor(...args: Parameters<typeof import("./private-media").fetchPrivateAsset>) {
  const { cloudinary } = await import("@/lib/cloudinary")
  const spy = vi.spyOn(cloudinary, "url")
  // Make the fetch fail fast — we only care about the URL that was minted.
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(null, { status: 500 }))

  const { fetchPrivateAsset } = await import("./private-media")
  await fetchPrivateAsset(...args).catch(() => undefined)

  const url = spy.mock.results[0]?.value as string
  const options = spy.mock.calls[0]?.[1] as Record<string, unknown>
  spy.mockRestore()
  fetchSpy.mockRestore()
  return { url, options }
}

describe("fetchPrivateAsset delivery URL", () => {
  it("signs every URL and uses the authenticated delivery type", async () => {
    const { url, options } = await urlFor("driver-documents/1/national_id/abc", {
      resourceType: "image",
    })
    expect(options.type).toBe("authenticated")
    expect(options.sign_url).toBe(true)
    expect(options.secure).toBe(true)
    // Without this the SDK throws "Must supply sdk_semver" under Next's
    // bundled dev runtime.
    expect(options.analytics).toBe(false)
    expect(url).toContain("/authenticated/")
    expect(url).toMatch(/^https:\/\//)
  })

  it("keeps the driver-document transform unchanged: w_800 limit, q_auto, f_auto", async () => {
    const { url } = await urlFor("driver-documents/1/national_id/abc", {
      resourceType: "image",
      maxWidth: 800,
    })
    expect(url).toContain("c_limit")
    expect(url).toContain("w_800")
    expect(url).toContain("q_auto")
    expect(url).toContain("f_auto")
  })

  // f_auto would let Cloudinary hand back animated WebP (or a video) while we
  // stream it under the stored image/gif Content-Type — a format/header
  // mismatch that also flattens the animation.
  it("serves animated GIF untransformed so it stays a GIF", async () => {
    const { url } = await urlFor("campaign-creatives/7/abc", {
      resourceType: "image",
      contentType: "image/gif",
      maxWidth: 1600,
    })
    expect(url).not.toContain("f_auto")
    expect(url).not.toContain("w_1600")
    expect(url).not.toContain("c_limit")
  })

  it("does not width-cap or re-container video", async () => {
    const { url } = await urlFor("campaign-creatives/7/def", {
      resourceType: "video",
      contentType: "video/mp4",
      maxWidth: 1600,
    })
    expect(url).toContain("/video/")
    expect(url).toContain("q_auto")
    expect(url).not.toContain("w_1600")
    expect(url).not.toContain("f_auto")
  })

  it("caps campaign images at 1600px, not the driver-document 800px", async () => {
    const { url } = await urlFor("campaign-creatives/7/ghi", {
      resourceType: "image",
      contentType: "image/png",
      maxWidth: 1600,
    })
    expect(url).toContain("w_1600")
    expect(url).not.toContain("w_800")
  })

  it("delivers full size when maxWidth is null", async () => {
    const { url } = await urlFor("campaign-creatives/7/jkl", {
      resourceType: "image",
      contentType: "image/png",
      maxWidth: null,
    })
    expect(url).not.toContain("c_limit")
    expect(url).toContain("q_auto")
  })
})

describe("resourceTypeForMime", () => {
  it("maps the supplier's four accepted formats", async () => {
    const { resourceTypeForMime } = await import("./campaign-creative-storage")
    expect(resourceTypeForMime("image/png")).toBe("image")
    expect(resourceTypeForMime("image/jpeg")).toBe("image")
    // Cloudinary classifies GIF, animated included, as an image resource.
    expect(resourceTypeForMime("image/gif")).toBe("image")
    expect(resourceTypeForMime("video/mp4")).toBe("video")
  })

  it("rejects formats the supplier player cannot decode", async () => {
    const { resourceTypeForMime } = await import("./campaign-creative-storage")
    expect(resourceTypeForMime("image/webp")).toBeNull()
    expect(resourceTypeForMime("video/webm")).toBeNull()
    expect(resourceTypeForMime("image/bmp")).toBeNull()
    expect(resourceTypeForMime("application/pdf")).toBeNull()
  })
})
