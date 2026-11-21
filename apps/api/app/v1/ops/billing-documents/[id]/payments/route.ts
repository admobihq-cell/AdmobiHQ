import { NextResponse } from "next/server"

import { formatKes, recordBillingPaymentSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { recordBillingPayment } from "@/lib/billing/documents"

type Params = { params: Promise<{ id: string }> }

/**
 * Record money received against a manual invoice. Append-only — there is no
 * edit or delete; a mistake is fixed by voiding and re-issuing. Does not write
 * to the wallet ledger. Needs `finances`.
 */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, recordBillingPaymentSchema)
  if ("error" in parsed) return parsed.error

  const result = await recordBillingPayment(id, parsed.data, auth.access.userId)
  if (result === "not_found") return jsonError("Not found", 404)
  if ("conflict" in result) return jsonError(result.conflict, 409)

  await auditFromOpsUser(auth.access, {
    action: "billing_document.payment_recorded",
    entity_type: "billing_document",
    entity_id: result.id,
    org_id: result.orgId,
    summary: `Recorded ${formatKes(parsed.data.amountKes)} (${parsed.data.method}) against ${result.number}`,
    metadata: { amountKes: parsed.data.amountKes, method: parsed.data.method, reference: parsed.data.reference },
  })
  return NextResponse.json(result, { status: 201 })
}
