import type { BroadcastCreateInput } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"
import { sendExpoPushMessages } from "@/lib/push/expo-push"

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
    data: { type: "announcement" },
  }))

  let invalidTokens: string[] = []
  let status = "sent"

  try {
    const result = await sendExpoPushMessages(messages)
    invalidTokens = result.invalidTokens

    if (invalidTokens.length > 0) {
      await prisma.customerPushToken.deleteMany({
        where: { expo_push_token: { in: invalidTokens } },
      })
    }
  } catch (error) {
    console.error("[push] Failed to broadcast to customers:", error)
    status = "failed"
  }

  return prisma.announcementBroadcast.update({
    where: { id: broadcast.id },
    data: {
      delivered_count: tokens.length - invalidTokens.length,
      invalid_count: invalidTokens.length,
      status,
    },
  })
}
