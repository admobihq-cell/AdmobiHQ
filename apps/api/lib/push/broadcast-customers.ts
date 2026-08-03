import type { BroadcastCreateInput } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"
import { sendExpoPushMessages } from "@/lib/push/expo-push"
import { recordPushTickets } from "@/lib/push/receipts"

export type BroadcastSender = {
  clerkUserId: string
  email: string
}

export async function broadcastToCustomers(
  input: BroadcastCreateInput,
  sender: BroadcastSender,
) {
  const tokens = await prisma.customerPushToken.findMany({
    select: { id: true, expo_push_token: true },
  })

  const broadcast = await prisma.announcementBroadcast.create({
    data: {
      title: input.title,
      body: input.body,
      category: input.category,
      image_url: input.image_url ?? null,
      sent_by_clerk_id: sender.clerkUserId,
      sent_by_email: sender.email,
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
    console.error("[push] Failed to send customer broadcast:", error)
    status = "failed"
  }

  // Record whatever tickets we do have even if something below throws —
  // otherwise a real send that fails only during bookkeeping leaves nothing
  // for checkPendingPushReceipts() to reconcile against later.
  if (outcomes.length > 0) {
    try {
      await recordPushTickets({
        audience: "customer",
        broadcastId: broadcast.id,
        outcomes,
      })
    } catch (error) {
      console.error("[push] Failed to record push tickets:", error)
    }
  }

  if (invalidTokens.length > 0) {
    try {
      await prisma.customerPushToken.deleteMany({
        where: { expo_push_token: { in: invalidTokens } },
      })
    } catch (error) {
      console.error("[push] Failed to clean up invalid tokens:", error)
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
