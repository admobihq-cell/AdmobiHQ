import { NextResponse } from "next/server"

import { paginatedResponse, paginationSchema } from "@workspace/ops-contracts"
import type { OpsAdvertiserOrgListItemDto } from "@workspace/ops-contracts"

import { requireOpsPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

/** Ops directory of advertiser organizations — who shares an account. */
export async function GET(req: Request) {
  const auth = await requireOpsPermissionAccess("campaigns")
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const { page, pageSize } = paginationSchema.parse({
    page: searchParams.get("page") ?? 1,
    pageSize: searchParams.get("pageSize") ?? 20,
  })
  const search = searchParams.get("search")?.trim() || undefined

  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : {}

  const [rows, total] = await Promise.all([
    prisma.advertiserOrg.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            members: { where: { removed_at: null } },
            campaigns: true,
          },
        },
      },
    }),
    prisma.advertiserOrg.count({ where }),
  ])

  const items: OpsAdvertiserOrgListItemDto[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    memberCount: row._count.members,
    campaignCount: row._count.campaigns,
    createdAt: row.created_at.toISOString(),
  }))

  return NextResponse.json(paginatedResponse(items, total, page, pageSize))
}
