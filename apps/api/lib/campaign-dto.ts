import type { Campaign, CampaignCreative } from "@prisma/client"
import { campaignFlightPhase, toDayIso } from "@workspace/ops-contracts"
import type {
  CampaignCreativeDto,
  CampaignDto,
  CampaignListItemDto,
} from "@workspace/ops-contracts"

/** Both live in contracts because apps/ops derives the same phase from its own
 * Prisma query when it renders the campaigns table server-side. Re-exported
 * under the names the campaign routes and tests already import. */
export { campaignFlightPhase as flightPhase, toDayIso }

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
    flight_phase: campaignFlightPhase(campaign.status, campaign.starts_on, campaign.ends_on, today),
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
    flight_phase: campaignFlightPhase(campaign.status, campaign.starts_on, campaign.ends_on, today),
    creative_count: campaign._count.creatives,
    submitted_at: campaign.submitted_at?.toISOString() ?? null,
    created_at: campaign.created_at.toISOString(),
  }
}
