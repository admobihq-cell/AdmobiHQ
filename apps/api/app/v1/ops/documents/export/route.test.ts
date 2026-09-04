import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn().mockResolvedValue({ access: { userId: "test-user" } }),
  }
})

describe("POST /v1/ops/documents/export", () => {
  it("returns a PDF for a valid request body", async () => {
    const { POST } = await import("./route")
    const req = new Request("http://localhost/v1/ops/documents/export", {
      method: "POST",
      body: JSON.stringify({
        entity: "drivers",
        title: "Drivers",
        headers: ["Name", "City"],
        rows: [["Amina", "Nairobi"]],
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes.length).toBeGreaterThan(0)
  })

  it("rejects a body with an unknown entity", async () => {
    const { POST } = await import("./route")
    const req = new Request("http://localhost/v1/ops/documents/export", {
      method: "POST",
      body: JSON.stringify({
        entity: "not_a_real_permission",
        title: "Drivers",
        headers: ["Name"],
        rows: [["Amina"]],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
