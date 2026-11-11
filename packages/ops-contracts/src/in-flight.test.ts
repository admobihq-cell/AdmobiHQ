import { describe, expect, it } from "vitest"

import { createInFlightGuard } from "./in-flight"

describe("createInFlightGuard", () => {
  it("lets the first tap through and turns away a second one that arrives before the first finishes", () => {
    const guard = createInFlightGuard()
    expect(guard.tryStart()).toBe(true)
    expect(guard.tryStart()).toBe(false)
    expect(guard.tryStart()).toBe(false)
  })

  it("lets someone try again once the first attempt has finished, success or failure", () => {
    const guard = createInFlightGuard()
    expect(guard.tryStart()).toBe(true)
    guard.finish()
    expect(guard.tryStart()).toBe(true)
  })

  it("keeps separate guards independent", () => {
    const refund = createInFlightGuard()
    const record = createInFlightGuard()
    expect(refund.tryStart()).toBe(true)
    expect(record.tryStart()).toBe(true)
  })

  it("treats a stray finish as harmless", () => {
    const guard = createInFlightGuard()
    guard.finish()
    expect(guard.tryStart()).toBe(true)
  })
})
