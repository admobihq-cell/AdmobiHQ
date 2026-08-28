import { subDays } from "date-fns"

import type { DateRangeKey } from "@workspace/ops-contracts"

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

type NamedCount = { name: string; value: number }

type OverviewRow = {
  leads: string
  fleet: string
  drivers: string
  waitlist: string
  media_kit: string
  budget_mix: NamedCount[] | null
  drivers_by_city: NamedCount[] | null
  fleet_by_city: NamedCount[] | null
  drivers_by_heard: NamedCount[] | null
}

export async function getOverviewStats(range: DateRangeKey = "30d") {
  const start = getDateRangeStart(range)
  const pool = getPgPool()

  const result = await pool.query<OverviewRow>(
    `
    WITH bounds AS (
      SELECT $1::timestamptz AS start
    ),
    lead_rows AS (
      SELECT budget_range
      FROM leads, bounds
      WHERE bounds.start IS NULL OR created_at >= bounds.start
    ),
    driver_rows AS (
      SELECT city, heard_about
      FROM drivers, bounds
      WHERE bounds.start IS NULL OR created_at >= bounds.start
    ),
    fleet_rows AS (
      SELECT city
      FROM fleet_partners, bounds
      WHERE bounds.start IS NULL OR created_at >= bounds.start
    )
    SELECT
      (SELECT COUNT(*)::text FROM lead_rows) AS leads,
      (SELECT COUNT(*)::text FROM fleet_rows) AS fleet,
      (SELECT COUNT(*)::text FROM driver_rows) AS drivers,
      (SELECT COUNT(*)::text FROM waitlist_entries, bounds
        WHERE bounds.start IS NULL OR created_at >= bounds.start) AS waitlist,
      (SELECT COUNT(*)::text FROM media_kit_requests, bounds
        WHERE bounds.start IS NULL OR created_at >= bounds.start) AS media_kit,
      (SELECT COALESCE(json_agg(json_build_object('name', COALESCE(budget_range, 'unknown'), 'value', c)), '[]'::json)
         FROM (SELECT budget_range, COUNT(*)::int AS c FROM lead_rows GROUP BY budget_range) s
      ) AS budget_mix,
      (SELECT COALESCE(json_agg(json_build_object('name', city, 'value', c)), '[]'::json)
         FROM (SELECT city, COUNT(*)::int AS c FROM driver_rows GROUP BY city) s
      ) AS drivers_by_city,
      (SELECT COALESCE(json_agg(json_build_object('name', city, 'value', c)), '[]'::json)
         FROM (SELECT city, COUNT(*)::int AS c FROM fleet_rows GROUP BY city) s
      ) AS fleet_by_city,
      (SELECT COALESCE(json_agg(json_build_object('name', heard_about, 'value', c)), '[]'::json)
         FROM (
           SELECT heard_about, COUNT(*)::int AS c
           FROM driver_rows
           WHERE heard_about IS NOT NULL
           GROUP BY heard_about
         ) s
      ) AS drivers_by_heard
    `,
    [start],
  )

  const row = result.rows[0]
  const leads = Number.parseInt(row?.leads ?? "0", 10)
  const fleet = Number.parseInt(row?.fleet ?? "0", 10)
  const drivers = Number.parseInt(row?.drivers ?? "0", 10)
  const waitlist = Number.parseInt(row?.waitlist ?? "0", 10)
  const mediaKit = Number.parseInt(row?.media_kit ?? "0", 10)

  return {
    totals: {
      all: leads + fleet + drivers + waitlist + mediaKit,
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
    budgetMix: row?.budget_mix ?? [],
    driversByCity: row?.drivers_by_city ?? [],
    fleetByCity: row?.fleet_by_city ?? [],
    driversByHeard: row?.drivers_by_heard ?? [],
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
