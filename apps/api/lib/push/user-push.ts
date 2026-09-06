import { prisma } from "@/lib/prisma"
import { sendExpoPushMessages } from "@/lib/push/expo-push"
import { recordPushTickets } from "@/lib/push/receipts"

/**
 * Push to the devices of ONE user.
 *
 * The repo's other two push paths are both broadcasts —
 * lib/push/ops-alerts.ts hits every ops device and
 * lib/push/broadcast-announcement.ts hits everyone on a target app. Nothing
 * addressed a single person, which is why driver review decisions currently
 * reach a driver's inbox and inbox only, never their phone.
 *
 * Kept audience-generic rather than customer-specific so the driver lifecycle
 * routes can adopt it as a two-line change instead of growing a second copy.
 */

/** Audiences with a per-user token table. "ops" is deliberately absent: ops
 * notifications are staff-wide alerts, and lib/push/ops-alerts.ts already owns
 * that path. */
export type UserPushAudience = "customer" | "driver"

export type UserPushMessage = {
  title: string
  body: string
  /** In-app deep link, e.g. "/campaigns/42". Delivered in `data.href`, which
   * the apps' notification-response handlers route on. */
  href?: string
  data?: Record<string, string>
}

// Prisma's two delegates don't unify into a callable union type, so the table
// is picked per call rather than aliased — the same ternary shape
// lib/push/broadcast-announcement.ts uses for exactly this reason.
function findUserTokens(audience: UserPushAudience, clerkUserId: string) {
  const where = { clerk_user_id: clerkUserId }
  const select = { expo_push_token: true } as const
  return audience === "customer"
    ? prisma.customerPushToken.findMany({ where, select })
    : prisma.driverPushToken.findMany({ where, select })
}

function deleteUserTokens(audience: UserPushAudience, expoPushTokens: string[]) {
  const where = { expo_push_token: { in: expoPushTokens } }
  return audience === "customer"
    ? prisma.customerPushToken.deleteMany({ where })
    : prisma.driverPushToken.deleteMany({ where })
}

export async function notifyUserPush(
  audience: UserPushAudience,
  clerkUserId: string,
  message: UserPushMessage,
): Promise<void> {
  try {
    const tokens = await findUserTokens(audience, clerkUserId)

    // The common case for a web-only advertiser, and not an error: return
    // quietly rather than logging noise on every campaign decision.
    if (tokens.length === 0) return

    const messages = tokens.map((row) => ({
      to: row.expo_push_token,
      title: message.title,
      body: message.body,
      sound: "default" as const,
      channelId: "default",
      color: "#0b6e4f",
      priority: "high" as const,
      data: {
        ...(message.href ? { href: message.href } : {}),
        ...message.data,
      },
    }))

    const { outcomes, invalidTokens } = await sendExpoPushMessages(messages)

    await recordPushTickets({ audience, outcomes })

    if (invalidTokens.length > 0) {
      await deleteUserTokens(audience, invalidTokens)
    }

    const queued = outcomes.filter((outcome) => outcome.status === "queued").length
    console.log(
      `[push] User alert queued (${audience}) for ${queued}/${tokens.length} device(s)`,
    )
  } catch (error) {
    // Fire-and-forget by contract: callers invoke this from the trailing
    // notification block of a route that has already committed its write. A
    // dead token must never fail a campaign submission.
    console.error("[push] Failed to notify user:", error)
  }
}
