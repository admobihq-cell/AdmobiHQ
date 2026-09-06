import { NextResponse } from "next/server"

import { jsonError, parseId, requireCustomerAccess } from "@/lib/api-utils"
import { setCustomerNotificationRead } from "@/lib/push/customer-notification-inbox"

type Params = { params: Promise<{ id: string }> }

/** Flip one campaign notification's read state. Body: `{ read: boolean }`. */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const body = (await req.json().catch(() => ({}))) as { read?: unknown }
  const read = body.read === undefined ? true : Boolean(body.read)

  const changed = await setCustomerNotificationRead(auth.access.userId, id, read)
  if (!changed) return jsonError("Not found", 404)

  return NextResponse.json({ success: true })
}
