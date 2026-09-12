import { NextResponse } from "next/server"

import { countOrgOwners } from "@/lib/advertiser-org"
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
    return NextResponse.json({ canDeleteAccount: true, isSoleOwner: false })
  }

  if (!member.is_owner) {
    return NextResponse.json({ canDeleteAccount: true, isSoleOwner: false })
  }

  const otherOwners = await countOrgOwners(member.org_id, member.id)
  const isSoleOwner = otherOwners < 1
  return NextResponse.json({
    canDeleteAccount: !isSoleOwner,
    isSoleOwner,
    orgId: member.org_id,
  })
}
