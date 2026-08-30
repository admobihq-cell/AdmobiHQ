import { NextResponse } from "next/server"

import { requireDriverAccess } from "@/lib/api-utils"
import { listDriverNotificationsPage } from "@/lib/push/driver-notification-inbox"

export async function GET(req: Request) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const url = new URL(req.url)
  const cursor = Number(url.searchParams.get("cursor")) || null
  const limit = Number(url.searchParams.get("limit")) || undefined

  return NextResponse.json(
    await listDriverNotificationsPage(auth.access.userId, { cursor, limit }),
  )
}
