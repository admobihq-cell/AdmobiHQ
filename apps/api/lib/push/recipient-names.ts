import { customerClerkClient } from "@/lib/customer-clerk"
import { driverClerkClient } from "@/lib/driver-clerk"

/** Clerk's Backend API caps getUserList at 100 user ids per request. */
const BATCH_SIZE = 100

/**
 * Batched firstName lookup for announcement personalization. Never throws —
 * a Clerk hiccup or a stale/deleted user id should just leave that recipient
 * unpersonalized, not fail the whole broadcast. Ids with no resolvable name
 * (deleted account, no firstName set) are simply absent from the returned map.
 */
export async function resolveFirstNames(
  audience: "customer" | "driver",
  clerkUserIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  const uniqueIds = [...new Set(clerkUserIds)]
  if (uniqueIds.length === 0) return names

  const client = audience === "customer" ? customerClerkClient : driverClerkClient

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const chunk = uniqueIds.slice(i, i + BATCH_SIZE)
    try {
      const { data } = await client.users.getUserList({ userId: chunk, limit: BATCH_SIZE })
      for (const user of data) {
        if (user.firstName) names.set(user.id, user.firstName)
      }
    } catch (error) {
      console.error(`[push] Failed to resolve ${audience} names for a batch:`, error)
    }
  }

  return names
}
