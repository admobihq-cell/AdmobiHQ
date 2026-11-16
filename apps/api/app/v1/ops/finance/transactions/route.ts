import { NextResponse } from "next/server"

import { formatKes, recordTransactionSchema } from "@workspace/ops-contracts"

import { auditFromOpsUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

/**
 * Record a wallet ledger row by hand. The ledger is append-only: there is no update or delete
 * here, and a mistake is corrected with an adjustment. Needs the `finances` permission.
 *
 * The sign follows the type: a top-up or refund adds, a spend subtracts, and an adjustment
 * keeps the sign the caller entered. Rows are written with `provider = manual`, who recorded
 * them, and an audit event.
 */
export async function POST(req: Request) {
  const auth = await requireOpsPermissionAccess("finances")
  if (auth.error) return auth.error
  const { access } = auth

  const parsed = await parseJsonBody(req, recordTransactionSchema)
  if ("error" in parsed) return parsed.error
  const input = parsed.data

  const org = await prisma.advertiserOrg.findUnique({ where: { id: input.orgId }, select: { id: true, name: true } })
  if (!org) return jsonError("Organization not found", 404)

  if (input.campaignId) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: input.campaignId, org_id: org.id },
      select: { id: true },
    })
    // A campaign from another org would put this row on the wrong account's books.
    if (!campaign) return jsonError("That campaign doesn't belong to this organization", 400)
  }

  const magnitude = Math.round(Math.abs(input.amountKes) * 100) / 100
  const signed =
    input.kind === "spend" ? -magnitude : input.kind === "adjustment" ? Math.round(input.amountKes * 100) / 100 : magnitude

  if (input.reference) {
    const duplicate = await prisma.walletTransaction.findUnique({ where: { reference: input.reference }, select: { id: true } })
    if (duplicate) return jsonError("That reference is already recorded", 409)
  }

  let row
  try {
    row = await prisma.walletTransaction.create({
      data: {
        org_id: org.id,
        campaign_id: input.campaignId ?? null,
        kind: input.kind,
        amount_kes: signed,
        spend_category: input.spendCategory ?? null,
        provider: "manual",
        reference: input.reference ?? null,
        description: input.reason,
        occurred_at: new Date(),
        created_by: access.userId,
      },
    })
  } catch (error: unknown) {
    // Two requests with the same reference can both pass the check above; the unique index decides.
    if ((error as { code?: string }).code === "P2002") return jsonError("That reference is already recorded", 409)
    throw error
  }

  await auditFromOpsUser(access, {
    action: "create",
    entity_type: "wallet_transaction",
    entity_id: row.id,
    org_id: org.id,
    summary: `Recorded ${input.kind.replace("_", " ")} of ${formatKes(signed)} for "${org.name}" (${input.reason})`,
  })

  return NextResponse.json({ id: row.id, amountKes: signed }, { status: 201 })
}
