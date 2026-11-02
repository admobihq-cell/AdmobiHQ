import type { Campaign } from "@prisma/client"
import { campaignFlightPhase, toDayIso } from "@workspace/ops-contracts"
import type {
  CampaignCreativeDto,
  CampaignDto,
  CampaignListItemDto,
} from "@workspace/ops-contracts"

import type { CampaignCreativeWithAsset } from "@/lib/campaigns/campaign-store"

/** Both live in contracts because apps/ops derives the same phase from its own
 * Prisma query when it renders the campaigns table server-side. Re-exported
 * under the names the campaign routes and tests already import. */
export { campaignFlightPhase as flightPhase, toDayIso }

export function toCampaignCreativeDto(creative: CampaignCreativeWithAsset): CampaignCreativeDto {
  const asset = creative.media_asset
  return {
    id: creative.id,
    media_asset_id: asset.id,
    name: asset.name,
    resource_type: asset.resource_type,
    content_type: asset.content_type,
    size_bytes: asset.size_bytes,
    width: asset.width,
    height: asset.height,
    // Prisma Decimal is not JSON-safe, so it crosses the wire as a string.
    duration_seconds: asset.duration_seconds?.toString() ?? null,
    original_filename: asset.original_filename,
    slot: creative.slot,
    created_at: creative.created_at.toISOString(),
  }
}

export function toCampaignDto(
  campaign: Campaign & { creatives: CampaignCreativeWithAsset[] },
  today?: Date,
  /** Resolved from AdvertiserOrg via campaign.org_id by ops routes.
   * Customer-facing routes pass nothing — an advertiser knows their own company. */
  companyName?: string | null,
  /** Display name of the member who authored it, resolved from
   * campaign.clerk_user_id. Null for pre-org campaigns. */
  createdByName?: string | null,
): CampaignDto {
  return {
    id: campaign.id,
    name: campaign.name,
    company_name: companyName ?? null,
    org_id: campaign.org_id ?? null,
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
    created_by_name: createdByName ?? null,
    created_at: campaign.created_at.toISOString(),
    updated_at: campaign.updated_at.toISOString(),
    creatives: campaign.creatives.map(toCampaignCreativeDto),
  }
}

/** Flattened row for the ops campaigns table — the detail view fetches the
 * full CampaignDto separately, so this deliberately omits creatives, notes and
 * corridors. */
export function toCampaignListItemDto(
  campaign: Campaign & { _count: { creatives: number }; org: { name: string } | null },
  today?: Date,
): CampaignListItemDto {
  return {
    id: campaign.id,
    name: campaign.name,
    contact_email: campaign.contact_email,
    advertiser_org_name: campaign.org?.name?.trim() || null,
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
