import { NextResponse } from "next/server"

import { advertiserActivityQuerySchema } from "@workspace/ops-contracts"

import {
  advertiserActivityWhere,
  decodeActivityCursor,
  encodeActivityCursor,
  toAdvertiserActivityItem,
} from "@/lib/advertiser-activity"
import { jsonError, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const auth = await requireCustomerPermissionAccess("activity:read")
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const parsed = advertiserActivityQuerySchema.safeParse({
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  })
  if (!parsed.success) return jsonError("Invalid query", 400, parsed.error.flatten())

  const { limit } = parsed.data
  const cursor = parsed.data.cursor ? decodeActivityCursor(parsed.data.cursor) : null
  if (parsed.data.cursor && !cursor) return jsonError("Invalid cursor", 400)

  const finalWhere = cursor
    ? {
        AND: [
          advertiserActivityWhere(auth.access.orgId),
          {
            OR: [
              { created_at: { lt: new Date(cursor.createdAt) } },
              { AND: [{ created_at: new Date(cursor.createdAt) }, { id: { lt: cursor.id } }] },
            ],
          },
        ],
      }
    : advertiserActivityWhere(auth.access.orgId)

  const rows = await prisma.auditEvent.findMany({
    where: finalWhere,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      actor_type: true,
      actor_user_id: true,
      action: true,
      entity_type: true,
      entity_id: true,
      created_at: true,
    },
  })

  const page = rows.slice(0, limit)
  const items = await Promise.all(page.map((row) => toAdvertiserActivityItem(row)))
  const last = page[page.length - 1]
  const nextCursor =
    rows.length > limit && last ? encodeActivityCursor(last.created_at, last.id) : null

  return NextResponse.json({ items, nextCursor })
}
