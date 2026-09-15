import { NextResponse } from "next/server"

import { countOrgOwners, getOrgDetachmentImpact } from "@/lib/advertiser-org"
import { requireCustomerAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

/** Whether the current user may delete their Clerk account without orphaning the org. */
export async function GET() {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const member = await prisma.advertiserMember.findUnique({
    where: { clerk_user_id: auth.access.userId },
  })
  if (!member || member.removed_at) {
    return NextResponse.json({
      canDeleteAccount: true,
      isSoleOwner: false,
      campaignCount: 0,
      supportCaseCount: 0,
    })
  }

  const impact = await getOrgDetachmentImpact(member.org_id)

  if (!member.is_owner) {
    return NextResponse.json({
      canDeleteAccount: true,
      isSoleOwner: false,
      orgId: member.org_id,
      ...impact,
    })
  }

  const otherOwners = await countOrgOwners(member.org_id, member.id)
  const isSoleOwner = otherOwners < 1
  return NextResponse.json({
    canDeleteAccount: !isSoleOwner,
    isSoleOwner,
    orgId: member.org_id,
    // Deleting the org detaches these permanently — the confirm copy names them.
    ...impact,
  })
}
