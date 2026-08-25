import { NextResponse } from "next/server"

import { requireDriverAccess } from "@/lib/api-utils"
import { listAnnouncementDeliveries } from "@/lib/push/announcement-inbox"

export async function GET() {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  return NextResponse.json(await listAnnouncementDeliveries("driver-web", auth.access.userId))
}
