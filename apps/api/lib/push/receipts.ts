import { prisma } from "@/lib/prisma"
import {
  DEAD_TOKEN_ERRORS,
  fetchExpoPushReceipts,
  type ExpoSendOutcome,
} from "@/lib/push/expo-push"

export type PushAudience = "customer" | "ops"

/** Expo advises waiting ~15 min before asking for receipts. */
const RECEIPT_DELAY_MINUTES = 15
/** Expo clears receipts after 24h, so a ticket older than that never resolves. */
const RECEIPT_TTL_HOURS = 24
/** getReceipts accepts at most 1000 ids per request. */
const MAX_TICKETS_PER_RUN = 1000

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000)
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3_600_000)
}

/** Persists what Expo said about each message so receipts can resolve it later. */
export async function recordPushTickets(input: {
  audience: PushAudience
  broadcastId?: number
  outcomes: ExpoSendOutcome[]
}): Promise<void> {
  if (input.outcomes.length === 0) return

  await prisma.pushTicket.createMany({
    data: input.outcomes.map((outcome) => ({
      ticket_id: outcome.status === "queued" ? outcome.ticketId : null,
      expo_push_token: outcome.token,
      audience: input.audience,
      broadcast_id: input.broadcastId ?? null,
      status: outcome.status === "queued" ? "pending" : "error",
      error_code: outcome.status === "error" ? outcome.errorCode : null,
      error_message: outcome.status === "error" ? (outcome.errorMessage ?? null) : null,
    })),
    skipDuplicates: true,
  })
}

export type ReceiptCheckSummary = {
  checked: number
  delivered: number
  failed: number
  expired: number
  stillPending: number
  prunedTokens: number
  errorCodes: Record<string, number>
}

/**
 * Resolves pending tickets against Expo's delivery receipts, drops tokens the
 * push services rejected, and refreshes the counters shown in the ops console.
 *
 * Cheap when there is nothing to do: the initial lookup is a single indexed
 * query that returns no rows, so this is safe to call on read paths.
 */
export async function checkPendingPushReceipts(
  options: { limit?: number } = {},
): Promise<ReceiptCheckSummary> {
  const summary: ReceiptCheckSummary = {
    checked: 0,
    delivered: 0,
    failed: 0,
    expired: 0,
    stillPending: 0,
    prunedTokens: 0,
    errorCodes: {},
  }

  const pending = await prisma.pushTicket.findMany({
    where: {
      status: "pending",
      ticket_id: { not: null },
      created_at: { lte: minutesAgo(RECEIPT_DELAY_MINUTES) },
    },
    orderBy: { created_at: "asc" },
    take: Math.min(options.limit ?? MAX_TICKETS_PER_RUN, MAX_TICKETS_PER_RUN),
  })

  if (pending.length === 0) return summary

  summary.checked = pending.length

  const receipts = await fetchExpoPushReceipts(
    pending.map((ticket) => ticket.ticket_id!).filter(Boolean),
  )

  const deliveredIds: number[] = []
  const expiredIds: number[] = []
  const deadTokens = new Map<PushAudience, Set<string>>()
  const failures: { id: number; errorCode: string; errorMessage?: string }[] = []
  const expiryCutoff = hoursAgo(RECEIPT_TTL_HOURS)

  for (const ticket of pending) {
    const receipt = receipts.get(ticket.ticket_id!)

    if (!receipt) {
      // Expo omits ids it has no receipt for yet — only give up past the TTL.
      if (ticket.created_at < expiryCutoff) {
        expiredIds.push(ticket.id)
      } else {
        summary.stillPending += 1
      }
      continue
    }

    if (receipt.status === "ok") {
      deliveredIds.push(ticket.id)
      continue
    }

    const errorCode = receipt.details?.error ?? "UnknownReceiptError"
    failures.push({ id: ticket.id, errorCode, errorMessage: receipt.message })
    summary.errorCodes[errorCode] = (summary.errorCodes[errorCode] ?? 0) + 1

    if (DEAD_TOKEN_ERRORS.has(errorCode)) {
      const audience = ticket.audience as PushAudience
      const tokens = deadTokens.get(audience) ?? new Set<string>()
      tokens.add(ticket.expo_push_token)
      deadTokens.set(audience, tokens)
    }
  }

  summary.delivered = deliveredIds.length
  summary.failed = failures.length
  summary.expired = expiredIds.length

  if (deliveredIds.length > 0) {
    await prisma.pushTicket.updateMany({
      where: { id: { in: deliveredIds } },
      data: { status: "ok" },
    })
  }

  if (expiredIds.length > 0) {
    await prisma.pushTicket.updateMany({
      where: { id: { in: expiredIds } },
      data: { status: "expired", error_code: "NoReceipt" },
    })
  }

  // Grouped by code so one updateMany covers every ticket sharing a failure.
  const byErrorCode = new Map<string, { ids: number[]; message?: string }>()
  for (const failure of failures) {
    const entry = byErrorCode.get(failure.errorCode) ?? { ids: [], message: failure.errorMessage }
    entry.ids.push(failure.id)
    byErrorCode.set(failure.errorCode, entry)
  }

  for (const [errorCode, entry] of byErrorCode) {
    await prisma.pushTicket.updateMany({
      where: { id: { in: entry.ids } },
      data: { status: "error", error_code: errorCode, error_message: entry.message ?? null },
    })
    console.warn(`[push] Receipt error ${errorCode} on ${entry.ids.length} message(s)`)
  }

  summary.prunedTokens = await pruneDeadTokens(deadTokens)
  await refreshBroadcastCounts(pending.map((ticket) => ticket.broadcast_id))

  return summary
}

async function pruneDeadTokens(deadTokens: Map<PushAudience, Set<string>>): Promise<number> {
  let pruned = 0

  for (const [audience, tokens] of deadTokens) {
    const expo_push_token = { in: [...tokens] }
    const result =
      audience === "ops"
        ? await prisma.opsPushToken.deleteMany({ where: { expo_push_token } })
        : await prisma.customerPushToken.deleteMany({ where: { expo_push_token } })
    pruned += result.count
  }

  return pruned
}

/** Recomputes delivered/invalid counters from ticket rows, which are the truth. */
async function refreshBroadcastCounts(broadcastIds: (number | null)[]): Promise<void> {
  const ids = [...new Set(broadcastIds.filter((id): id is number => id !== null))]
  if (ids.length === 0) return

  const grouped = await prisma.pushTicket.groupBy({
    by: ["broadcast_id", "status"],
    where: { broadcast_id: { in: ids } },
    _count: { _all: true },
  })

  const counts = new Map<number, Record<string, number>>()
  for (const row of grouped) {
    if (row.broadcast_id === null) continue
    const entry = counts.get(row.broadcast_id) ?? {}
    entry[row.status] = row._count._all
    counts.set(row.broadcast_id, entry)
  }

  for (const [broadcastId, entry] of counts) {
    const delivered = entry.ok ?? 0
    const invalid = entry.error ?? 0
    const stillPending = entry.pending ?? 0

    await prisma.announcementBroadcast.update({
      where: { id: broadcastId },
      data: {
        delivered_count: delivered,
        invalid_count: invalid,
        status: stillPending > 0 ? "sending" : delivered > 0 ? "sent" : "failed",
      },
    })
  }
}
