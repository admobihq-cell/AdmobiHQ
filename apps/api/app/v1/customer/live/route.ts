import { jsonError, requireCustomerAccess } from "@/lib/api-utils"
import { getCustomerIdentity } from "@/lib/customer/customer-auth"
import { liveStreamResponse } from "@/lib/live-stream"
import { liveChannel, liveRedis, readLiveOrgId, writeLiveOrgId } from "@/lib/realtime"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * SSE stream of live events for the caller (their notifications) and their org (billing,
 * payments). The token is verified on every connect; the org comes from an Upstash cache after
 * the first one, so the routine reconnect never touches Postgres.
 */
export async function GET(req: Request) {
  if (!liveRedis()) return new Response(null, { status: 204 })
  const userId = await getCustomerIdentity()
  if (!userId) return jsonError("Unauthorized", 401)

  let orgId = await readLiveOrgId(userId)
  if (orgId === null) {
    const auth = await requireCustomerAccess()
    if (auth.error) return auth.error
    orgId = auth.access.orgId
    await writeLiveOrgId(userId, orgId)
  }
  return liveStreamResponse(req, [liveChannel.user(userId), liveChannel.org(orgId)])
}
