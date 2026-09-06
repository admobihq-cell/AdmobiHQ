import { NextResponse } from "next/server"

import { requireCustomerAccess } from "@/lib/api-utils"
import { listCustomerNotificationsPage } from "@/lib/push/customer-notification-inbox"

export async function GET(req: Request) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const url = new URL(req.url)
  const cursor = Number(url.searchParams.get("cursor")) || null
  const limit = Number(url.searchParams.get("limit")) || undefined

  return NextResponse.json(
    await listCustomerNotificationsPage(auth.access.userId, { cursor, limit }),
  )
}
