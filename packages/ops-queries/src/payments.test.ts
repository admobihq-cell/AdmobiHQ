import { describe, expect, it } from "vitest"

import type { Db } from "./db"
import { countUnseenPayments, markPaymentsSeen } from "./finance"

const fake = (result: { rows: unknown[]; rowCount: number | null }) => {
  const sql: string[] = []
  const db: Db = { query: async (text) => (sql.push(text), result as never) }
  return { db, sql }
}

describe("countUnseenPayments", () => {
  it("counts settled payments ops has not seen", async () => {
    const { db, sql } = fake({ rows: [{ n: 3 }], rowCount: 1 })
    expect(await countUnseenPayments(db)).toBe(3)
    expect(sql[0]).toContain("status = 'success'")
    expect(sql[0]).toContain("ops_seen_at IS NULL")
  })

  it("is 0 when there are no rows", async () => {
    expect(await countUnseenPayments(fake({ rows: [], rowCount: 0 }).db)).toBe(0)
  })
})

describe("markPaymentsSeen", () => {
  it("stamps unseen settled payments and returns how many", async () => {
    const { db, sql } = fake({ rows: [], rowCount: 4 })
    expect(await markPaymentsSeen(db)).toBe(4)
    expect(sql[0]).toMatch(/^UPDATE payments SET ops_seen_at = now\(\)/)
  })

  it("returns 0 when the driver reports no row count", async () => {
    expect(await markPaymentsSeen(fake({ rows: [], rowCount: null }).db)).toBe(0)
  })
})
