export interface EmailJobData {
  to: string
  subject: string
  html: string
}

export async function queueEmail(data: EmailJobData) {
  try {
    const { getEmailQueue } = await import("./queue")
    const queue = await getEmailQueue()
    const job = await queue.add(data, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
    })

    console.log(`[Email Queue] Job ${job.id} queued for ${data.to}`)
    return job
  } catch (error) {
    console.error("[Email Queue] Failed to queue email:", error)
    throw error
  }
}
