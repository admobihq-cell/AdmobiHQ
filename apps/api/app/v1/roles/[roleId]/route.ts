import { NextResponse } from "next/server"

import { opsRoleUpdateSchema, type OpsRoleDto } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsAdminAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ roleId: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error
  const { access } = auth

  const { roleId: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid role id", 400)

  const parsed = await parseJsonBody(req, opsRoleUpdateSchema)
  if ("error" in parsed) return parsed.error

  const existing = await prisma.opsRole.findUnique({ where: { id } })
  if (!existing) return jsonError("Not found", 404)

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const nameTaken = await prisma.opsRole.findUnique({ where: { name: parsed.data.name } })
    if (nameTaken) return jsonError(`A role named "${parsed.data.name}" already exists`, 409)
  }

  const role = await prisma.opsRole.update({
    where: { id },
    data: {
      name: parsed.data.name,
      permissions: parsed.data.permissions,
    },
    include: { _count: { select: { assignments: true } } },
  })

  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "ops_role",
    entity_id: role.id,
    summary: `Updated role "${role.name}"`,
    metadata: parsed.data as Record<string, unknown>,
  })

  const body: OpsRoleDto = {
    id: role.id,
    name: role.name,
    permissions: role.permissions as OpsRoleDto["permissions"],
    memberCount: role._count.assignments,
  }
  return NextResponse.json(body)
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error
  const { access } = auth

  const { roleId: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid role id", 400)

  const existing = await prisma.opsRole.findUnique({
    where: { id },
    include: { _count: { select: { assignments: true } } },
  })
  if (!existing) return NextResponse.json({ success: true })

  if (existing._count.assignments > 0) {
    return jsonError(
      `Cannot delete "${existing.name}" — ${existing._count.assignments} member(s) still assigned. Reassign them first.`,
      400,
    )
  }

  await prisma.opsRole.delete({ where: { id } })

  await auditFromOpsUser(access, {
    action: "delete",
    entity_type: "ops_role",
    entity_id: id,
    summary: `Deleted role "${existing.name}"`,
  })

  return NextResponse.json({ success: true })
}
