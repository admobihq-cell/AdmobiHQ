import { beforeAll, describe, expect, it, vi } from "vitest"

/**
 * Offline assertions on the SOS naming convention and the signed delivery URL,
 * following the idiom in private-media.test.ts. The upload/destroy paths hit
 * the network and are covered by the manual round-trip in the task's
 * verification step, not here.
 */

// A syntactically valid CLOUDINARY_URL so the SDK self-configures without
// reaching the network. Warmed in a hook with its own timeout because pulling
// in the Cloudinary SDK cold takes ~6s and would blow the 5s default on
// whichever test ran first.
beforeAll(async () => {
  process.env.CLOUDINARY_URL = "cloudinary://123456789012345:test-api-secret@test-cloud"
  vi.resetModules()
  await import("./incident-photo-storage")
}, 30_000)

describe("buildIncidentPhotoPublicId", () => {
  it("namespaces under safety-incidents/<id> so the Media Library groups them", async () => {
    const { buildIncidentPhotoPublicId } = await import("./incident-photo-storage")
    expect(buildIncidentPhotoPublicId(42, "abc-123")).toBe("safety-incidents/42/abc-123")
  })

  it("keeps each incident in its own folder", async () => {
    const { buildIncidentPhotoPublicId } = await import("./incident-photo-storage")
    const a = buildIncidentPhotoPublicId(1, "x")
    const b = buildIncidentPhotoPublicId(2, "x")
    expect(a).not.toBe(b)
  })
})

describe("fetchIncidentPhoto", () => {
  it("requests an authenticated, signed, width-capped image", async () => {
    const { cloudinary } = await import("@/lib/cloudinary")
    const spy = vi.spyOn(cloudinary, "url")
    // Make the fetch fail fast — we only care about the URL that was minted.
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 500 }))

    const { fetchIncidentPhoto } = await import("./incident-photo-storage")
    await fetchIncidentPhoto("safety-incidents/42/abc-123", "image/jpeg").catch(() => undefined)

    const url = spy.mock.results[0]?.value as string
    const options = spy.mock.calls[0]?.[1] as Record<string, unknown>

    expect(options.type).toBe("authenticated")
    expect(options.sign_url).toBe(true)
    expect(options.resource_type).toBe("image")
    expect(options.width).toBe(800)
    // Without this the SDK throws "Must supply sdk_semver" under Next's
    // bundled dev runtime.
    expect(options.analytics).toBe(false)
    expect(url).toContain("/authenticated/")

    spy.mockRestore()
    fetchSpy.mockRestore()
  })
})
