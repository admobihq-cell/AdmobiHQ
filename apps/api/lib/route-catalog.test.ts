import { describe, expect, it } from "vitest"

import { buildCatalog, discoverEndpoints } from "./route-catalog"

describe("route catalog", () => {
  const endpoints = discoverEndpoints()

  it("finds the route files and their methods", () => {
    expect(endpoints.length).toBeGreaterThan(100)
    expect(endpoints.filter((endpoint) => endpoint.methods.length === 0)).toEqual([])
    expect(endpoints.find((endpoint) => endpoint.path === "/v1/health")?.methods).toEqual(["GET"])
  })

  // A new route file fails here until it gets a note in route-catalog.ts,
  // which is what keeps the landing page describing every endpoint.
  it("has a note for every route", () => {
    expect(endpoints.filter((endpoint) => !endpoint.note).map((endpoint) => endpoint.path)).toEqual([])
  })

  it("places every route in exactly one audience", () => {
    const catalog = buildCatalog(endpoints)
    const listed = catalog.flatMap((audience) =>
      audience.resources.flatMap((resource) => resource.endpoints)
    )
    expect(listed).toHaveLength(endpoints.length)
    expect(catalog.find((audience) => audience.id === "system")?.count).toBe(2)
  })
})
