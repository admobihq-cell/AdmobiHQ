import { prisma } from "@/lib/prisma"

const LIST_LIMIT = 30

export type AnnouncementDeliveryDto = {
  id: number
  title: string
  body: string
  image_url: string | null
  category: string
  read_at: string | null
  created_at: string
}

/** Shared by every announcement-inbox route (customer/driver × web/mobile) —
 * each route is just an access check plus a call into one of these two
 * functions with the right `app` value, so the Prisma query logic exists
 * exactly once. */
export async function listAnnouncementDeliveries(
  app: string,
  clerkUserId: string,
): Promise<AnnouncementDeliveryDto[]> {
  const rows = await prisma.announcementDelivery.findMany({
    where: { clerk_user_id: clerkUserId, app },
    orderBy: { created_at: "desc" },
    take: LIST_LIMIT,
    select: {
      id: true,
      title: true,
      body: true,
      image_url: true,
      category: true,
      read_at: true,
      created_at: true,
    },
  })

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    image_url: row.image_url,
    category: row.category,
    read_at: row.read_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  }))
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
