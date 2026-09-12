import { NextResponse } from "next/server"

import { auditFromCustomerUser } from "@/lib/audit"
import { countOrgOwners } from "@/lib/advertiser-org"
import { jsonError, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { invalidateAdvertiserAccessCache } from "@/lib/customer-auth"
import { prisma } from "@/lib/prisma"

/**
 * Deletes the advertiser org (cascades members/invites/custom roles).
 * Campaigns are detached (org_id null) and retained for the ops record.
 * Sole-admin path when transfer is not desired.
 */
export async function POST() {
  const auth = await requireCustomerPermissionAccess("org:manage")
  if (auth.error) return auth.error
  if (!auth.access.isOwner) return jsonError("Only an admin can delete the organization", 403)

  const owners = await countOrgOwners(auth.access.orgId)
  if (owners !== 1) {
    return jsonError("Transfer admin or remove other admins first", 409)
  }

  const memberIds = await prisma.advertiserMember.findMany({
    where: { org_id: auth.access.orgId },
    select: { clerk_user_id: true },
  })

  await prisma.$transaction(async (tx) => {
    await tx.campaign.updateMany({
      where: { org_id: auth.access.orgId },
      data: { org_id: null },
    })
    await tx.supportCase.updateMany({
      where: { org_id: auth.access.orgId },
      data: { org_id: null },
    })
    await tx.advertiserOrg.delete({ where: { id: auth.access.orgId } })
  })

  for (const m of memberIds) {
    invalidateAdvertiserAccessCache(m.clerk_user_id)
  }

  // Actor's membership is gone — stamp audit without org (best-effort).
  try {
    await auditFromCustomerUser(auth.access.userId, {
      action: "delete",
      entity_type: "advertiser_org",
      entity_id: auth.access.orgId,
      summary: `Deleted organization #${auth.access.orgId}`,
    })
  } catch {
    // membership gone; org_id stamp may be null — still fine
  }

  return NextResponse.json({ success: true })
}
