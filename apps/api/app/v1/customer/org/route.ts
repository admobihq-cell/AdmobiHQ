import { NextResponse } from "next/server"

import { advertiserOrgRenameSchema } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireCustomerAccess, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { toOrgDto } from "@/lib/advertiser-org"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const org = await toOrgDto(auth.access.orgId, auth.access.userId)
  if (!org) return jsonError("Organization not found", 404)
  return NextResponse.json(org)
}

export async function PATCH(req: Request) {
  const auth = await requireCustomerPermissionAccess("org:manage")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, advertiserOrgRenameSchema)
  if ("error" in parsed) return parsed.error

  const updated = await prisma.advertiserOrg.update({
    where: { id: auth.access.orgId },
    data: { name: parsed.data.name },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "advertiser_org",
    entity_id: updated.id,
    summary: `Organization renamed to "${updated.name}"`,
  })

  const org = await toOrgDto(updated.id, auth.access.userId)
  return NextResponse.json(org)
}
