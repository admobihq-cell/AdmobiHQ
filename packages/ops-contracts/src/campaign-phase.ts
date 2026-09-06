import type { CampaignFlightPhase } from "./enums"

function formatDay(year: number, month1: number, day: number): string {
  return `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * `YYYY-MM-DD` from a Postgres `DATE` column.
 *
 * Date columns come back pinned to UTC midnight, so the UTC getters are the
 * correct readers — `getFullYear()` and friends would shift the day for anyone
 * west of UTC.
 */
export function toDayIso(date: Date): string {
  return formatDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

/** Today's calendar date where the server is standing. Distinct from toDayIso:
 * a wall-clock "now" carries a real time of day, so it must be read with the
 * LOCAL getters to name the right day. */
function todayIso(now: Date): string {
  return formatDay(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

/**
 * Where a campaign sits in its flight, derived rather than stored.
 *
 * A persisted "live" would go stale the moment a date passed and would need a
 * cron to repair it; computing it on read is always correct and costs nothing.
 * Only approved campaigns have a flight at all — a submitted or rejected one
 * is "unscheduled" no matter what dates it carries, because nothing has been
 * agreed to run.
 *
 * This lives in contracts rather than beside the API's other DTO mappers
 * because there are two readers: apps/api serves the DTO over HTTP, and
 * apps/ops derives the same phase from its own Prisma query when it renders
 * the campaigns table server-side. Two copies would drift.
 *
 * `today` is injectable so tests don't depend on the wall clock.
 */
export function campaignFlightPhase(
  status: string,
  startsOn: Date | null,
  endsOn: Date | null,
  today: Date = new Date(),
): CampaignFlightPhase {
  if (status !== "approved") return "unscheduled"
  if (!startsOn || !endsOn) return "unscheduled"

  // Day strings compare correctly with < and >, so no date arithmetic is
  // needed. Kenya is UTC+3 year-round with no DST, so a single market can use
  // the server's day boundary; pass a tz through here if a second one lands.
  const now = todayIso(today)
  if (now < toDayIso(startsOn)) return "scheduled"
  if (now > toDayIso(endsOn)) return "completed"
  return "live"
}
