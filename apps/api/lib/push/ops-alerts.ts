import { prisma } from "@/lib/prisma"
import { sendExpoPushMessages } from "@/lib/push/expo-push"
import { recordPushTickets } from "@/lib/push/receipts"

export type OpsAlertType =
  | "campaign"
  | "fleet"
  | "driver"
  | "waitlist"
  | "media-kit"
  | "support"

const TYPE_LABELS: Record<OpsAlertType, string> = {
  campaign: "Campaign brief",
  fleet: "Fleet partnership",
  driver: "Driver application",
  waitlist: "Waitlist signup",
  "media-kit": "Media kit request",
  support: "Support case",
}

const ROUTE_SEGMENT: Record<OpsAlertType, string> = {
  campaign: "leads",
  fleet: "fleet",
  driver: "drivers",
  waitlist: "waitlist",
  "media-kit": "media-kit",
  support: "support",
}

export type OpsStaffAlertInput = {
  type: OpsAlertType
  entityId: number
  submitterName: string
  submitterCompany?: string
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

    const title = `New ${TYPE_LABELS[input.type]}`
    const body = input.submitterCompany
      ? `${input.submitterName} · ${input.submitterCompany}`
      : input.submitterName
    const segment = ROUTE_SEGMENT[input.type]

    const messages = tokens.map((row) => ({
      to: row.expo_push_token,
      title,
      body,
      sound: "default" as const,
      channelId: "default",
      color: "#0b6e4f",
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
