// Run: npx tsx --test apps/ops/components/maps/demo-fleet/fleet.test.ts
import assert from "node:assert/strict"
import { test } from "node:test"

import {
  SLOT_SECONDS,
  VEHICLES,
  playAt,
  playLog,
  poseAt,
  routeCoords,
  tallyToday,
} from "./fleet"

const T = 1_791_000_000 // any fixed instant

test("active vehicles stay on their road and keep moving", () => {
  for (const v of VEHICLES.filter((x) => x.status === "active")) {
    const coords = routeCoords(v.corridor)
    const lngs = coords.map((c) => c[0])
    const lats = coords.map((c) => c[1])
    for (const dt of [0, 600, 3600, 86_400]) {
      const [lng, lat] = poseAt(v, T + dt).position
      assert.ok(lng >= Math.min(...lngs) - 1e-9 && lng <= Math.max(...lngs) + 1e-9, v.plate)
      assert.ok(lat >= Math.min(...lats) - 1e-9 && lat <= Math.max(...lats) + 1e-9, v.plate)
    }
    assert.notDeepEqual(poseAt(v, T).position, poseAt(v, T + 10).position, v.plate)
  }
})

test("parked and offline vehicles don't move", () => {
  for (const v of VEHICLES.filter((x) => x.status !== "active")) {
    assert.deepEqual(poseAt(v, T).position, poseAt(v, T + 600).position, v.plate)
  }
})

test("an ad holds for its whole slot, and the log lines up with the clock", () => {
  const v = VEHICLES[0]!
  const now = playAt(v, T)
  assert.equal(playAt(v, now.start).ad.id, now.ad.id)
  assert.equal(playAt(v, now.end - 0.01).ad.id, now.ad.id)
  const log = playLog(v, T, 4)
  log.forEach((p, i) => assert.equal(p.start, now.start - (i + 1) * SLOT_SECONDS))
})

test("one slot later, every vehicle has exactly one more play tallied", () => {
  const total = (t: number) =>
    Object.values(tallyToday(t)).reduce((n, c) => n + c.plays, 0)
  assert.equal(T % SLOT_SECONDS, 0)
  assert.equal(total(T + SLOT_SECONDS) - total(T), VEHICLES.length)
})
