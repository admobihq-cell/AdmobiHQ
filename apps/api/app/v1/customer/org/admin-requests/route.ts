import { NextResponse } from "next/server"

import {
  type AdvertiserAdminRequestDto,
  advertiserAdminRequestCreateSchema,
} from "@workspace/ops-contracts"

import { listOrgOwnerIds, notifyCustomerUsers } from "@/lib/advertiser-notify"
import { toAdminRequestDtos } from "@/lib/advertiser-org"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireCustomerAccess } from "@/lib/api-utils"
import { getCustomerName } from "@/lib/customer-clerk"
import { checkRateLimit } from "@/lib/rate-limit"
import { prisma } from "@/lib/prisma"

const MAX_ROWS = 100

/**
 * Owners see every request for the org; everyone else sees only their own.
 * Deliberately not gated on `team:manage` — the whole point is that a member
 * without it can ask for more access.
 */
export async function GET() {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const rows = await prisma.advertiserAdminRequest.findMany({
    where: {
      org_id: auth.access.orgId,
      ...(auth.access.isOwner ? {} : { clerk_user_id: auth.access.userId }),
    },
    orderBy: [{ status: "asc" }, { created_at: "desc" }],
    take: MAX_ROWS,
  })

  const body: AdvertiserAdminRequestDto[] = await toAdminRequestDtos(rows)
  return NextResponse.json(body)
}

export async function POST(req: Request) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  if (auth.access.isOwner) {
    return jsonError("You're already an admin", 409)
  }

  const limited = await checkRateLimit(req, "advertiser-admin-request", {
    limit: 5,
    windowSeconds: 3600,
    identifier: auth.access.userId,
  })
  if (limited) return limited

  const parsed = await parseJsonBody(req, advertiserAdminRequestCreateSchema)
  if ("error" in parsed) return parsed.error

  const open = await prisma.advertiserAdminRequest.findFirst({
    where: { org_id: auth.access.orgId, clerk_user_id: auth.access.userId, status: "pending" },
  })
  if (open) return jsonError("You already have a request awaiting review", 409)

  const created = await prisma.advertiserAdminRequest.create({
    data: {
      org_id: auth.access.orgId,
      clerk_user_id: auth.access.userId,
      reason: parsed.data.reason,
    },
  })

  const requesterName = (await getCustomerName(auth.access.userId)) ?? "A teammate"
  await notifyCustomerUsers(await listOrgOwnerIds(auth.access.orgId), {
    orgId: auth.access.orgId,
    type: "org_admin_request",
    title: "Admin access requested",
    body: `${requesterName} asked to be made an admin.`,
    href: "/settings/team",
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "advertiser_admin_request",
    entity_id: created.id,
    summary: `Requested admin access for org #${auth.access.orgId}`,
  })

  const [dto] = await toAdminRequestDtos([created])
  return NextResponse.json(dto, { status: 201 })
}
