import { unstable_cache } from "next/cache"

import { resolveReportRange, type DailyPoint, type DateRangeKey, type NamedValue } from "@workspace/ops-contracts"

import { getPgPool } from "@/lib/pg"

/**
 * The ops Support & safety dashboard. The caller has already checked `support`. Incident data is
 * safety-sensitive: it is queried only when `includeSafety` is true and `safety` is null
 * otherwise, so a support-only role never receives it. The two variants are cached separately.
 *
 * There is deliberately no response-time figure: support_cases has no first-response or
 * resolved timestamp, and `updated_at` would lie.
 */

const NAIROBI = (col: string) => `(${col} AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi')::date`
const DAY_MS = 86_400_000
const num = (value: unknown) => (value == null ? 0 : Number(value))
const roundTo = (value: number) => Math.round(value * 10) / 10

async function rows<T extends object>(sql: string, params: unknown[]): Promise<T[]> {
  return (await getPgPool().query<T>(sql, params)).rows
}

/** Support: open means open or pending. Incidents: open means new, acknowledged or in progress. */
const SUPPORT_OPEN = `('open', 'pending')`
const INCIDENT_OPEN = `('new', 'acknowledged', 'in_progress')`

export type OldestCaseRow = {
  id: number
  subject: string
  category: string
  priority: string
  status: string
  orgName: string | null
  ageHours: number
}

export type SafetySummary = {
  openIncidents: number
  criticalIncidents: number
  byType: NamedValue[]
  bySeverity: NamedValue[]
}

export type SupportDashboardDto = {
  window: { start: string; end: string }
  openCases: number
  urgentOpen: number
  openedInRange: number
  casesTrend: DailyPoint[]
  byCategory: NamedValue[]
  oldestOpen: OldestCaseRow[]
  /** Null unless the viewer also holds `safety`. */
  safety: SafetySummary | null
}

export async function querySupport(range: DateRangeKey, includeSafety: boolean): Promise<SupportDashboardDto> {
  const w = resolveReportRange({ range }, new Date())
  const created = `${NAIROBI("s.created_at")} BETWEEN $1::date AND $2::date`

  const [open, opened, byDay, byCategory, oldest, safety] = await Promise.all([
    rows<{ open: number; urgent: number }>(
      `SELECT COUNT(*) FILTER (WHERE status IN ${SUPPORT_OPEN})::int AS open,
              COUNT(*) FILTER (WHERE status IN ${SUPPORT_OPEN} AND priority = 'urgent')::int AS urgent
       FROM support_cases`,
      []
    ),
    rows<{ n: number }>(`SELECT COUNT(*)::int AS n FROM support_cases s WHERE ${created}`, [w.start, w.end]),
    rows<{ day: string; n: number }>(
      `SELECT ${NAIROBI("s.created_at")}::text AS day, COUNT(*)::int AS n FROM support_cases s WHERE ${created} GROUP BY 1`,
      [w.start, w.end]
    ),
    rows<{ category: string; n: number }>(
      `SELECT s.category, COUNT(*)::int AS n FROM support_cases s WHERE ${created} GROUP BY 1 ORDER BY 2 DESC`,
      [w.start, w.end]
    ),
    rows<{ id: number; subject: string; category: string; priority: string; status: string; org_name: string | null; hours: number }>(
      `SELECT s.id, s.subject, s.category, s.priority, s.status, o.name AS org_name,
              (EXTRACT(EPOCH FROM (now() AT TIME ZONE 'UTC' - s.created_at)) / 3600)::float8 AS hours
       FROM support_cases s LEFT JOIN advertiser_orgs o ON o.id = s.org_id
       WHERE s.status IN ${SUPPORT_OPEN} ORDER BY s.created_at ASC LIMIT 20`,
      []
    ),
    includeSafety ? querySafety() : Promise.resolve(null),
  ])

  const perDay = new Map(byDay.map((d) => [d.day, num(d.n)]))
  const start = range === "all" ? ([...perDay.keys()].sort()[0] ?? w.end) : w.start
  const trend: DailyPoint[] = []
  for (let ms = Date.parse(start); ms <= Date.parse(w.end); ms += DAY_MS) {
    const day = new Date(ms).toISOString().slice(0, 10)
    trend.push({ day, opened: perDay.get(day) ?? 0 })
  }

  return {
    window: { start, end: w.end },
    openCases: num(open[0]?.open),
    urgentOpen: num(open[0]?.urgent),
    openedInRange: num(opened[0]?.n),
    casesTrend: trend,
    byCategory: byCategory.map((c) => ({ name: c.category, value: num(c.n) })),
    oldestOpen: oldest.map((o) => ({
      id: o.id,
      subject: o.subject,
      category: o.category,
      priority: o.priority,
      status: o.status,
      orgName: o.org_name,
      ageHours: roundTo(num(o.hours)),
    })),
    safety,
  }
}

async function querySafety(): Promise<SafetySummary> {
  const [totals, byType, bySeverity] = await Promise.all([
    rows<{ open: number; critical: number }>(
      `SELECT COUNT(*) FILTER (WHERE status IN ${INCIDENT_OPEN})::int AS open,
              COUNT(*) FILTER (WHERE status IN ${INCIDENT_OPEN} AND severity = 'critical')::int AS critical
       FROM safety_incidents`,
      []
    ),
    rows<{ type: string; n: number }>(
      `SELECT type, COUNT(*)::int AS n FROM safety_incidents WHERE status IN ${INCIDENT_OPEN} GROUP BY 1 ORDER BY 2 DESC`,
      []
    ),
    rows<{ severity: string; n: number }>(
      `SELECT severity, COUNT(*)::int AS n FROM safety_incidents WHERE status IN ${INCIDENT_OPEN} GROUP BY 1`,
      []
    ),
  ])
  return {
    openIncidents: num(totals[0]?.open),
    criticalIncidents: num(totals[0]?.critical),
    byType: byType.map((t) => ({ name: t.type, value: num(t.n) })),
    bySeverity: bySeverity.map((s) => ({ name: s.severity, value: num(s.n) })),
  }
}

export const getSupport = (range: DateRangeKey, includeSafety: boolean) =>
  unstable_cache(() => querySupport(range, includeSafety), ["ops-support", range, includeSafety ? "safety" : "no-safety"], {
    revalidate: 300,
  })()
