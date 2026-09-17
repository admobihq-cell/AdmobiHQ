import { NextResponse } from "next/server"

import { requireCustomerAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

/** Marks every unread campaign notification for the caller as read. */
export async function PATCH() {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  await prisma.customerNotification.updateMany({
    where: { clerk_user_id: auth.access.userId, read_at: null },
    data: { read_at: new Date() },
  })

  return NextResponse.json({ success: true })
}
