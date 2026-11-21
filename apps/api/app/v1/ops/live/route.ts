import { jsonError } from "@/lib/api-utils"
import { getOpsLiveAccess } from "@/lib/auth"
import { liveStreamResponse } from "@/lib/live-stream"
import { liveChannel, liveRedis } from "@/lib/realtime"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/** SSE stream of ops queue events. Ids only: the client re-fetches what the viewer may see. */
export async function GET(req: Request) {
  if (!liveRedis()) return new Response(null, { status: 204 })
  const access = await getOpsLiveAccess()
  if (access === "unauthenticated") return jsonError("Unauthorized", 401)
  if (access === "forbidden") return jsonError("Forbidden", 403)
  return liveStreamResponse(req, [liveChannel.ops])
}
