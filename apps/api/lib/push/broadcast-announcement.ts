import type { AnnouncementTargetApp, BroadcastCreateInput } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"
import { sendExpoPushMessages } from "@/lib/push/expo-push"
import { recordPushTickets, type PushAudience } from "@/lib/push/receipts"

export type BroadcastSender = {
  clerkUserId: string
  email: string
}

const AUDIENCE_BY_APP: Record<AnnouncementTargetApp, PushAudience> = {
  "customer-mobile": "customer",
  "driver-mobile": "driver",
}

type TargetToken = { expo_push_token: string; audience: PushAudience }

async function collectTargetTokens(targetApps: AnnouncementTargetApp[]): Promise<TargetToken[]> {
  const tokens: TargetToken[] = []

  if (targetApps.includes("customer-mobile")) {
    const rows = await prisma.customerPushToken.findMany({ select: { expo_push_token: true } })
    tokens.push(...rows.map((row) => ({ expo_push_token: row.expo_push_token, audience: AUDIENCE_BY_APP["customer-mobile"] })))
  }

  if (targetApps.includes("driver-mobile")) {
    const rows = await prisma.driverPushToken.findMany({ select: { expo_push_token: true } })
    tokens.push(...rows.map((row) => ({ expo_push_token: row.expo_push_token, audience: AUDIENCE_BY_APP["driver-mobile"] })))
  }

  return tokens
}

export async function broadcastAnnouncement(
  input: BroadcastCreateInput,
  sender: BroadcastSender,
) {
  const targetApps = input.target_apps
  const tokens = await collectTargetTokens(targetApps)
  // Every token string is unique to the Expo project (app) it was issued for,
  // so a token→audience map is a safe, order-independent way to re-attribute
  // outcomes/invalid tokens after the combined send below.
  const audienceByToken = new Map(tokens.map((row) => [row.expo_push_token, row.audience]))

  const broadcast = await prisma.announcementBroadcast.create({
    data: {
      title: input.title,
      body: input.body,
      category: input.category,
      image_url: input.image_url ?? null,
      sent_by_clerk_id: sender.clerkUserId,
      sent_by_email: sender.email,
      target_apps: targetApps,
      target_count: tokens.length,
      status: tokens.length === 0 ? "sent" : "sending",
    },
  })

  if (tokens.length === 0) {
    return broadcast
  }

  const messages = tokens.map((row) => ({
    to: row.expo_push_token,
    title: input.title,
    body: input.body,
    sound: "default" as const,
    channelId: "default",
    color: "#0b6e4f",
    // High priority wakes doze-mode Android devices so the tray banner shows promptly.
    priority: "high" as const,
    data: { type: "announcement", category: input.category },
    // Android renders this in the push banner automatically. iOS needs a
    // Notification Service Extension the app doesn't have yet, so it's
    // harmless to include — iOS just ignores it and shows text-only.
    ...(input.image_url ? { richContent: { image: input.image_url } } : {}),
  }))

  let outcomes: Awaited<ReturnType<typeof sendExpoPushMessages>>["outcomes"] = []
  let invalidTokens: string[] = []
  let queued = 0
  let status = "sending"

  try {
    ;({ outcomes, invalidTokens } = await sendExpoPushMessages(messages))
    queued = outcomes.filter((outcome) => outcome.status === "queued").length
    if (queued === 0) status = "failed"
  } catch (error) {
    console.error("[push] Failed to send announcement broadcast:", error)
    status = "failed"
  }

  // Record whatever tickets we do have even if something below throws —
  // otherwise a real send that fails only during bookkeeping leaves nothing
  // for checkPendingPushReceipts() to reconcile against later. Grouped by
  // audience so PushTicket.audience stays correctly attributed per app.
  if (outcomes.length > 0) {
    const outcomesByAudience = new Map<PushAudience, typeof outcomes>()
    for (const outcome of outcomes) {
      const audience = audienceByToken.get(outcome.token)
      if (!audience) continue
      const group = outcomesByAudience.get(audience) ?? []
      group.push(outcome)
      outcomesByAudience.set(audience, group)
    }

    for (const [audience, group] of outcomesByAudience) {
      try {
        await recordPushTickets({ audience, broadcastId: broadcast.id, outcomes: group })
      } catch (error) {
        console.error("[push] Failed to record push tickets:", error)
      }
    }
  }

  if (invalidTokens.length > 0) {
    const invalidByAudience = new Map<PushAudience, string[]>()
    for (const token of invalidTokens) {
      const audience = audienceByToken.get(token)
      if (!audience) continue
      const group = invalidByAudience.get(audience) ?? []
      group.push(token)
      invalidByAudience.set(audience, group)
    }

    for (const [audience, group] of invalidByAudience) {
      try {
        if (audience === "driver") {
          await prisma.driverPushToken.deleteMany({ where: { expo_push_token: { in: group } } })
        } else if (audience === "customer") {
          await prisma.customerPushToken.deleteMany({ where: { expo_push_token: { in: group } } })
        }
      } catch (error) {
        console.error("[push] Failed to clean up invalid tokens:", error)
      }
    }
  }

  // delivered_count stays 0 until receipts land — a queued message is not a
  // delivered one. checkPendingPushReceipts() fills these in.
  return prisma.announcementBroadcast.update({
    where: { id: broadcast.id },
    data: {
      delivered_count: 0,
      invalid_count: tokens.length - queued,
      status,
    },
  })
}
