import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}) {
  try {
    const result = await resend.emails.send({
      from: process.env.SENDER_EMAIL || "noreply@admobi.co",
      to,
      subject,
      react,
    })

    if (result.error) {
      console.error("[Resend Error]", result.error)
      throw new Error(`Failed to send email: ${result.error.message}`)
    }

    console.log(`[Email Sent] To: ${to}, Subject: ${subject}`)
    return result
  } catch (error) {
    console.error("[Resend Send Error]", error)
    throw error
  }
}
