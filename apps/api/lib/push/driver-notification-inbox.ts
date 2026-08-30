import type { DriverNotificationDto } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"

const PAGE_LIMIT_DEFAULT = 25
const PAGE_LIMIT_MAX = 50

export type DriverNotificationInboxPage = {
  items: DriverNotificationDto[]
  next_cursor: number | null
}

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  read_at: true,
  created_at: true,
} as const

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

/** Cursor-paginated lifecycle-notification history for the driver web app. */
export async function listDriverNotificationsPage(
  clerkUserId: string,
  options: { cursor?: number | null; limit?: number } = {},
): Promise<DriverNotificationInboxPage> {
  const limit = Math.min(
    PAGE_LIMIT_MAX,
    Math.max(1, options.limit ?? PAGE_LIMIT_DEFAULT),
  )

  const rows = await prisma.driverNotification.findMany({
    where: { clerk_user_id: clerkUserId },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    select: NOTIFICATION_SELECT,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map(toDto),
    next_cursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  }
}

export async function setDriverNotificationRead(
  clerkUserId: string,
  id: number,
  read: boolean,
): Promise<boolean> {
  const result = await prisma.driverNotification.updateMany({
    where: { id, clerk_user_id: clerkUserId },
    data: { read_at: read ? new Date() : null },
  })
  return result.count > 0
}
