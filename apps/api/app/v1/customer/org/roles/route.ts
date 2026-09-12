import { NextResponse } from "next/server"

import { advertiserRoleCreateSchema } from "@workspace/ops-contracts"

import { listAssignableRoles, toRoleDto } from "@/lib/advertiser-org"
import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const auth = await requireCustomerPermissionAccess("team:manage")
  if (auth.error) return auth.error

  const roles = await listAssignableRoles(auth.access.orgId)
  return NextResponse.json(roles.map(toRoleDto))
}

/** Create an org-scoped custom role. */
export async function POST(req: Request) {
  const auth = await requireCustomerPermissionAccess("team:manage")
  if (auth.error) return auth.error
  if (!auth.access.isOwner) return jsonError("Only an admin can create roles", 403)

  const parsed = await parseJsonBody(req, advertiserRoleCreateSchema)
  if ("error" in parsed) return parsed.error

  const name = parsed.data.name.trim()
  const permissions = [...new Set(parsed.data.permissions)]

  const clash = await prisma.advertiserRole.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      OR: [{ org_id: auth.access.orgId }, { org_id: null }],
    },
  })
  if (clash) {
    return jsonError(
      clash.org_id == null
        ? `A starter role named "${name}" already exists — customize it from the matrix instead`
        : `A role named "${name}" already exists in this organization`,
      409,
    )
  }

  const role = await prisma.advertiserRole.create({
    data: {
      org_id: auth.access.orgId,
      name,
      permissions,
    },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "advertiser_role",
    entity_id: role.id,
    summary: `Created role "${role.name}"`,
  })

  return NextResponse.json(
    toRoleDto({ ...role, _count: { members: 0 } }),
    { status: 201 },
  )
}
