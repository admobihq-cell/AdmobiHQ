import { requireCustomerAccess } from "@/lib/api-utils"
import { liveStreamResponse } from "@/lib/live-stream"
import { liveChannel } from "@/lib/realtime"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/** SSE stream of live events for the caller (their notifications) and their org (billing, payments). */
export async function GET(req: Request) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error
  return liveStreamResponse(req, [liveChannel.user(auth.access.userId), liveChannel.org(auth.access.orgId)])
}
