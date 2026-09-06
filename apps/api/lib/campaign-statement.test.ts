import type { Campaign } from "@prisma/client"
import { describe, expect, it } from "vitest"

import {
  buildBudgetStatement,
  buildProofOfPlay,
  flightDayCount,
  isActive,
} from "./campaign-statement"

/** A Prisma `@db.Date` value: UTC midnight of that calendar day. */
function dbDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

/** A wall-clock "now" with a real time of day, so a local-vs-UTC getter mix-up
 * in the day statuses shows up as an off-by-one. */
function at(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y!, m! - 1, d!, 14, 30)
}

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 1,
    name: "Kilimani Launch",
    market: "Kilimani",
    format: "taxi_top",
    status: "approved",
    starts_on: dbDate("2026-10-01"),
    ends_on: dbDate("2026-10-05"),
    budget_kes: 120_000,
    contact_email: "brand@example.com",
    ...overrides,
  } as unknown as Campaign
}

describe("flightDayCount", () => {
  it("counts inclusively — a same-day flight is one day", () => {
    expect(flightDayCount(dbDate("2026-10-01"), dbDate("2026-10-01"))).toBe(1)
    expect(flightDayCount(dbDate("2026-10-01"), dbDate("2026-10-05"))).toBe(5)
  })

  it("is zero when either end is missing or the window is inverted", () => {
    expect(flightDayCount(null, dbDate("2026-10-05"))).toBe(0)
    expect(flightDayCount(dbDate("2026-10-05"), null)).toBe(0)
    expect(flightDayCount(dbDate("2026-10-05"), dbDate("2026-10-01"))).toBe(0)
  })
})

describe("isActive", () => {
  it("counts approved flights that are live or still to come", () => {
    expect(isActive(campaign(), at("2026-10-03"))).toBe(true)
    expect(isActive(campaign(), at("2026-09-01"))).toBe(true)
  })

  it("excludes finished flights and anything not approved", () => {
    expect(isActive(campaign(), at("2026-11-01"))).toBe(false)
    expect(isActive(campaign({ status: "draft" }), at("2026-10-03"))).toBe(false)
    expect(isActive(campaign({ status: "submitted" }), at("2026-10-03"))).toBe(false)
  })
})

describe("buildBudgetStatement", () => {
  const options = { accountLabel: "brand@example.com", generatedAt: "6 Sep 2026" }

  it("totals every campaign in the totals row, and only active ones in the summary", () => {
    const statement = buildBudgetStatement(
      [
        campaign({ id: 1, budget_kes: 120_000 as never }),
        campaign({ id: 2, budget_kes: 80_000 as never, status: "draft" }),
        campaign({ id: 3, budget_kes: 50_000 as never, ends_on: dbDate("2026-09-30") }),
      ],
      { ...options, today: at("2026-10-03") },
    )

    expect(statement.totalsRow.at(-1)).toBe("KES 250,000")
    expect(statement.summary).toContainEqual({ label: "Active budget", value: "KES 120,000" })
    expect(statement.summary).toContainEqual({ label: "Active campaigns", value: "1 of 3" })
  })

  it("treats a campaign with no budget as zero without printing a zero", () => {
    const statement = buildBudgetStatement([campaign({ budget_kes: null })], {
      ...options,
      today: at("2026-10-03"),
    })
    expect(statement.rows[0]!.at(-1)).toBe("")
    expect(statement.totalsRow.at(-1)).toBe("KES 0")
  })

  it("keeps every row the same width as the header", () => {
    const statement = buildBudgetStatement([campaign(), campaign({ starts_on: null, ends_on: null })], {
      ...options,
      today: at("2026-10-03"),
    })
    for (const row of [...statement.rows, statement.totalsRow]) {
      expect(row).toHaveLength(statement.headers.length)
    }
  })
})

describe("buildProofOfPlay", () => {
  const options = { generatedAt: "6 Sep 2026", creativeCount: 2 }

  it("emits one row per flight day and only marks past days delivered", () => {
    const statement = buildProofOfPlay(campaign(), { ...options, today: at("2026-10-03") })

    expect(statement.rows).toHaveLength(5)
    expect(statement.rows.map((row) => row[0])).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
    ])
    expect(statement.rows.map((row) => row.at(-1))).toEqual([
      "Delivered",
      "Delivered",
      "In flight",
      "Scheduled",
      "Scheduled",
    ])
    expect(statement.totalsRow[1]).toBe("2 of 5 days")
    expect(statement.totalsRow.at(-1)).toBe("40%")
  })

  it("claims nothing delivered before the flight opens", () => {
    const statement = buildProofOfPlay(campaign(), { ...options, today: at("2026-09-01") })
    expect(statement.totalsRow[1]).toBe("0 of 5 days")
    expect(statement.rows.every((row) => row.at(-1) === "Scheduled")).toBe(true)
  })

  it("reports a finished flight as fully delivered", () => {
    const statement = buildProofOfPlay(campaign(), { ...options, today: at("2026-11-01") })
    expect(statement.totalsRow.at(-1)).toBe("100%")
  })

  it("keeps every row the same width as the header", () => {
    const statement = buildProofOfPlay(campaign(), { ...options, today: at("2026-10-03") })
    for (const row of [...statement.rows, statement.totalsRow]) {
      expect(row).toHaveLength(statement.headers.length)
    }
  })
})
