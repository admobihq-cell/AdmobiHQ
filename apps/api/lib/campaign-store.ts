import type { Campaign, CampaignCreative } from "@prisma/client"

import { checkCreativeDimensions, specsForFormat } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"

/** Statuses in which an advertiser may still change a campaign. Mirrors
 * EDITABLE_STATUSES in lib/driver-profile-store.ts. A campaign under review
 * ("submitted") is frozen so its content can't shift under the reviewer, and
 * an "approved" one is frozen so a flight can't be rewritten after sign-off —
 * both cases need ops to walk the status back first. */
export const EDITABLE_STATUSES = new Set(["draft", "changes_requested", "rejected"])

export type CampaignWithCreatives = Campaign & { creatives: CampaignCreative[] }

const CREATIVE_ORDER = { creatives: { orderBy: { created_at: "asc" } } } as const

/**
 * Returns the campaign only if this advertiser owns it, and null otherwise —
 * for both "no such campaign" and "someone else's campaign".
 *
 * Callers turn null into a 404, never a 403: a 403 would confirm that a given
 * id exists, letting anyone enumerate the campaign table. Same rule the driver
 * document routes follow.
 */
export async function getOwnedCampaign(
  clerkUserId: string,
  id: number,
): Promise<CampaignWithCreatives | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: CREATIVE_ORDER,
  })
  if (!campaign || campaign.clerk_user_id !== clerkUserId) return null
  return campaign
}

export function listOwnedCampaigns(clerkUserId: string): Promise<CampaignWithCreatives[]> {
  return prisma.campaign.findMany({
    where: { clerk_user_id: clerkUserId },
    orderBy: { created_at: "desc" },
    include: CREATIVE_ORDER,
  })
}

/**
 * Fields required before a campaign can move from an editable status to
 * "submitted". Returns the missing field names (empty = ready), matching
 * missingProfileFields' contract so the route can return the same
 * { missingFields, ... } 400 shape the driver submit route does.
 *
 * Deliberately NOT required: objective, corridors, notes, and the contact
 * fields. Those help the account manager but shouldn't block a submission —
 * ops can ask for them in review.
 */
export function missingCampaignFields(campaign: Campaign): string[] {
  const missing: string[] = []
  if (!campaign.name?.trim()) missing.push("name")
  if (!campaign.market) missing.push("market")
  if (!campaign.format) missing.push("format")
  if (campaign.budget_kes == null) missing.push("budget_kes")
  if (!campaign.starts_on) missing.push("starts_on")
  if (!campaign.ends_on) missing.push("ends_on")
  return missing
}

/**
 * Which panels still have no artwork.
 *
 * A "both" campaign runs on two physically different panels (3:1 taxi top and
 * 1:1 bike box), so one creative cannot satisfy it — each spec needs at least
 * one creative whose dimensions fit. Creatives are only stored after passing
 * the dimension check at upload, so matching on aspect ratio here is enough.
 *
 * Returns the labels of unsatisfied panels (empty = ready).
 */
export function missingCampaignCreatives(
  format: string,
  creatives: CampaignCreative[],
): string[] {
  const specs = specsForFormat(format as Parameters<typeof specsForFormat>[0])

  return specs
    .filter(
      (spec) =>
        !creatives.some(
          (creative) =>
            creative.width != null &&
            creative.height != null &&
            // Same checker the upload route gates on, so "accepted at upload"
            // and "counts toward submit" can never drift apart.
            checkCreativeDimensions(spec, creative.width, creative.height).ok,
        ),
    )
    .map((spec) => spec.label)
}
