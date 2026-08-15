import { NextResponse } from "next/server"

import { driverProfileUpdateSchema } from "@workspace/ops-contracts"

import { jsonError, parseJsonBody, requireDriverAccess } from "@/lib/api-utils"
import { EDITABLE_STATUSES, getOrCreateDriverProfile } from "@/lib/driver-profile-store"
import { toDriverProfileDto } from "@/lib/driver-profile-dto"
import { prisma } from "@/lib/prisma"

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

  const updated = await prisma.driverProfile.update({
    where: { id: existing.id },
    data: parsed.data,
    include: { documents: { orderBy: { created_at: "asc" } } },
  })

  return NextResponse.json(toDriverProfileDto(updated))
}
