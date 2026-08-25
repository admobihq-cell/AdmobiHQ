import { NextResponse } from "next/server"

import { requireCustomerAccess } from "@/lib/api-utils"
import { markAnnouncementDeliveriesRead } from "@/lib/push/announcement-inbox"

export async function PATCH() {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  await markAnnouncementDeliveriesRead("customer-web", auth.access.userId)
  return NextResponse.json({ success: true })
}
