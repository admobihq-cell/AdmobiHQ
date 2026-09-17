import { prisma } from "@/lib/prisma"
import { sendExpoPushMessages } from "@/lib/push/expo-push"
import { recordPushTickets } from "@/lib/push/receipts"

export type OpsAlertType =
  | "campaign"
  | "campaign_submission"
  | "fleet"
  | "driver"
  | "waitlist"
  | "media-kit"
  | "support"
  | "safety"

const TYPE_LABELS: Record<OpsAlertType, string> = {
  campaign: "Campaign brief",
  campaign_submission: "Campaign submission",
  fleet: "Fleet partnership",
  driver: "Driver lead",
  waitlist: "Waitlist signup",
  "media-kit": "Media kit request",
  support: "Support case",
  safety: "SOS",
}

/** "campaign" is the anonymous marketing-site brief and routes to the leads
 * queue; "campaign_submission" is a signed-in advertiser's real campaign and
 * routes to the campaigns review queue. Do NOT collapse these — repointing
 * "campaign" would silently misroute every existing marketing-lead alert. */
const ROUTE_SEGMENT: Record<OpsAlertType, string> = {
  campaign: "leads",
  campaign_submission: "campaigns",
  fleet: "fleet",
  driver: "drivers",
  waitlist: "waitlist",
  "media-kit": "media-kit",
  support: "support",
  safety: "sos",
}

export type OpsStaffAlertInput = {
  type: OpsAlertType
  entityId: number
  submitterName: string
  submitterCompany?: string
  /**
   * SOS overrides the default "New <label>" / submitter-name copy: an
   * emergency needs its own wording, its own red colour, and its own Android
   * channel — without a registered high-importance channel Android silently
   * downgrades the alert and the sound never plays. Every override defaults to
   * today's value, so no existing alert type changes behaviour.
   */
  title?: string
  body?: string
  channelId?: string
  color?: string
}

/** Fire-and-forget push to all registered ops staff devices. */
export async function notifyOpsStaffAlert(input: OpsStaffAlertInput) {
  try {
    const tokens = await prisma.opsPushToken.findMany({
      select: { id: true, expo_push_token: true },
    })

    if (tokens.length === 0) {
      return
    }

    const title = input.title ?? `New ${TYPE_LABELS[input.type]}`
    const body =
      input.body ??
      (input.submitterCompany
        ? `${input.submitterName} · ${input.submitterCompany}`
        : input.submitterName)
    const segment = ROUTE_SEGMENT[input.type]

    const messages = tokens.map((row) => ({
      to: row.expo_push_token,
      title,
      body,
      sound: "default" as const,
      channelId: input.channelId ?? "default",
      color: input.color ?? "#0b6e4f",
      priority: "high" as const,
      data: {
        type: input.type,
        id: String(input.entityId),
        href: `/(ops)/${segment}/${input.entityId}`,
      },
    }))

    const { outcomes, invalidTokens } = await sendExpoPushMessages(messages)

    await recordPushTickets({ audience: "ops", outcomes })

    if (invalidTokens.length > 0) {
      await prisma.opsPushToken.deleteMany({
        where: { expo_push_token: { in: invalidTokens } },
      })
    }

    const queued = outcomes.filter((outcome) => outcome.status === "queued").length
    console.log(
      `[push] Ops alert queued (${input.type} #${input.entityId}) for ${queued}/${tokens.length} device(s)`,
    )
  } catch (error) {
    console.error("[push] Failed to notify ops staff:", error)
  }
}
