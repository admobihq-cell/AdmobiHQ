import { NextResponse } from "next/server"
import { z } from "zod"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { invalidateAdvertiserAccessCache } from "@/lib/customer-auth"
import { prisma } from "@/lib/prisma"

const transferSchema = z.object({
  memberId: z.number().int().positive(),
})

/** Promote another active member to admin and demote the caller (admin only). */
export async function POST(req: Request) {
  const auth = await requireCustomerPermissionAccess("org:manage")
  if (auth.error) return auth.error
  if (!auth.access.isOwner) return jsonError("Only an admin can transfer admin", 403)

  const parsed = await parseJsonBody(req, transferSchema)
  if ("error" in parsed) return parsed.error

  const target = await prisma.advertiserMember.findFirst({
    where: {
      id: parsed.data.memberId,
      org_id: auth.access.orgId,
      removed_at: null,
    },
  })
  if (!target) return jsonError("Member not found", 404)
  if (target.clerk_user_id === auth.access.userId) {
    return jsonError("Pick another member", 400)
  }

  const caller = await prisma.advertiserMember.findUnique({
    where: { clerk_user_id: auth.access.userId },
  })
  if (!caller || caller.removed_at) return jsonError("Not a member", 403)

  const memberRole = await prisma.advertiserRole.findFirst({
    where: { org_id: null, name: "Member" },
  })

  await prisma.$transaction(async (tx) => {
    await tx.advertiserMember.update({
      where: { id: target.id },
      data: { is_owner: true, role_id: null },
    })
    await tx.advertiserMember.update({
      where: { id: caller.id },
      data: {
        is_owner: false,
        role_id: caller.role_id ?? memberRole?.id ?? null,
      },
    })
  })

  invalidateAdvertiserAccessCache(auth.access.userId)
  invalidateAdvertiserAccessCache(target.clerk_user_id)

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "advertiser_member",
    entity_id: target.id,
    summary: `Transferred admin to member #${target.id}`,
  })

  return NextResponse.json({ success: true })
}
