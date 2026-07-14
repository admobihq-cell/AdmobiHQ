import { subDays } from "date-fns"

import type { DateRangeKey } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"
import { getPgPool } from "@/lib/pg"

export type { DateRangeKey }

export function getDateRangeStart(range: DateRangeKey): Date | null {
  const now = new Date()
  switch (range) {
    case "7d":
      return subDays(now, 7)
    case "30d":
      return subDays(now, 30)
    case "90d":
      return subDays(now, 90)
    case "all":
      return null
  }
}

function dateFilter(range: DateRangeKey) {
  const start = getDateRangeStart(range)
  return start ? { gte: start } : undefined
}

export async function getOverviewStats(range: DateRangeKey = "30d") {
  const createdAt = dateFilter(range)
  const where = createdAt ? { created_at: createdAt } : {}

  const [
    leads,
    fleet,
    drivers,
    waitlist,
    mediaKit,
    leadsByBudget,
    driversByCity,
    fleetByCity,
    driversByHeard,
  ] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.fleetPartner.count({ where }),
    prisma.driver.count({ where }),
    prisma.waitlistEntry.count({ where }),
    prisma.mediaKitRequest.count({ where }),
    prisma.lead.groupBy({
      by: ["budget_range"],
      where,
      _count: { id: true },
    }),
    prisma.driver.groupBy({
      by: ["city"],
      where,
      _count: { id: true },
    }),
    prisma.fleetPartner.groupBy({
      by: ["city"],
      where,
      _count: { id: true },
    }),
    prisma.driver.groupBy({
      by: ["heard_about"],
      where,
      _count: { id: true },
    }),
  ])

  const total = leads + fleet + drivers + waitlist + mediaKit

  return {
    totals: {
      all: total,
      leads,
      fleet,
      drivers,
      waitlist,
      mediaKit,
    },
    byType: [
      { name: "Campaign Leads", value: leads },
      { name: "Fleet Partners", value: fleet },
      { name: "Drivers", value: drivers },
      { name: "Waitlist", value: waitlist },
      { name: "Media Kit", value: mediaKit },
    ],
    budgetMix: leadsByBudget.map((b) => ({
      name: b.budget_range ?? "unknown",
      value: b._count.id,
    })),
    driversByCity: driversByCity.map((c) => ({
      name: c.city,
      value: c._count.id,
    })),
    fleetByCity: fleetByCity.map((c) => ({
      name: c.city,
      value: c._count.id,
    })),
    driversByHeard: driversByHeard
      .filter((h) => h.heard_about)
      .map((h) => ({
        name: h.heard_about!,
        value: h._count.id,
      })),
  }
}

export async function getSubmissionsOverTime(days = 30) {
  const start = subDays(new Date(), days)
  const pool = getPgPool()

  const result = await pool.query<{ day: string; count: string }>(
    `
    SELECT day::date::text AS day, COUNT(*)::text AS count
    FROM (
      SELECT date_trunc('day', created_at) AS day FROM leads WHERE created_at >= $1
      UNION ALL
      SELECT date_trunc('day', created_at) FROM fleet_partners WHERE created_at >= $1
      UNION ALL
      SELECT date_trunc('day', created_at) FROM drivers WHERE created_at >= $1
      UNION ALL
      SELECT date_trunc('day', created_at) FROM waitlist_entries WHERE created_at >= $1
      UNION ALL
      SELECT date_trunc('day', created_at) FROM media_kit_requests WHERE created_at >= $1
    ) combined
    GROUP BY day
    ORDER BY day ASC
    `,
    [start],
  )

  return result.rows.map((row) => ({
    day: row.day,
    count: Number.parseInt(row.count, 10),
  }))
}
