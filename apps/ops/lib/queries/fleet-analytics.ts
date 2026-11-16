import { unstable_cache } from "next/cache"

import {
  rate,
  resolveReportRange,
  type DailyPoint,
  type DateRangeKey,
  type NamedValue,
} from "@workspace/ops-contracts"

import { getPgPool } from "@/lib/pg"

/**
 * The ops Fleet dashboard. The caller has already checked `drivers`. Payouts are money: the
 * `money` block is only queried when `includeMoney` is true and is absent from the result
 * otherwise, so a viewer without `finances` never receives it. The two variants are cached
 * under separate keys.
 *
 * CRM `drivers` (a lead list with its own status) and `driver_profiles` (the application
 * workflow) are different lifecycles: the funnel reads profiles, "active drivers" reads the CRM.
 */

const NAIROBI = (col: string) => `(${col} AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date`
const DAY_MS = 86_400_000
const num = (value: unknown) => (value == null ? 0 : Number(value))
const roundTo = (value: number, places = 1) => Math.round(value * 10 ** places) / 10 ** places

async function rows<T extends object>(sql: string, params: unknown[]): Promise<T[]> {
  return (await getPgPool().query<T>(sql, params)).rows
}

export type FleetQueueRow = { id: number; name: string; city: string | null; waitingHours: number }

export type FleetMoney = {
  payoutsPendingKes: number
  payoutsByMonth: { period: string; settledKes: number; pendingKes: number; failedKes: number }[]
  topDrivers: NamedValue[]
  failedPayouts: { id: number; driverName: string; amountKes: number; period: string }[]
}

export type FleetDashboardDto = {
  window: { start: string; end: string }
  activeDrivers: number
  totalDrivers: number
  pendingApplications: number
  approvalRate: number | null
  avgActiveVehicles: number | null
  vehicleHours: number
  funnel: { label: string; value: number }[]
  driversByCity: NamedValue[]
  vehiclesTrend: DailyPoint[]
  queue: FleetQueueRow[]
  /** Present only when the viewer holds `finances`. */
  money?: FleetMoney
}

export async function queryFleet(range: DateRangeKey, includeMoney: boolean): Promise<FleetDashboardDto> {
  const w = resolveReportRange({ range }, new Date())
  const profileIn = `${NAIROBI("p.created_at")} BETWEEN $1::date AND $2::date`

  const [drivers, apps, reviews, funnel, byCity, vehicles, hours, queue] = await Promise.all([
    rows<{ active: number; total: number }>(
      `SELECT COUNT(*) FILTER (WHERE status = 'active')::int AS active, COUNT(*)::int AS total FROM drivers WHERE deleted_at IS NULL`,
      []
    ),
    rows<{ n: number }>(`SELECT COUNT(*)::int AS n FROM driver_profiles WHERE status = 'submitted'`, []),
    rows<{ approved: number; rejected: number }>(
      `SELECT COUNT(*) FILTER (WHERE p.status = 'approved')::int AS approved,
              COUNT(*) FILTER (WHERE p.status = 'rejected')::int AS rejected
       FROM driver_profiles p WHERE p.reviewed_at IS NOT NULL AND ${NAIROBI("p.reviewed_at")} BETWEEN $1::date AND $2::date`,
      [w.start, w.end]
    ),
    rows<{ started: number; submitted: number; approved: number }>(
      `SELECT COUNT(*)::int AS started,
              COUNT(*) FILTER (WHERE p.submitted_at IS NOT NULL)::int AS submitted,
              COUNT(*) FILTER (WHERE p.status = 'approved')::int AS approved
       FROM driver_profiles p WHERE ${profileIn}`,
      [w.start, w.end]
    ),
    rows<{ city: string; n: number }>(
      `SELECT city, COUNT(*)::int AS n FROM drivers WHERE deleted_at IS NULL GROUP BY 1 ORDER BY 2 DESC`,
      []
    ),
    // ponytail: busiest daypart per campaign per day, summed across campaigns. A vehicle that runs
    // two campaigns the same day counts twice until telemetry gives vehicle-level data.
    rows<{ day: string; vehicles: number }>(
      `WITH per_daypart AS (
         SELECT campaign_id, day, daypart, SUM(active_vehicles) AS dv FROM campaign_daily_stats
         WHERE day BETWEEN $1::date AND $2::date GROUP BY 1, 2, 3
       ), per_campaign AS (SELECT campaign_id, day, MAX(dv) AS mv FROM per_daypart GROUP BY 1, 2)
       SELECT day::text AS day, SUM(mv)::float8 AS vehicles FROM per_campaign GROUP BY 1 ORDER BY 1`,
      [w.start, w.end]
    ),
    rows<{ hours: number }>(
      `SELECT COALESCE(SUM(vehicle_hours), 0)::float8 AS hours FROM campaign_daily_stats WHERE day BETWEEN $1::date AND $2::date`,
      [w.start, w.end]
    ),
    rows<{ id: number; full_name: string | null; city: string | null; hours: number }>(
      `SELECT p.id, p.full_name, p.city, (EXTRACT(EPOCH FROM (now() AT TIME ZONE 'UTC' - p.submitted_at)) / 3600)::float8 AS hours
       FROM driver_profiles p WHERE p.status = 'submitted' AND p.submitted_at IS NOT NULL
       ORDER BY p.submitted_at ASC LIMIT 20`,
      []
    ),
  ])

  const vehicleDays = new Map(vehicles.map((v) => [v.day, num(v.vehicles)]))
  const trendStart = range === "all" ? ([...vehicleDays.keys()].sort()[0] ?? w.end) : w.start
  const trend: DailyPoint[] = []
  for (let ms = Date.parse(trendStart); ms <= Date.parse(w.end); ms += DAY_MS) {
    const day = new Date(ms).toISOString().slice(0, 10)
    trend.push({ day, vehicles: vehicleDays.get(day) ?? 0 })
  }
  const f = funnel[0]
  const r = reviews[0]

  const dto: FleetDashboardDto = {
    window: { start: trendStart, end: w.end },
    activeDrivers: num(drivers[0]?.active),
    totalDrivers: num(drivers[0]?.total),
    pendingApplications: num(apps[0]?.n),
    approvalRate: rate(num(r?.approved), num(r?.approved) + num(r?.rejected) || null),
    avgActiveVehicles: vehicleDays.size ? roundTo([...vehicleDays.values()].reduce((a, b) => a + b, 0) / vehicleDays.size) : null,
    vehicleHours: roundTo(num(hours[0]?.hours)),
    funnel: [
      { label: "Started", value: num(f?.started) },
      { label: "Submitted", value: num(f?.submitted) },
      { label: "Approved", value: num(f?.approved) },
    ],
    driversByCity: byCity.map((c) => ({ name: c.city, value: num(c.n) })),
    vehiclesTrend: trend,
    queue: queue.map((q) => ({ id: q.id, name: q.full_name ?? "Unnamed applicant", city: q.city, waitingHours: roundTo(num(q.hours)) })),
  }
  if (!includeMoney) return dto

  const inMonths = `p.period_month >= date_trunc('month', $1::date) AND p.period_month <= $2::date`
  const [pending, byMonth, top, failed] = await Promise.all([
    rows<{ total: number }>(`SELECT COALESCE(SUM(amount_kes), 0)::float8 AS total FROM payouts WHERE status = 'pending'`, []),
    rows<{ period: string; settled: number; pending: number; failed: number }>(
      `SELECT to_char(p.period_month, 'YYYY-MM') AS period,
         COALESCE(SUM(p.amount_kes) FILTER (WHERE p.status = 'settled'), 0)::float8 AS settled,
         COALESCE(SUM(p.amount_kes) FILTER (WHERE p.status = 'pending'), 0)::float8 AS pending,
         COALESCE(SUM(p.amount_kes) FILTER (WHERE p.status = 'failed'), 0)::float8 AS failed
       FROM payouts p WHERE ${inMonths} GROUP BY 1 ORDER BY 1`,
      [w.start, w.end]
    ),
    rows<{ name: string | null; total: number }>(
      `SELECT d.name, SUM(p.amount_kes)::float8 AS total FROM payouts p LEFT JOIN drivers d ON d.id = p.driver_id
       WHERE p.status = 'settled' AND ${inMonths} GROUP BY d.name ORDER BY 2 DESC LIMIT 8`,
      [w.start, w.end]
    ),
    rows<{ id: number; name: string | null; amount: number; period: string }>(
      `SELECT p.id, d.name, p.amount_kes::float8 AS amount, to_char(p.period_month, 'YYYY-MM') AS period
       FROM payouts p LEFT JOIN drivers d ON d.id = p.driver_id WHERE p.status = 'failed' ORDER BY p.period_month DESC, p.id DESC LIMIT 20`,
      []
    ),
  ])
  dto.money = {
    payoutsPendingKes: roundTo(num(pending[0]?.total), 2),
    payoutsByMonth: byMonth.map((m) => ({
      period: m.period,
      settledKes: roundTo(num(m.settled), 2),
      pendingKes: roundTo(num(m.pending), 2),
      failedKes: roundTo(num(m.failed), 2),
    })),
    topDrivers: top.map((t) => ({ name: t.name ?? "Removed driver", value: roundTo(num(t.total), 2) })),
    failedPayouts: failed.map((p) => ({ id: p.id, driverName: p.name ?? "Removed driver", amountKes: roundTo(num(p.amount), 2), period: p.period })),
  }
  return dto
}

export const getFleet = (range: DateRangeKey, includeMoney: boolean) =>
  unstable_cache(() => queryFleet(range, includeMoney), ["ops-fleet", range, includeMoney ? "money" : "no-money"], { revalidate: 300 })()
