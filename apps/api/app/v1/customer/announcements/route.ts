import { NextResponse } from "next/server"

import { requireCustomerAccess } from "@/lib/api-utils"
import { listAnnouncementDeliveriesPage } from "@/lib/push/announcement-inbox"
import { ensureCustomerRecord } from "@/lib/support"

export async function GET(req: Request) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  // customer-web has no push-token-style "register on launch" call, so this
  // poll (fired on window focus while the bell is mounted, see notification-bell.tsx)
  // doubles as that: it's what makes the caller a valid recipient the next
  // time ops broadcasts to "Customer web" (see collectWebRecipients).
  await ensureCustomerRecord(auth.access.userId)

  const url = new URL(req.url)
  const cursor = Number(url.searchParams.get("cursor")) || null
  const limit = Number(url.searchParams.get("limit")) || undefined

  return NextResponse.json(
    await listAnnouncementDeliveriesPage("customer-web", auth.access.userId, {
      cursor,
      limit,
    }),
  )
}
