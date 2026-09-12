import { NextResponse } from "next/server"

import { campaignCreateSchema } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { toCampaignDto } from "@/lib/campaign-dto"
import { listOwnedCampaigns } from "@/lib/campaign-store"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const auth = await requireCustomerPermissionAccess("campaigns:read")
  if (auth.error) return auth.error

  const campaigns = await listOwnedCampaigns(auth.access.orgId)
  return NextResponse.json(campaigns.map((campaign) => toCampaignDto(campaign)))
}

/** Creates a draft. The wizard calls this once, after its first step, then
 * PATCHes each subsequent step — so a half-finished campaign survives a
 * refresh rather than living in component state. */
export async function POST(req: Request) {
  const auth = await requireCustomerPermissionAccess("campaigns:write")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, campaignCreateSchema)
  if ("error" in parsed) return parsed.error
  const { starts_on, ends_on, ...rest } = parsed.data

  const created = await prisma.campaign.create({
    data: {
      ...rest,
      clerk_user_id: auth.access.userId,
      org_id: auth.access.orgId,
      // @db.Date columns take a Date; the schema guarantees YYYY-MM-DD, and
      // appending Z keeps the stored day from shifting under a server whose
      // local zone is behind UTC.
      starts_on: starts_on ? new Date(`${starts_on}T00:00:00Z`) : null,
      ends_on: ends_on ? new Date(`${ends_on}T00:00:00Z`) : null,
    },
    include: { creatives: true },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "campaign",
    entity_id: created.id,
    summary: `Campaign #${created.id} "${created.name}" created`,
  })

  return NextResponse.json(toCampaignDto(created), { status: 201 })
}
