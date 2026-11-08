import { describe, expect, it, vi } from "vitest"

let isAdmin = true

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn().mockResolvedValue({ access: { userId: "test-user" } }),
    requireOpsAdminAccess: vi.fn(async () =>
      isAdmin
        ? { access: { userId: "admin-user" } }
        : { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) },
    ),
  }
})

const adminExport = () =>
  new Request("http://localhost/v1/ops/documents/export", {
    method: "POST",
    body: JSON.stringify({ entity: "admin", title: "Team", headers: ["Name"], rows: [["A"]] }),
  })

describe("POST /v1/ops/documents/export", () => {
  // Cold-start (first Takumi WASM init + the full api-utils/auth/Prisma
  // import chain pulled in by vi.importActual below) has been observed
  // over the 5s default in CI — bump it rather than risk an intermittent
  // flake.
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
  }, 15000)

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

  it("lets an ops admin export with entity 'admin'", async () => {
    isAdmin = true
    const { POST } = await import("./route")
    const res = await POST(adminExport())
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
  }, 15000)

  it("refuses entity 'admin' to a non-admin", async () => {
    isAdmin = false
    const { POST } = await import("./route")
    const res = await POST(adminExport())
    expect(res.status).toBe(403)
  })
})
