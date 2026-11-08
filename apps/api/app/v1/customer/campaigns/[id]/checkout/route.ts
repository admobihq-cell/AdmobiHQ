import { NextResponse } from "next/server"

import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import {
  EDITABLE_STATUSES,
  getOwnedCampaign,
  missingCampaignCreatives,
  missingCampaignFields,
} from "@/lib/campaigns/campaign-store"
import { availableKes, dueNowKes } from "@/lib/payments/funding"
import { payerEmail, startCheckout } from "@/lib/payments/start-checkout"
import { prisma } from "@/lib/prisma"
import { checkoutErrorResponse } from "@/lib/payments/checkout-errors"

type Params = { params: Promise<{ id: string }> }

/** Pay what the balance doesn't cover, then the webhook funds and submits (spec §5.1). */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("campaigns:submit")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.orgId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (!EDITABLE_STATUSES.has(campaign.status)) {
    return jsonError(`Campaign can't be paid for while status is "${campaign.status}"`, 409)
  }
  if (campaign.funded_at) return jsonError("Campaign is already funded", 409)

  const missingFields = missingCampaignFields(campaign)
  const missingCreatives = missingCampaignCreatives(
    campaign.format,
    campaign.creatives.map((creative) => creative.media_asset),
  )
  if (missingFields.length > 0 || missingCreatives.length > 0) {
    return jsonError("Campaign is incomplete", 400, { missingFields, missingCreatives })
  }

  // Display-grade read; settlePayment re-checks under the org lock.
  const available = await prisma.$transaction((tx) => availableKes(tx, auth.access.orgId))
  const dueKes = dueNowKes(Number(campaign.budget_kes ?? 0), available)
  if (dueKes === 0) {
    return NextResponse.json({ error: "Your balance already covers this campaign", dueKes: 0 }, { status: 409 })
  }

  const email = await payerEmail(auth.access.userId, auth.access.orgId)
  if (!email) return jsonError("Add an email address to your account before paying", 400)

  try {
    return NextResponse.json(
      await startCheckout({ orgId: auth.access.orgId, campaignId: id, amountKes: dueKes, userId: auth.access.userId, email }),
    )
  } catch (error) {
    return checkoutErrorResponse(error)
  }
}
