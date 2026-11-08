import { NextResponse } from "next/server"
import { z } from "zod"

import { formatKes } from "@workspace/ops-contracts"

import { auditFromCustomerUser } from "@/lib/audit"
import { jsonError, parseJsonBody, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { getCustomerEmail, getCustomerName } from "@/lib/customer/customer-clerk"
import { availableKes } from "@/lib/payments/funding"
import { alertOpsFinance } from "@/lib/payments/money-notify"
import { prisma } from "@/lib/prisma"
import { ensureCustomerRecord } from "@/lib/support/support"
import { generateAccessToken, hashAccessToken } from "@/lib/support/support-token"

const refundRequestSchema = z.object({
  amountKes: z.number().positive().max(10_000_000),
  note: z.string().trim().max(2000).optional(),
})

/**
 * "Request refund" on Billing: opens a billing support case for ops (the
 * support inbox is the queue). No money moves here; ops refunds from Finances.
 */
export async function POST(req: Request) {
  const auth = await requireCustomerPermissionAccess("billing:write")
  if (auth.error) return auth.error
  const { userId, orgId } = auth.access

  const parsed = await parseJsonBody(req, refundRequestSchema)
  if ("error" in parsed) return parsed.error
  const amountKes = Math.round(parsed.data.amountKes * 100) / 100

  const available = await prisma.$transaction((tx) => availableKes(tx, orgId))
  if (amountKes > available) {
    return jsonError(`You can request at most ${formatKes(Math.max(0, available))}`, 400)
  }

  const [email, name, customer, org] = await Promise.all([
    getCustomerEmail(userId),
    getCustomerName(userId),
    ensureCustomerRecord(userId),
    prisma.advertiserOrg.findUnique({ where: { id: orgId }, select: { name: true } }),
  ])
  if (!email) return jsonError("Add an email address to your account first", 400)

  const subject = `Refund request: ${formatKes(amountKes)}`
  const supportCase = await prisma.supportCase.create({
    data: {
      contact_name: name ?? email,
      contact_email: email,
      customer_id: customer?.id ?? null,
      org_id: orgId,
      access_token_hash: hashAccessToken(generateAccessToken()),
      channel: "customer-web",
      category: "billing",
      subject,
      messages: {
        create: {
          author_type: "customer",
          author_email: email,
          body: parsed.data.note || `Please refund ${formatKes(amountKes)} of unused credit to my original payment method.`,
        },
      },
    },
  })

  await auditFromCustomerUser(userId, {
    action: "create",
    entity_type: "support_case",
    entity_id: supportCase.id,
    summary: subject,
  })
  await alertOpsFinance({ title: `Refund requested: ${formatKes(amountKes)}, ${org?.name ?? `org #${orgId}`}`, body: `Support case #${supportCase.id}` })

  return NextResponse.json({ caseId: supportCase.id }, { status: 201 })
}
