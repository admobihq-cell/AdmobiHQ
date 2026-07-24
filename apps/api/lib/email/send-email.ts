import {
  getAdminEmails,
  getSenderEmail,
  resolveRecipients,
} from "@/lib/email/config"

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
) {
  const recipients = resolveRecipients(to)
  if (recipients.length === 0) {
    console.warn("[Email] Skipped send: no recipient address")
    return { success: false, skipped: true as const }
  }

  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.resend_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getSenderEmail(),
        to: recipients.length === 1 ? recipients[0] : recipients,
        subject,
        html,
      }),
    })

    if (!result.ok) {
      const error = await result.text()
      throw new Error(`Resend error: ${error}`)
    }

    console.log(`[Email] Email sent to ${recipients.join(", ")}`)
    return { success: true, to: recipients }
  } catch (error) {
    console.error(`[Email] Failed to send email to ${recipients.join(", ")}:`, error)
    throw error
  }
}

export async function sendAdminEmail(subject: string, html: string) {
  return sendEmail(getAdminEmails(), subject, html)
}
