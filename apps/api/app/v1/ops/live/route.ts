import { requireOpsAccess } from "@/lib/api-utils"
import { liveStreamResponse } from "@/lib/live-stream"
import { liveChannel } from "@/lib/realtime"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/** SSE stream of ops queue events. Ids only: the client re-fetches what the viewer may see. */
export async function GET(req: Request) {
  const auth = await requireOpsAccess()
  if (auth.error) return auth.error
  return liveStreamResponse(req, [liveChannel.ops])
}
