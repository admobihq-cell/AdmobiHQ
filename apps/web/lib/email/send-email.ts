export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.SENDER_EMAIL || "onboarding@resend.dev",
        to,
        subject,
        html,
      }),
    })

    if (!result.ok) {
      const error = await result.text()
      throw new Error(`Resend error: ${error}`)
    }

    console.log(`[Email] Email sent to ${to}`)
    return { success: true, to }
  } catch (error) {
    console.error(`[Email] Failed to send email to ${to}:`, error)
    throw error
  }
}
