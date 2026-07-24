import { Resend } from "resend"

import { getSenderEmail, resolveRecipients } from "@/lib/email/config"

const resend = new Resend(process.env.resend_api_key)

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string | string[]
  subject: string
  react: React.ReactElement
}) {
  const recipients = resolveRecipients(to)
  if (recipients.length === 0) {
    console.warn("[Resend] Skipped send: no recipient address")
    return { success: false, skipped: true as const }
  }

  try {
    const result = await resend.emails.send({
      from: getSenderEmail(),
      to: recipients,
      subject,
      react,
    })

    if (result.error) {
      console.error("[Resend Error]", result.error)
      throw new Error(`Failed to send email: ${result.error.message}`)
    }

    console.log(`[Email Sent] To: ${recipients.join(", ")}, Subject: ${subject}`)
    return result
  } catch (error) {
    console.error("[Resend Send Error]", error)
    throw error
  }
}
