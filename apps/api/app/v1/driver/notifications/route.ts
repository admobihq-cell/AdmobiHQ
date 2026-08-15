import { NextResponse } from "next/server"
import type { DriverNotificationDto } from "@workspace/ops-contracts"

import { requireDriverAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

const LIST_LIMIT = 30

function toDto(row: {
  id: number
  type: string
  title: string
  body: string
  read_at: Date | null
  created_at: Date
}): DriverNotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    read_at: row.read_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  }
}

export async function GET() {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const rows = await prisma.driverNotification.findMany({
    where: { clerk_user_id: auth.access.userId },
    orderBy: { created_at: "desc" },
    take: LIST_LIMIT,
  })

  return NextResponse.json(rows.map(toDto))
}
