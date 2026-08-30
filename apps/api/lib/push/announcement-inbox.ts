import { prisma } from "@/lib/prisma"

const LIST_LIMIT = 30
const PAGE_LIMIT_DEFAULT = 25
const PAGE_LIMIT_MAX = 50

export type AnnouncementDeliveryDto = {
  id: number
  title: string
  body: string
  image_url: string | null
  category: string
  read_at: string | null
  created_at: string
}

export type AnnouncementInboxPage = {
  items: AnnouncementDeliveryDto[]
  /** Pass back as `?cursor=` to fetch the next (older) page, or null at the end. */
  next_cursor: number | null
}

const DELIVERY_SELECT = {
  id: true,
  title: true,
  body: true,
  image_url: true,
  category: true,
  read_at: true,
  created_at: true,
} as const

function toDto(row: {
  id: number
  title: string
  body: string
  image_url: string | null
  category: string
  read_at: Date | null
  created_at: Date
}): AnnouncementDeliveryDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    image_url: row.image_url,
    category: row.category,
    read_at: row.read_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  }
}

/** Shared by every announcement-inbox route (customer/driver × web/mobile) —
 * each route is just an access check plus a call into one of these functions
 * with the right `app` value, so the Prisma query logic exists exactly once. */
export async function listAnnouncementDeliveries(
  app: string,
  clerkUserId: string,
): Promise<AnnouncementDeliveryDto[]> {
  const rows = await prisma.announcementDelivery.findMany({
    where: { clerk_user_id: clerkUserId, app },
    orderBy: { created_at: "desc" },
    take: LIST_LIMIT,
    select: DELIVERY_SELECT,
  })

  return rows.map(toDto)
}

/** Cursor-paginated variant for the web notifications page, which loads full
 * history rather than the bell's fixed peek. `cursor` is the id of the last row
 * from the previous page. */
export async function listAnnouncementDeliveriesPage(
  app: string,
  clerkUserId: string,
  options: { cursor?: number | null; limit?: number } = {},
): Promise<AnnouncementInboxPage> {
  const limit = Math.min(
    PAGE_LIMIT_MAX,
    Math.max(1, options.limit ?? PAGE_LIMIT_DEFAULT),
  )

  const rows = await prisma.announcementDelivery.findMany({
    where: { clerk_user_id: clerkUserId, app },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(options.cursor
      ? { cursor: { id: options.cursor }, skip: 1 }
      : {}),
    select: DELIVERY_SELECT,
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map(toDto),
    next_cursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  }
}

export async function markAnnouncementDeliveriesRead(
  app: string,
  clerkUserId: string,
): Promise<void> {
  await prisma.announcementDelivery.updateMany({
    where: { clerk_user_id: clerkUserId, app, read_at: null },
    data: { read_at: new Date() },
  })
}

/** Flip a single delivery's read state. Scoped by (app, user) so a caller can
 * only ever touch their own inbox. Returns false when nothing matched. */
export async function setAnnouncementDeliveryRead(
  app: string,
  clerkUserId: string,
  id: number,
  read: boolean,
): Promise<boolean> {
  const result = await prisma.announcementDelivery.updateMany({
    where: { id, clerk_user_id: clerkUserId, app },
    data: { read_at: read ? new Date() : null },
  })
  return result.count > 0
}
