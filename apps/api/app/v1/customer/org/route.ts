import { NextResponse } from "next/server"

import { advertiserOrgUpdateSchema } from "@workspace/ops-contracts"

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

  const parsed = await parseJsonBody(req, advertiserOrgUpdateSchema)
  if ("error" in parsed) return parsed.error

  const { name, billingEmail, taxPin } = parsed.data
  // Billing details are a separate permission from renaming the org.
  if (
    (billingEmail !== undefined || taxPin !== undefined) &&
    !auth.access.isOwner &&
    !auth.access.permissions.has("billing:write")
  ) {
    return jsonError('Forbidden — "billing:write" access required', 403)
  }

  const updated = await prisma.advertiserOrg.update({
    where: { id: auth.access.orgId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(billingEmail !== undefined ? { billing_email: billingEmail } : {}),
      ...(taxPin !== undefined ? { tax_pin: taxPin } : {}),
    },
  })

  const changed = [
    name !== undefined ? `renamed to "${updated.name}"` : null,
    billingEmail !== undefined ? "billing email updated" : null,
    taxPin !== undefined ? "KRA PIN updated" : null,
  ].filter(Boolean)

  await auditFromCustomerUser(auth.access.userId, {
    action: "update",
    entity_type: "advertiser_org",
    entity_id: updated.id,
    summary: `Organization ${changed.join(", ")}`,
  })

  const org = await toOrgDto(updated.id, auth.access.userId)
  return NextResponse.json(org)
}
