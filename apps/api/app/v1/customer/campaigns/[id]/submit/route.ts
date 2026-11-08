import { NextResponse } from "next/server"

import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { toCampaignDto } from "@/lib/campaigns/campaign-dto"
import {
  EDITABLE_STATUSES,
  getOwnedCampaign,
  missingCampaignCreatives,
  missingCampaignFields,
} from "@/lib/campaigns/campaign-store"
import { announceCampaignSubmitted, markCampaignSubmitted } from "@/lib/campaigns/submit-campaign"
import { availableKes, dueNowKes } from "@/lib/payments/funding"
import { fundFromBalance } from "@/lib/payments/settle-payment"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("campaigns:submit")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.orgId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return jsonError(`Campaign can't be submitted while status is "${campaign.status}"`, 409)
  }

  const missingFields = missingCampaignFields(campaign)
  const missingCreatives = missingCampaignCreatives(
    campaign.format,
    campaign.creatives.map((creative) => creative.media_asset),
  )
  if (missingFields.length > 0 || missingCreatives.length > 0) {
    return jsonError("Campaign is incomplete", 400, { missingFields, missingCreatives })
  }

  // Pay at submission (spec §5.1): an unfunded campaign is funded from the
  // balance and submitted in one transaction, or refused with what's due.
  // An already-funded one (a resubmit after changes) just submits.
  let updated
  if (campaign.funded_at) {
    updated = await markCampaignSubmitted(prisma, id)
  } else {
    const funded = await prisma.$transaction(
      async (tx) => {
        if (!(await fundFromBalance(tx, campaign))) {
          return { dueKes: dueNowKes(Number(campaign.budget_kes ?? 0), await availableKes(tx, auth.access.orgId)) }
        }
        return { campaign: await markCampaignSubmitted(tx, id) }
      },
      { maxWait: 10_000, timeout: 20_000 },
    )
    if (!funded.campaign) {
      return NextResponse.json({ error: "Payment required", dueKes: funded.dueKes }, { status: 402 })
    }
    updated = funded.campaign
  }

  await announceCampaignSubmitted(updated, { userId: auth.access.userId })

  return NextResponse.json(toCampaignDto(updated))
}
