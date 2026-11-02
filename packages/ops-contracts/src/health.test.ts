import { describe, expect, it } from "vitest"

import {
  accountHealth,
  campaignHealth,
  fundingStatus,
  type AccountHealthInput,
  type CampaignHealthInput,
} from "./health"

function base(overrides: Partial<CampaignHealthInput> = {}): CampaignHealthInput {
  return {
    status: "approved",
    startsOn: "2026-10-01",
    endsOn: "2026-12-31",
    today: "2026-11-01",
    hasCreative: true,
    deliveryRate: 1,
    daysIntoFlight: 31,
    ...overrides,
  }
}

describe("fundingStatus", () => {
  it("is untracked with no ledger rows, whatever the balance", () => {
    expect(
      fundingStatus({ hasLedgerRows: false, availableKes: -5000, runwayDays: null }).level
    ).toBe("untracked")
  })

  it("is short when available drops below zero", () => {
    const status = fundingStatus({ hasLedgerRows: true, availableKes: -1, runwayDays: null })
    expect(status.level).toBe("short")
    expect(status.nextAction).toBe("Top up")
  })

  it("is low under 14 days of runway", () => {
    expect(fundingStatus({ hasLedgerRows: true, availableKes: 100, runwayDays: 5 }).level).toBe(
      "low"
    )
    expect(fundingStatus({ hasLedgerRows: true, availableKes: 100, runwayDays: 14 }).level).toBe(
      "healthy"
    )
  })

  it("is healthy with no spending to measure runway against", () => {
    expect(fundingStatus({ hasLedgerRows: true, availableKes: 100, runwayDays: null }).level).toBe(
      "healthy"
    )
  })
})

describe("campaignHealth", () => {
  it("needs action when rejected or changes are requested", () => {
    expect(campaignHealth(base({ status: "changes_requested" })).level).toBe("action_needed")
    const rejected = campaignHealth(base({ status: "rejected" }))
    expect(rejected.level).toBe("action_needed")
    expect(rejected.nextAction).toBe("Open the review reason")
  })

  it("is at risk when it starts within 7 days with no creative", () => {
    const health = campaignHealth(
      base({ startsOn: "2026-11-05", hasCreative: false, deliveryRate: null, daysIntoFlight: 0 })
    )
    expect(health.level).toBe("at_risk")
    expect(health.nextAction).toBe("Add creative")
    expect(
      campaignHealth(
        base({ startsOn: "2026-11-20", hasCreative: false, deliveryRate: null, daysIntoFlight: 0 })
      ).level
    ).toBe("on_track")
  })

  it("skips the delivery rules with no delivery rows", () => {
    expect(campaignHealth(base({ deliveryRate: null, daysIntoFlight: 10 })).level).toBe("on_track")
  })

  it("waits 3 days into the flight before judging delivery", () => {
    expect(campaignHealth(base({ deliveryRate: 0.7, daysIntoFlight: 2 })).level).toBe("on_track")
    expect(campaignHealth(base({ deliveryRate: 0.7, daysIntoFlight: 3 })).level).toBe("at_risk")
  })

  it("watches delivery between 80% and 95%", () => {
    expect(campaignHealth(base({ deliveryRate: 0.9, daysIntoFlight: 5 })).level).toBe("watch")
    expect(campaignHealth(base({ deliveryRate: 0.8, daysIntoFlight: 5 })).level).toBe("watch")
    expect(campaignHealth(base({ deliveryRate: 0.95, daysIntoFlight: 5 })).level).toBe("on_track")
  })

  it("watches a campaign ending within 7 days", () => {
    const health = campaignHealth(base({ endsOn: "2026-11-06" }))
    expect(health.level).toBe("watch")
    expect(health.nextAction).toBe("Extend or plan the next flight")
  })

  it("first match wins", () => {
    expect(
      campaignHealth(base({ status: "rejected", deliveryRate: 0.5, endsOn: "2026-11-02" })).level
    ).toBe("action_needed")
    expect(campaignHealth(base({ deliveryRate: 0.5, endsOn: "2026-11-02" })).level).toBe("at_risk")
  })

  it("is on track otherwise, with no next action", () => {
    expect(campaignHealth(base())).toEqual({
      level: "on_track",
      reason: "On track",
      nextAction: null,
    })
  })
})

describe("accountHealth", () => {
  function account(overrides: Partial<AccountHealthInput> = {}): AccountHealthInput {
    return {
      rejectedCampaigns: 0,
      daysSinceLastCampaign: 10,
      hasFinances: true,
      funding: "healthy",
      spendKes: 1000,
      previousSpendKes: 1000,
      ...overrides,
    }
  }

  it("flags repeated rejection first", () => {
    const health = accountHealth(account({ rejectedCampaigns: 2, funding: "short" }))
    expect(health.level).toBe("at_risk")
    expect(health.blocker).toBe("rejected_repeatedly")
  })

  it("flags short funding only with finances", () => {
    expect(accountHealth(account({ funding: "short" })).blocker).toBe("short_of_funds")
    expect(accountHealth(account({ funding: "short", hasFinances: false })).blocker).toBeNull()
  })

  it("flags an account with no campaign in 60 days", () => {
    expect(accountHealth(account({ daysSinceLastCampaign: 60 })).blocker).toBe("dormant")
    expect(accountHealth(account({ daysSinceLastCampaign: 59 })).blocker).toBeNull()
  })

  it("flags spend down over 50% only with finances", () => {
    expect(accountHealth(account({ spendKes: 400 })).blocker).toBe("spend_down")
    expect(accountHealth(account({ spendKes: 500 })).blocker).toBeNull()
    expect(accountHealth(account({ spendKes: 400, hasFinances: false })).blocker).toBeNull()
    expect(accountHealth(account({ spendKes: 0, previousSpendKes: 0 })).blocker).toBeNull()
  })

  it("is healthy otherwise", () => {
    expect(accountHealth(account())).toEqual({
      level: "healthy",
      blocker: null,
      reason: "No blockers",
      nextAction: null,
    })
  })
})
