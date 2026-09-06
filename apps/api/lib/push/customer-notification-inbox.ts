import type { CustomerNotificationDto } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"

/**
 * Advertiser-side counterpart to lib/push/driver-notification-inbox.ts —
 * campaign lifecycle notifications (submitted / approved / rejected / changes
 * requested), written by the same routes that send the matching email and
 * push.
 *
 * Clients merge this feed with the announcement feed to form one inbox; see
 * apps/customer-web/lib/use-customer-notifications.ts, which mirrors the
 * driver apps' two-query merge.
 */

const PAGE_LIMIT_DEFAULT = 25
const PAGE_LIMIT_MAX = 50

export type CustomerNotificationInboxPage = {
  items: CustomerNotificationDto[]
  next_cursor: number | null
  /** Total unread lifecycle notifications, independent of pagination. */
  unread_count: number
}

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  href: true,
  read_at: true,
  created_at: true,
} as const

function toDto(row: {
  id: number
  type: string
  title: string
  body: string
  href: string | null
  read_at: Date | null
  created_at: Date
}): CustomerNotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    read_at: row.read_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  }
}

/** Cursor-paginated lifecycle-notification history for the advertiser apps. */
export async function listCustomerNotificationsPage(
  clerkUserId: string,
  options: { cursor?: number | null; limit?: number } = {},
): Promise<CustomerNotificationInboxPage> {
  const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, options.limit ?? PAGE_LIMIT_DEFAULT))

  const [rows, unread_count] = await Promise.all([
    prisma.customerNotification.findMany({
      where: { clerk_user_id: clerkUserId },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      select: NOTIFICATION_SELECT,
    }),
    prisma.customerNotification.count({
      where: { clerk_user_id: clerkUserId, read_at: null },
    }),
  ])

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map(toDto),
    next_cursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    unread_count,
  }
}

export async function setCustomerNotificationRead(
  clerkUserId: string,
  id: number,
  read: boolean,
): Promise<boolean> {
  // updateMany, not update: scoping by clerk_user_id in the WHERE means
  // someone else's id simply matches nothing, rather than throwing a
  // record-not-found that would confirm the row exists.
  const result = await prisma.customerNotification.updateMany({
    where: { id, clerk_user_id: clerkUserId },
    data: { read_at: read ? new Date() : null },
  })
  return result.count > 0
}
