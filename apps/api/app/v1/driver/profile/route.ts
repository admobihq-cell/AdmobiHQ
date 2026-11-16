import { NextResponse } from "next/server"

import { driverProfileUpdateSchema } from "@workspace/ops-contracts"

import { jsonError, parseJsonBody, requireDriverAccess } from "@/lib/api-utils"
import { EDITABLE_STATUSES, getOrCreateDriverProfile } from "@/lib/driver/driver-profile-store"
import { toDriverProfileDto } from "@/lib/driver/driver-profile-dto"
import { notifyPayoutDetailsChanged } from "@/lib/payments/money-notify"
import { prisma } from "@/lib/prisma"

const PAYOUT_FIELDS = [
  "payout_method",
  "payout_mpesa_msisdn",
  "payout_bank_name",
  "payout_bank_account",
  "payout_bank_code",
] as const

export async function GET() {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const profile = await getOrCreateDriverProfile(auth.access.userId)
  return NextResponse.json(toDriverProfileDto(profile))
}

export async function PATCH(req: Request) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, driverProfileUpdateSchema)
  if ("error" in parsed) return parsed.error

  const existing = await getOrCreateDriverProfile(auth.access.userId)
  if (!EDITABLE_STATUSES.has(existing.status)) {
    return jsonError(
      `Profile can't be edited while status is "${existing.status}"`,
      409,
    )
  }

  // A changed number or account redirects money: drop the cached Paystack
  // recipient so the next payout creates a fresh one, and tell the driver (D3).
  const payoutChanged = PAYOUT_FIELDS.some(
    (field) => parsed.data[field] !== undefined && parsed.data[field] !== existing[field],
  )

  const updated = await prisma.driverProfile.update({
    where: { id: existing.id },
    data: { ...parsed.data, ...(payoutChanged ? { paystack_recipient_code: null } : {}) },
    include: { documents: { orderBy: { created_at: "asc" } } },
  })

  if (payoutChanged) await notifyPayoutDetailsChanged(auth.access.userId)

  return NextResponse.json(toDriverProfileDto(updated))
}
