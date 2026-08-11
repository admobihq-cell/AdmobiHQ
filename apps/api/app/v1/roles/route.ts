import { NextResponse } from "next/server"

import { opsRoleCreateSchema, type OpsRoleDto } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsAccess, requireOpsAdminAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error

  const roles = await prisma.opsRole.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assignments: true } } },
  })

  const items: OpsRoleDto[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    permissions: role.permissions as OpsRoleDto["permissions"],
    memberCount: role._count.assignments,
  }))

  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error
  const { access } = auth

  const parsed = await parseJsonBody(req, opsRoleCreateSchema)
  if ("error" in parsed) return parsed.error
  const { name, permissions } = parsed.data

  const existing = await prisma.opsRole.findUnique({ where: { name } })
  if (existing) return jsonError(`A role named "${name}" already exists`, 409)

  const role = await prisma.opsRole.create({ data: { name, permissions } })

  await auditFromOpsUser(access, {
    action: "create",
    entity_type: "ops_role",
    entity_id: role.id,
    summary: `Created role "${role.name}"`,
    metadata: { permissions },
  })

  const body: OpsRoleDto = {
    id: role.id,
    name: role.name,
    permissions: role.permissions as OpsRoleDto["permissions"],
    memberCount: 0,
  }
  return NextResponse.json(body)
}
