const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"

// Expo rejects batches above these sizes.
const SEND_CHUNK_SIZE = 100
const RECEIPT_CHUNK_SIZE = 1000

/** Error codes meaning the token is dead — stop sending to it. */
export const DEAD_TOKEN_ERRORS = new Set(["DeviceNotRegistered", "InvalidCredentials"])

export type ExpoPushPayload = {
  to: string
  title: string
  body: string
  sound?: "default" | null
  channelId?: string
  color?: string
  priority?: "default" | "normal" | "high"
  ttl?: number
  data?: Record<string, string>
  /**
   * Image shown in the notification itself. Android renders it with no extra
   * app config. iOS requires a Notification Service Extension the app does
   * not have yet, so iOS silently falls back to a text-only notification —
   * see the announcement image feature notes before assuming this reaches iOS.
   */
  richContent?: { image: string }
}

type ExpoTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message?: string; details?: { error?: string } }

type ExpoSendResponse = {
  data?: ExpoTicket[]
  errors?: { message?: string; code?: string }[]
}

/**
 * Per-message result. `queued` only means Expo accepted the payload — delivery
 * is confirmed later via {@link fetchExpoPushReceipts}.
 */
export type ExpoSendOutcome =
  | { status: "queued"; token: string; ticketId: string }
  | { status: "error"; token: string; errorCode: string; errorMessage?: string }

export type ExpoSendResult = {
  outcomes: ExpoSendOutcome[]
  /** Subset of rejected tokens that should be deleted. */
  invalidTokens: string[]
}

export async function sendExpoPushMessages(
  messages: ExpoPushPayload[],
): Promise<ExpoSendResult> {
  const outcomes: ExpoSendOutcome[] = []

  for (let i = 0; i < messages.length; i += SEND_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + SEND_CHUNK_SIZE)
    outcomes.push(...(await sendChunk(chunk)))
  }

  const invalidTokens = outcomes
    .filter((o) => o.status === "error" && DEAD_TOKEN_ERRORS.has(o.errorCode))
    .map((o) => o.token)

  return { outcomes, invalidTokens }
}

/**
 * Expo's validator only accepts `#rrggbb` in lowercase — `#0B6E4F` is rejected
 * with a VALIDATION_ERROR that fails the whole batch.
 */
function normalizeColor(color: string | undefined): string | undefined {
  if (!color) return undefined
  const hex = color.trim().toLowerCase()
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : undefined
}

async function sendChunk(chunk: ExpoPushPayload[]): Promise<ExpoSendOutcome[]> {
  let body: ExpoSendResponse

  const payloads = chunk.map((message) => ({
    ...message,
    color: normalizeColor(message.color),
  }))

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payloads),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error("[push] Expo Push API error:", response.status, text)
      const parsed = parseErrorBody(text)
      return chunk.map((message) => ({
        status: "error" as const,
        token: message.to,
        errorCode: parsed?.code ?? "RequestFailed",
        errorMessage: parsed?.message ?? `HTTP ${response.status}`,
      }))
    }

    body = (await response.json()) as ExpoSendResponse
  } catch (error) {
    console.error("[push] Expo Push API unreachable:", error)
    return chunk.map((message) => ({
      status: "error" as const,
      token: message.to,
      errorCode: "RequestFailed",
      errorMessage: error instanceof Error ? error.message : String(error),
    }))
  }

  const tickets = body.data
  if (!tickets) {
    const message = body.errors?.[0]?.message ?? "No tickets returned"
    console.error("[push] Expo Push API returned no tickets:", message)
    return chunk.map((payload) => ({
      status: "error" as const,
      token: payload.to,
      errorCode: body.errors?.[0]?.code ?? "RequestFailed",
      errorMessage: message,
    }))
  }

  return chunk.map((payload, index) => {
    const ticket = tickets[index]

    if (!ticket) {
      return {
        status: "error" as const,
        token: payload.to,
        errorCode: "MissingTicket",
      }
    }

    if (ticket.status === "ok") {
      return { status: "queued" as const, token: payload.to, ticketId: ticket.id }
    }

    const errorCode = ticket.details?.error ?? "UnknownTicketError"
    console.warn("[push] Ticket error:", errorCode, ticket.message, payload.to)
    return {
      status: "error" as const,
      token: payload.to,
      errorCode,
      errorMessage: ticket.message,
    }
  })
}

function parseErrorBody(text: string): { code?: string; message?: string } | null {
  try {
    const body = JSON.parse(text) as ExpoSendResponse
    const first = body.errors?.[0]
    return first ? { code: first.code, message: first.message } : null
  } catch {
    return null
  }
}

export type ExpoReceipt =
  | { status: "ok" }
  | { status: "error"; message?: string; details?: { error?: string } }

type ExpoReceiptResponse = {
  data?: Record<string, ExpoReceipt>
  errors?: { message?: string; code?: string }[]
}

/**
 * Looks up delivery receipts by ticket ID. Expo omits IDs it has no receipt for
 * yet, so a missing entry means "still unknown", not "failed".
 */
export async function fetchExpoPushReceipts(
  ticketIds: string[],
): Promise<Map<string, ExpoReceipt>> {
  const receipts = new Map<string, ExpoReceipt>()

  for (let i = 0; i < ticketIds.length; i += RECEIPT_CHUNK_SIZE) {
    const chunk = ticketIds.slice(i, i + RECEIPT_CHUNK_SIZE)

    const response = await fetch(EXPO_RECEIPTS_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: chunk }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      console.error("[push] Expo receipts error:", response.status, text)
      continue
    }

    const body = (await response.json()) as ExpoReceiptResponse
    if (body.errors?.length) {
      console.error("[push] Expo receipts error:", body.errors[0]?.message)
      continue
    }

    for (const [ticketId, receipt] of Object.entries(body.data ?? {})) {
      receipts.set(ticketId, receipt)
    }
  }

  return receipts
}
