import { NextResponse } from "next/server"

import { countOrgOwners } from "@/lib/advertiser-org"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, requireCustomerAccess } from "@/lib/api-utils"
import { invalidateAdvertiserAccessCache } from "@/lib/customer-auth"
import { prisma } from "@/lib/prisma"

/**
 * Self-service — any member can leave their own org, not just admins
 * removing someone else (that's DELETE .../members/[id], gated on
 * team:manage). Mirrors that route's soft-delete, just self-targeted and
 * open to every role, since "leave" has to work for a Member who can't even
 * load the team roster.
 */
export async function POST() {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const member = await prisma.advertiserMember.findFirst({
    where: { clerk_user_id: auth.access.userId, org_id: auth.access.orgId, removed_at: null },
  })
  if (!member) return jsonError("Not a member of an organization", 404)

  if (member.is_owner) {
    const remainingOwners = await countOrgOwners(auth.access.orgId, member.id)
    if (remainingOwners < 1) {
      return jsonError("Transfer admin to someone else before leaving", 409)
    }
  }

  await prisma.advertiserMember.update({
    where: { id: member.id },
    data: { removed_at: new Date(), is_owner: false },
  })
  invalidateAdvertiserAccessCache(auth.access.userId)

  await auditFromCustomerUser(auth.access.userId, {
    action: "delete",
    entity_type: "advertiser_member",
    entity_id: member.id,
    summary: "Left the organization",
  })

  return NextResponse.json({ success: true })
}
