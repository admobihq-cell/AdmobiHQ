import { NextResponse } from "next/server"

import { jsonError, parseId, requireDriverAccess } from "@/lib/api-utils"
import { setAnnouncementDeliveryRead } from "@/lib/push/announcement-inbox"

type Params = { params: Promise<{ id: string }> }

/** Flip one announcement's read state. Body: `{ read: boolean }` (defaults to true). */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const body = (await req.json().catch(() => ({}))) as { read?: unknown }
  const read = body.read === undefined ? true : Boolean(body.read)

  const changed = await setAnnouncementDeliveryRead(
    "driver-web",
    auth.access.userId,
    id,
    read,
  )
  if (!changed) return jsonError("Not found", 404)

  return NextResponse.json({ success: true })
}
