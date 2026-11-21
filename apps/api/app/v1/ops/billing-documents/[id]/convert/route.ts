import { NextResponse } from "next/server"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, requireOpsPermissionAccess } from "@/lib/api-utils"
import { convertQuoteToInvoice } from "@/lib/billing/documents"

type Params = { params: Promise<{ id: string }> }

/** Turn a sent or accepted quote into a new draft invoice (once). Needs `finances`. */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const result = await convertQuoteToInvoice(id, auth.access.userId)
  if (result === "not_found") return jsonError("Not found", 404)
  if ("conflict" in result) return jsonError(result.conflict, 409)

  await auditFromOpsUser(auth.access, {
    action: "billing_document.converted",
    entity_type: "billing_document",
    entity_id: result.id,
    org_id: result.orgId,
    summary: `Converted quote #${id} into invoice ${result.number}`,
    metadata: { sourceQuoteId: id },
  })
  return NextResponse.json(result, { status: 201 })
}
