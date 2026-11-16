import { NextResponse } from "next/server"

import { integrationInputSchema } from "@workspace/ops-contracts/integration-costs"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsAdminAccess } from "@/lib/api-utils"
import { toIntegrationDto } from "@/lib/integrations"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

/** Replaces an integration's fields (the form always sends the whole record). Ops admin only. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (id == null) return jsonError("Invalid integration id", 400)
  const parsed = await parseJsonBody(req, integrationInputSchema)
  if ("error" in parsed) return parsed.error

  if (!(await prisma.integration.findUnique({ where: { id }, select: { id: true } }))) return jsonError("Integration not found", 404)
  const row = await prisma.integration.update({ where: { id }, data: { ...parsed.data, updated_by_email: auth.access.email } })
  await auditFromOpsUser(auth.access, {
    action: "update",
    entity_type: "integration",
    entity_id: row.id,
    summary: `Updated integration ${row.name}`,
    metadata: { name: row.name, category: row.category, status: row.status, cost: Number(row.cost), currency: row.currency },
  })
  return NextResponse.json(toIntegrationDto(row))
}

/** Removes an integration from the ledger. Ops admin only. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOpsAdminAccess()
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (id == null) return jsonError("Invalid integration id", 400)

  const existing = await prisma.integration.findUnique({ where: { id } })
  if (!existing) return jsonError("Integration not found", 404)
  await prisma.integration.delete({ where: { id } })
  await auditFromOpsUser(auth.access, {
    action: "delete",
    entity_type: "integration",
    entity_id: id,
    summary: `Removed integration ${existing.name}`,
    metadata: { name: existing.name, category: existing.category },
  })
  return NextResponse.json({ ok: true })
}
