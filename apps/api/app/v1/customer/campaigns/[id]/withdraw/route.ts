import { NextResponse } from "next/server"

import { canWithdrawCampaign, nairobiDay } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { toCampaignDto, toDayIso } from "@/lib/campaigns/campaign-dto"
import { CREATIVES_INCLUDE, getOwnedCampaign } from "@/lib/campaigns/campaign-store"
import { unspentBudgetKes } from "@/lib/payments/funding"
import { notifyCreditReleased } from "@/lib/payments/money-notify"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

/**
 * The advertiser pulls a campaign before it runs (rules: `canWithdrawCampaign`). It becomes
 * `cancelled`, a status change rather than a delete because it is part of the review record.
 * Its hold ends with it, so the unspent budget is available again straight away: no ledger row
 * moves, because a hold was never one. Needs campaigns:submit, the permission that commits spend.
 */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("campaigns:submit")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.orgId, id)
  if (!campaign) return jsonError("Not found", 404)

  const today = nairobiDay(new Date())
  const startsOn = campaign.starts_on ? toDayIso(campaign.starts_on) : null
  if (!canWithdrawCampaign({ status: campaign.status, starts_on: startsOn }, today)) {
    return jsonError(
      campaign.status === "approved"
        ? "This campaign has started, so it can't be withdrawn here. Contact support to stop it."
        : `A ${campaign.status.replace(/_/g, " ")} campaign can't be withdrawn`,
      409,
    )
  }

  // Conditional on the status just checked, so an ops approval landing at the same moment
  // can't be overwritten. Clears funded_at like a rejection: the money is no longer held.
  const { count } = await prisma.campaign.updateMany({
    where: { id, org_id: auth.access.orgId, status: campaign.status },
    data: { status: "cancelled", funded_at: null },
  })
  if (count === 0) return jsonError("The campaign changed while you were withdrawing it. Refresh and try again.", 409)

  const updated = await prisma.campaign.findUniqueOrThrow({ where: { id }, include: CREATIVES_INCLUDE })

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "campaign",
    entity_id: id,
    summary: `Campaign #${id} "${updated.name}" withdrawn by the advertiser (was ${campaign.status.replace(/_/g, " ")})`,
  })

  if (campaign.funded_at) {
    const released = await unspentBudgetKes(id, Number(campaign.budget_kes ?? 0))
    if (released > 0) {
      await notifyCreditReleased({
        orgId: auth.access.orgId,
        amountKes: released,
        campaign: { id, name: updated.name },
        reason: "cancelled",
      })
    }
  }

  return NextResponse.json(toCampaignDto(updated))
}
