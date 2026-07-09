import * as Sentry from "@sentry/nextjs"

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 })
  }

  const error = new Error("Sentry server test error — delete me")
  Sentry.captureException(error)
  throw error
}
