const DEFAULT_SENDER = "Admobi <noreply@admobihq.com>"

const DEFAULT_ADMIN_EMAILS = [
  "admobihq@gmail.com",
  "victor@admobihq.com",
  "masinde@admobihq.com",
] as const

export function getSenderEmail(): string {
  const configured = process.env.SENDER_EMAIL?.trim()
  return configured || DEFAULT_SENDER
}

function parseEmailList(raw: string): string[] {
  return raw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
}

/** Admin inboxes for lead/driver submission alerts. */
export function getAdminEmails(): string[] {
  const configured = process.env.ADMIN_EMAIL?.trim()
  if (configured) {
    return parseEmailList(configured)
  }
  return [...DEFAULT_ADMIN_EMAILS]
}

/** Resolve one or more recipients; optional dev redirect via TEST_RECIPIENT_EMAIL. */
export function resolveRecipients(to: string | string[]): string[] {
  const list = Array.isArray(to) ? to : [to]
  const testInbox = process.env.TEST_RECIPIENT_EMAIL?.trim()

  if (process.env.NODE_ENV === "development" && testInbox) {
    return [testInbox]
  }

  const resolved = list
    .map((address) => address.trim())
    .filter(Boolean)

  return [...new Set(resolved)]
}

/** @deprecated Use resolveRecipients */
export function resolveRecipient(to: string): string | null {
  const [recipient] = resolveRecipients(to)
  return recipient ?? null
}
