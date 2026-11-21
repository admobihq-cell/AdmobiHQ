import { NextResponse } from "next/server"

import {
  BILLING_DOCUMENT_KINDS,
  BILLING_DOCUMENT_STATUSES,
  billingDocumentInputSchema,
  formatKes,
  parseId,
  type BillingDocumentKind,
  type BillingDocumentStatus,
} from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { assertCampaignBelongsToOrg, createBillingDocument, listBillingDocuments } from "@/lib/billing/documents"

const pick = <T extends string>(allowed: readonly T[], value: string | null): T | undefined =>
  allowed.includes(value as T) ? (value as T) : undefined

/** Quotes and invoices written by ops, newest first. Needs `finances`. */
export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const search = new URL(req.url).searchParams
  const items = await listBillingDocuments({
    kind: pick<BillingDocumentKind>(BILLING_DOCUMENT_KINDS, search.get("kind")),
    status: pick<BillingDocumentStatus>(BILLING_DOCUMENT_STATUSES, search.get("status")),
    orgId: parseId(search.get("orgId") ?? "") ?? undefined,
  })
  return NextResponse.json({ items })
}

/** Create a draft quote or invoice; the number is assigned here and never changes. Needs `finances`. */
export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, billingDocumentInputSchema)
  if ("error" in parsed) return parsed.error
  const input = parsed.data

  const campaignError = await assertCampaignBelongsToOrg(input.orgId, input.campaignId)
  if (campaignError) return jsonError(campaignError, 400)

  const doc = await createBillingDocument(input, auth.access.userId)
  await auditFromOpsUser(auth.access, {
    action: "billing_document.created",
    entity_type: "billing_document",
    entity_id: doc.id,
    org_id: doc.orgId,
    summary: `Created ${doc.kind} ${doc.number} for "${doc.customer.name}" (${formatKes(doc.totalKes)})`,
  })
  return NextResponse.json(doc, { status: 201 })
}
