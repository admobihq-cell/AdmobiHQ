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
    color: "#0B6E4F",
    // High priority wakes doze-mode Android devices so the tray banner shows promptly.
    priority: "high" as const,
    data: { type: "announcement", category: input.category },
  }))

  let queued = 0
  let status = "sending"

  try {
    const { outcomes, invalidTokens } = await sendExpoPushMessages(messages)
    queued = outcomes.filter((outcome) => outcome.status === "queued").length

    await recordPushTickets({
      audience: "customer",
      broadcastId: broadcast.id,
      outcomes,
    })

    if (invalidTokens.length > 0) {
      await prisma.customerPushToken.deleteMany({
        where: { expo_push_token: { in: invalidTokens } },
      })
    }

    if (queued === 0) {
      status = "failed"
    }
  } catch (error) {
    console.error("[push] Failed to broadcast to customers:", error)
    status = "failed"
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
