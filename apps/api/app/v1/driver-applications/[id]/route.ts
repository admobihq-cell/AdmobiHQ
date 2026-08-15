import { NextResponse } from "next/server"

import { jsonError, parseId, requireOpsPermissionAccess } from "@/lib/api-utils"
import { toDriverProfileDto } from "@/lib/driver-profile-dto"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireOpsPermissionAccess("driver_applications")
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const profile = await prisma.driverProfile.findUnique({
    where: { id },
    include: { documents: { orderBy: { created_at: "asc" } } },
  })
  if (!profile) return jsonError("Not found", 404)

  return NextResponse.json(toDriverProfileDto(profile))
}
