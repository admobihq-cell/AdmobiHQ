import { NextResponse } from "next/server"

import { requireCustomerAccess } from "@/lib/api-utils"
import { listAnnouncementDeliveries } from "@/lib/push/announcement-inbox"

export async function GET() {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  return NextResponse.json(await listAnnouncementDeliveries("customer-mobile", auth.access.userId))
}
