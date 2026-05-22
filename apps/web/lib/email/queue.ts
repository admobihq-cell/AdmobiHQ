// eslint-disable-next-line @typescript-eslint/no-explicit-any
let emailQueue: any = null
let processorStarted = false

export async function getEmailQueue() {
  // Only initialize Bull if we're in a Node.js environment (not during build)
  if (!emailQueue && typeof require !== "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Bull = require("bull").default || require("bull")
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6380"

      emailQueue = new Bull("email", {
        redis: {
          url: redisUrl,
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          enableOfflineQueue: false,
          connectTimeout: 10000,
          commandTimeout: 5000,
        },
        settings: {
          retryProcess: {
            delay: 5000,
            times: 1,
          },
        },
      })

      if (!processorStarted) {
        processorStarted = true
        startProcessor(emailQueue)
      }
    } catch (error) {
      console.error("[Email Queue] Failed to initialize Bull:", error)
      throw error
    }
  }

  return emailQueue
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function startProcessor(queue: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queue.process(async (job: any) => {
    const { to, subject, html } = job.data as { to: string; subject: string; html: string }

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

      console.log(`[Email Queue] Email sent to ${to}`)
      return { success: true, to }
    } catch (error) {
      console.error(`[Email Queue] Processing failed for job ${job.id}:`, error)
      throw error
    }
  })
}

export async function stopEmailQueue() {
  if (emailQueue) {
    await emailQueue.close()
    emailQueue = null
    processorStarted = false
  }
}
