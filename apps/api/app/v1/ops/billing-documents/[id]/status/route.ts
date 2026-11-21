import { NextResponse } from "next/server"

import { billingStatusActionSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseId, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { changeBillingStatus } from "@/lib/billing/documents"
import { emailBillingDocument } from "@/lib/billing/send-document-email"
import { notifyBillingDocument } from "@/lib/payments/money-notify"

type Params = { params: Promise<{ id: string }> }

const PAST: Record<string, string> = { send: "Sent", accept: "Marked accepted", decline: "Marked declined", void: "Voided" }

/** `{ action: send | accept | decline | void }`. Sending makes it visible to the advertiser. Needs `finances`. */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const parsed = await parseJsonBody(req, billingStatusActionSchema)
  if ("error" in parsed) return parsed.error

  const result = await changeBillingStatus(id, parsed.data.action)
  if (result === "not_found") return jsonError("Not found", 404)
  if ("conflict" in result) return jsonError(result.conflict, 409)

  await auditFromOpsUser(auth.access, {
    action: "billing_document.status_changed",
    entity_type: "billing_document",
    entity_id: result.id,
    org_id: result.orgId,
    summary: `${PAST[parsed.data.action]} ${result.kind} ${result.number}`,
    metadata: { action: parsed.data.action },
  })

  // Sending emails the PDF to the customer. A mail failure doesn't undo the send;
  // the response says what happened so ops can follow up by hand.
  if (parsed.data.action === "send") {
    await notifyBillingDocument(result, "sent")
    return NextResponse.json({ ...result, ...(await emailBillingDocument(result)) })
  }
  return NextResponse.json(result)
}
