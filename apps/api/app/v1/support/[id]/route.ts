import { NextResponse } from "next/server"

import { supportCaseUpdateSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { toOpsCase, toOpsMessage } from "@/lib/support"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("support")
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const supportCase = await prisma.supportCase.findUnique({ where: { id } })
  if (!supportCase) return jsonError("Not found", 404)

  const messages = await prisma.supportMessage.findMany({
    where: { case_id: id },
    orderBy: { created_at: "asc" },
  })

  return NextResponse.json({
    ...toOpsCase(supportCase),
    messages: messages.map(toOpsMessage),
  })
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("support")
  if (auth.error) return auth.error
  const { access } = auth

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, supportCaseUpdateSchema)
  if ("error" in parsed) return parsed.error

  const existing = await prisma.supportCase.findUnique({ where: { id } })
  if (!existing) return jsonError("Not found", 404)

  const data = await prisma.supportCase.update({
    where: { id },
    data: parsed.data,
  })

  const statusPart = parsed.data.status ? ` status → ${parsed.data.status}` : ""
  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "support_case",
    entity_id: id,
    summary: `Updated support case #${id}${statusPart}`,
    metadata: parsed.data as Record<string, unknown>,
  })

  return NextResponse.json(toOpsCase(data))
}
