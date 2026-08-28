import { NextResponse } from "next/server"

import { paginatedResponse, paginationSchema } from "@workspace/ops-contracts"
import type { DriverApplicationListItemDto } from "@workspace/ops-contracts"

import { requireOpsPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

/** Drafts aren't ops's concern yet — a driver still filling out the stepper
 * shouldn't show up in the review queue. Everything past that is listed,
 * newest-submitted first, with a status filter to narrow further. */
const DEFAULT_LIST_STATUSES = ["submitted", "approved", "rejected", "changes_requested"]

export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("driver_applications")
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const { page, pageSize } = paginationSchema.parse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 20,
  })
  const status = searchParams.get("status") ?? undefined

  const where = status ? { status } : { status: { in: DEFAULT_LIST_STATUSES } }

  const [rows, total] = await Promise.all([
    prisma.driverProfile.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        full_name: true,
        phone: true,
        city: true,
        status: true,
        submitted_at: true,
        created_at: true,
      },
    }),
    prisma.driverProfile.count({ where }),
  ])

  const items: DriverApplicationListItemDto[] = rows.map((row) => ({
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    city: row.city,
    status: row.status,
    submitted_at: row.submitted_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  }))

  return NextResponse.json(paginatedResponse(items, total, page, pageSize))
}
