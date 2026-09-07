import { NextResponse } from "next/server"

import { jsonError, parseId, requireOpsPermissionAccess } from "@/lib/api-utils"
import { toCampaignDto } from "@/lib/campaign-dto"
import { getCustomerCompanyName } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("campaigns")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { creatives: { orderBy: { created_at: "asc" } } },
  })
  if (!campaign) return jsonError("Not found", 404)

  return NextResponse.json(
    toCampaignDto(campaign, undefined, await getCustomerCompanyName(campaign.clerk_user_id)),
  )
}
