import type { Campaign, CampaignCreative } from "@prisma/client"
import type {
  CampaignCreativeDto,
  CampaignDto,
  CampaignFlightPhase,
  CampaignListItemDto,
} from "@workspace/ops-contracts"

function formatDay(year: number, month1: number, day: number): string {
  return `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/**
 * `YYYY-MM-DD` from a Prisma `@db.Date` column.
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
 * `today` is injectable so tests don't depend on the wall clock.
 */
export function flightPhase(
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

export function toCampaignCreativeDto(creative: CampaignCreative): CampaignCreativeDto {
  return {
    id: creative.id,
    resource_type: creative.resource_type,
    content_type: creative.content_type,
    size_bytes: creative.size_bytes,
    width: creative.width,
    height: creative.height,
    // Prisma Decimal is not JSON-safe, so it crosses the wire as a string.
    duration_seconds: creative.duration_seconds?.toString() ?? null,
    original_filename: creative.original_filename,
    slot: creative.slot,
    created_at: creative.created_at.toISOString(),
  }
}

export function toCampaignDto(
  campaign: Campaign & { creatives: CampaignCreative[] },
  today?: Date,
): CampaignDto {
  return {
    id: campaign.id,
    name: campaign.name,
    objective: campaign.objective,
    market: campaign.market,
    corridors: campaign.corridors,
    format: campaign.format,
    notes: campaign.notes,
    budget_kes: campaign.budget_kes?.toString() ?? null,
    starts_on: campaign.starts_on ? toDayIso(campaign.starts_on) : null,
    ends_on: campaign.ends_on ? toDayIso(campaign.ends_on) : null,
    status: campaign.status,
    flight_phase: flightPhase(campaign.status, campaign.starts_on, campaign.ends_on, today),
    submitted_at: campaign.submitted_at?.toISOString() ?? null,
    reviewed_at: campaign.reviewed_at?.toISOString() ?? null,
    review_reason: campaign.review_reason,
    contact_name: campaign.contact_name,
    contact_email: campaign.contact_email,
    contact_phone: campaign.contact_phone,
    created_at: campaign.created_at.toISOString(),
    updated_at: campaign.updated_at.toISOString(),
    creatives: campaign.creatives.map(toCampaignCreativeDto),
  }
}

/** Flattened row for the ops campaigns table — the detail view fetches the
 * full CampaignDto separately, so this deliberately omits creatives, notes and
 * corridors. */
export function toCampaignListItemDto(
  campaign: Campaign & { _count: { creatives: number } },
  today?: Date,
): CampaignListItemDto {
  return {
    id: campaign.id,
    name: campaign.name,
    contact_email: campaign.contact_email,
    market: campaign.market,
    format: campaign.format,
    budget_kes: campaign.budget_kes?.toString() ?? null,
    starts_on: campaign.starts_on ? toDayIso(campaign.starts_on) : null,
    ends_on: campaign.ends_on ? toDayIso(campaign.ends_on) : null,
    status: campaign.status,
    flight_phase: flightPhase(campaign.status, campaign.starts_on, campaign.ends_on, today),
    creative_count: campaign._count.creatives,
    submitted_at: campaign.submitted_at?.toISOString() ?? null,
    created_at: campaign.created_at.toISOString(),
  }
}
