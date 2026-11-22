// Run: npx tsx --test apps/ops/components/overview/overview-scope.test.ts
import assert from "node:assert/strict"
import { test } from "node:test"

import { scopeSubmissions } from "./overview-scope"

const overview = {
  totals: { leads: 1, fleet: 2, drivers: 4, waitlist: 8, mediaKit: 16 },
  byType: [
    { name: "Campaign Leads", value: 1 },
    { name: "Fleet Partners", value: 2 },
    { name: "Drivers", value: 4 },
    { name: "Waitlist", value: 8 },
    { name: "Media Kit", value: 16 },
  ],
  budgetMix: [{ name: "50k+", value: 1 }],
  driversByCity: [{ name: "Nairobi", value: 4 }],
}

test("a support-only viewer sees no submissions at all", () => {
  assert.equal(scopeSubmissions(overview, (p) => p === "support"), null)
})

test("a drivers-only viewer sees only driver numbers", () => {
  const scoped = scopeSubmissions(overview, (p) => p === "drivers")
  assert.deepEqual(
    scoped?.forms.map((f) => ({ key: f.key, value: f.value })),
    [{ key: "drivers", value: 4 }],
  )
  assert.equal(scoped?.total, 4)
  assert.deepEqual(scoped?.byType, [{ name: "Drivers", value: 4 }])
  assert.equal(scoped?.budgetMix, null)
  assert.deepEqual(scoped?.driversByCity, overview.driversByCity)
})

test("a viewer with every form sees everything", () => {
  const scoped = scopeSubmissions(overview, () => true)
  assert.equal(scoped?.total, 31)
  assert.equal(scoped?.byType.length, 5)
})

test("each form compares against the previous window when there is one", () => {
  const withPrev = { ...overview, previous: { leads: 2, fleet: 2, drivers: 2, waitlist: 8, mediaKit: 16 } }
  const scoped = scopeSubmissions(withPrev, () => true)
  assert.equal(scoped?.forms.find((f) => f.key === "leads")?.delta.change, -50)
  assert.equal(scoped?.forms.find((f) => f.key === "drivers")?.delta.change, 100)
  assert.equal(scopeSubmissions(overview, () => true)?.forms[0]?.delta.change, null)
})
