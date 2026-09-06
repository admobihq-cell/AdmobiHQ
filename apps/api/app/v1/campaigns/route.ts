import { NextResponse } from "next/server"

import { paginatedResponse, paginationSchema } from "@workspace/ops-contracts"

import { requireOpsPermissionAccess } from "@/lib/api-utils"
import { toCampaignListItemDto } from "@/lib/campaign-dto"
import { prisma } from "@/lib/prisma"

/** Drafts aren't ops's concern yet — an advertiser still filling out the
 * wizard shouldn't appear in the review queue. Everything past that is listed,
 * newest first, with a status filter to narrow further. */
const DEFAULT_LIST_STATUSES = ["submitted", "approved", "rejected", "changes_requested", "cancelled"]

export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("campaigns")
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const { page, pageSize } = paginationSchema.parse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 20,
  })
  const status = searchParams.get("status") ?? undefined
  const search = searchParams.get("search")?.trim() || undefined

  const where = {
    ...(status ? { status } : { status: { in: DEFAULT_LIST_STATUSES } }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { contact_email: { contains: search, mode: "insensitive" as const } },
            { market: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { creatives: true } } },
    }),
    prisma.campaign.count({ where }),
  ])

  return NextResponse.json(
    paginatedResponse(rows.map((row) => toCampaignListItemDto(row)), total, page, pageSize),
  )
}
