import { NextResponse } from "next/server"

import { requireCustomerAccess } from "@/lib/api-utils"
import { listAnnouncementDeliveries } from "@/lib/push/announcement-inbox"
import { ensureCustomerRecord } from "@/lib/support"

export async function GET() {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  // customer-web has no push-token-style "register on launch" call, so this
  // poll (fired every 60s while the bell is mounted, see notification-bell.tsx)
  // doubles as that: it's what makes the caller a valid recipient the next
  // time ops broadcasts to "Customer web" (see collectWebRecipients).
  await ensureCustomerRecord(auth.access.userId)

  return NextResponse.json(await listAnnouncementDeliveries("customer-web", auth.access.userId))
}
