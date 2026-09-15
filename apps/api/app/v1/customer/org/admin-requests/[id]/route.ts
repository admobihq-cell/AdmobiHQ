import { NextResponse } from "next/server"

import { advertiserAdminRequestReviewSchema } from "@workspace/ops-contracts"

import { notifyCustomerUsers } from "@/lib/advertiser-notify"
import { toAdminRequestDtos } from "@/lib/advertiser-org"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireCustomerAccess } from "@/lib/api-utils"
import { invalidateAdvertiserAccessCache } from "@/lib/customer-auth"
import { getCustomerName } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

/**
 * Owner approves or denies a member's request for admin access. Approving is
 * the only path by which someone other than an existing owner becomes one
 * without a full ownership transfer.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error
  if (!auth.access.isOwner) return jsonError("Only an admin can review these requests", 403)

  const id = parseId((await params).id)
  if (id == null) return jsonError("Invalid request id", 400)

  const parsed = await parseJsonBody(req, advertiserAdminRequestReviewSchema)
  if ("error" in parsed) return parsed.error

  const { decision, note } = parsed.data
  // A refusal the requester can't understand just gets asked again.
  if (decision === "deny" && !note?.trim()) {
    return jsonError("Give a reason when denying a request", 400)
  }

  const request = await prisma.advertiserAdminRequest.findFirst({
    where: { id, org_id: auth.access.orgId },
  })
  if (!request) return jsonError("Request not found", 404)
  if (request.status !== "pending") return jsonError("That request was already reviewed", 409)

  const member = await prisma.advertiserMember.findFirst({
    where: { org_id: auth.access.orgId, clerk_user_id: request.clerk_user_id, removed_at: null },
  })
  if (!member) return jsonError("That member is no longer part of this organization", 409)

  const updated = await prisma.$transaction(async (tx) => {
    if (decision === "approve") {
      await tx.advertiserMember.update({
        where: { id: member.id },
        data: { is_owner: true, role_id: null },
      })
    }
    return tx.advertiserAdminRequest.update({
      where: { id: request.id },
      data: {
        status: decision === "approve" ? "approved" : "denied",
        reviewed_by_clerk_user_id: auth.access.userId,
        reviewed_at: new Date(),
        review_note: note?.trim() || null,
      },
    })
  })

  invalidateAdvertiserAccessCache(request.clerk_user_id)

  const reviewerName = (await getCustomerName(auth.access.userId)) ?? "An admin"
  await notifyCustomerUsers([request.clerk_user_id], {
    orgId: auth.access.orgId,
    type: decision === "approve" ? "org_admin_request_approved" : "org_admin_request_denied",
    title: decision === "approve" ? "You're now an admin" : "Admin access declined",
    body:
      decision === "approve"
        ? `${reviewerName} approved your request for admin access.`
        : `${reviewerName} declined your request: ${note!.trim()}`,
    href: "/settings/team",
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "advertiser_admin_request",
    entity_id: request.id,
    summary:
      decision === "approve"
        ? `Approved admin access for member #${member.id}`
        : `Denied admin access for member #${member.id}`,
  })

  const [dto] = await toAdminRequestDtos([updated])
  return NextResponse.json(dto)
}
