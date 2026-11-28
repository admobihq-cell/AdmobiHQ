import { subDays } from "date-fns"
import { unstable_cache } from "next/cache"

import type { DateRangeKey } from "@workspace/ops-contracts"

import { getPgPool } from "@/lib/pg"
import { OPS_LIVE_TAG } from "@/lib/queries/live-tag"

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
  prev_leads: string | null
  prev_fleet: string | null
  prev_drivers: string | null
  prev_waitlist: string | null
  prev_media_kit: string | null
}

/** Counts per public form in the window just before this one; null for "all". */
const PREV = (table: string) =>
  `(SELECT COUNT(*)::text FROM ${table}, bounds
     WHERE bounds.prev_start IS NOT NULL AND created_at >= bounds.prev_start AND created_at < bounds.start)`

async function queryOverviewStats(range: DateRangeKey) {
  const start = getDateRangeStart(range)
  // The window of equal length that ends where this one starts.
  const prevStart = start ? new Date(2 * start.getTime() - Date.now()) : null
  const pool = getPgPool()

  const result = await pool.query<OverviewRow>(
    `
    WITH bounds AS (
      SELECT $1::timestamptz AS start, $2::timestamptz AS prev_start
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
      ) AS drivers_by_heard,
      ${PREV("leads")} AS prev_leads,
      ${PREV("fleet_partners")} AS prev_fleet,
      ${PREV("drivers")} AS prev_drivers,
      ${PREV("waitlist_entries")} AS prev_waitlist,
      ${PREV("media_kit_requests")} AS prev_media_kit
    `,
    [start, prevStart],
  )

  const row = result.rows[0]
  const leads = Number.parseInt(row?.leads ?? "0", 10)
  const fleet = Number.parseInt(row?.fleet ?? "0", 10)
  const drivers = Number.parseInt(row?.drivers ?? "0", 10)
  const waitlist = Number.parseInt(row?.waitlist ?? "0", 10)
  const mediaKit = Number.parseInt(row?.media_kit ?? "0", 10)
  const prev = (value: string | null | undefined) => Number.parseInt(value ?? "0", 10)

  return {
    totals: {
      all: leads + fleet + drivers + waitlist + mediaKit,
      leads,
      fleet,
      drivers,
      waitlist,
      mediaKit,
    },
    /** Same counts for the previous window of equal length; null for "all". */
    previous: prevStart
      ? {
          leads: prev(row?.prev_leads),
          fleet: prev(row?.prev_fleet),
          drivers: prev(row?.prev_drivers),
          waitlist: prev(row?.prev_waitlist),
          mediaKit: prev(row?.prev_media_kit),
        }
      : null,
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

export function getOverviewStats(range: DateRangeKey = "30d") {
  return unstable_cache(
    () => queryOverviewStats(range),
    ["ops-overview-stats-v2", range],
    { revalidate: 300, tags: [OPS_LIVE_TAG] },
  )()
}

async function querySubmissionsOverTime(days: number) {
  const start = subDays(new Date(), days)
  const pool = getPgPool()

  const result = await pool.query<{ day: string; count: string }>(
    `
    WITH combined AS (
      SELECT (created_at AT TIME ZONE 'Africa/Nairobi')::date AS day FROM leads WHERE created_at >= $1
      UNION ALL
      SELECT (created_at AT TIME ZONE 'Africa/Nairobi')::date FROM fleet_partners WHERE created_at >= $1
      UNION ALL
      SELECT (created_at AT TIME ZONE 'Africa/Nairobi')::date FROM drivers WHERE created_at >= $1
      UNION ALL
      SELECT (created_at AT TIME ZONE 'Africa/Nairobi')::date FROM waitlist_entries WHERE created_at >= $1
      UNION ALL
      SELECT (created_at AT TIME ZONE 'Africa/Nairobi')::date FROM media_kit_requests WHERE created_at >= $1
    ),
    -- Every day in the window, so a quiet day plots as 0 instead of the line skipping it.
    days AS (
      SELECT generate_series(
        ($1::timestamptz AT TIME ZONE 'Africa/Nairobi')::date,
        (now() AT TIME ZONE 'Africa/Nairobi')::date,
        interval '1 day'
      )::date AS day
    )
    SELECT days.day::text AS day, COUNT(combined.day)::text AS count
    FROM days LEFT JOIN combined ON combined.day = days.day
    GROUP BY days.day
    ORDER BY days.day ASC
    `,
    [start],
  )

  return result.rows.map((row) => ({
    day: row.day,
    count: Number.parseInt(row.count, 10),
  }))
}

export function getSubmissionsOverTime(days = 30) {
  return unstable_cache(
    () => querySubmissionsOverTime(days),
    ["ops-submissions-over-time-v2", String(days)],
    { revalidate: 300, tags: [OPS_LIVE_TAG] },
  )()
}
