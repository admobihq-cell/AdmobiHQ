import { NextResponse } from "next/server"

import { requireDriverAccess } from "@/lib/api-utils"
import { markAnnouncementDeliveriesRead } from "@/lib/push/announcement-inbox"

export async function PATCH() {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  await markAnnouncementDeliveriesRead("driver-web", auth.access.userId)
  return NextResponse.json({ success: true })
}
