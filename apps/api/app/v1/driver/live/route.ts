import { requireDriverAccess } from "@/lib/api-utils"
import { liveStreamResponse } from "@/lib/live-stream"
import { liveChannel, liveRedis } from "@/lib/realtime"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/** SSE stream of the driver's own events (ids only). The token is verified on every connect. */
export async function GET(req: Request) {
  if (!liveRedis()) return new Response(null, { status: 204 })
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error
  return liveStreamResponse(req, [liveChannel.user(auth.access.userId)])
}
