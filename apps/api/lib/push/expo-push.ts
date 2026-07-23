const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

export type ExpoPushPayload = {
  to: string
  title: string
  body: string
  sound?: "default" | null
  channelId?: string
  color?: string
  data?: Record<string, string>
}

type ExpoPushTicket =
  | { status: "ok"; id: string }
  | { status: "error"; message?: string; details?: { error?: string } }

type ExpoPushResponse = {
  data: ExpoPushTicket[]
}

export async function sendExpoPushMessages(
  messages: ExpoPushPayload[],
): Promise<{ invalidTokens: string[] }> {
  if (messages.length === 0) {
    return { invalidTokens: [] }
  }

  const invalidTokens: string[] = []

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100)
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    })

    if (!response.ok) {
      console.error(
        "[push] Expo Push API error:",
        response.status,
        await response.text().catch(() => ""),
      )
      continue
    }

    const body = (await response.json()) as ExpoPushResponse
    body.data.forEach((ticket, index) => {
      if (ticket.status !== "error") return
      const token = chunk[index]?.to
      const code = ticket.details?.error
      if (
        token &&
        (code === "DeviceNotRegistered" || code === "InvalidCredentials")
      ) {
        invalidTokens.push(token)
      }
      console.warn("[push] Ticket error:", ticket.message ?? code, token)
    })
  }

  return { invalidTokens }
}
