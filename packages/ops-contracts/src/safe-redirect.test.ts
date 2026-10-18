import { describe, expect, it } from "vitest"

import { safeRedirectPath } from "./safe-redirect"

describe("safeRedirectPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeRedirectPath("/invitations/abc")).toBe("/invitations/abc")
    expect(safeRedirectPath("/campaigns?tab=draft")).toBe("/campaigns?tab=draft")
  })

  it("falls back to / for anything that could leave the origin", () => {
    for (const bad of [
      null,
      undefined,
      "",
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "javascript:alert(1)",
    ]) {
      expect(safeRedirectPath(bad)).toBe("/")
    }
  })
})
