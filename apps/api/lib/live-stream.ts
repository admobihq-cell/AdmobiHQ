import { liveRedis } from "@/lib/realtime"

const HEARTBEAT_MS = 25_000
/** Under the route's 300s maxDuration; the client reconnects (with a fresh token) when it closes. */
const CLOSE_AFTER_MS = 280_000

/**
 * Server-Sent Events over Upstash pub/sub for the given channels. Holds no database connection:
 * auth happened before this is called, and from here on only Upstash is involved. Returns 204
 * when Upstash isn't configured so the client hook simply stays idle.
 */
export function liveStreamResponse(req: Request, channels: string[]): Response {
  const redis = liveRedis()
  if (!redis) return new Response(null, { status: 204 })

  const encoder = new TextEncoder()
  let cleanup = () => {}

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const send = (text: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(text))
        } catch {
          // stream already torn down
        }
      }

      const subscriber = redis.subscribe(channels)
      subscriber.on("message", ({ message }) => send(`data: ${JSON.stringify(message)}\n\n`))
      subscriber.on("error", (error) => {
        console.error("[live] subscription error", error)
        cleanup()
      })

      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS)
      const deadline = setTimeout(() => cleanup(), CLOSE_AFTER_MS)

      cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        clearTimeout(deadline)
        req.signal.removeEventListener("abort", cleanup)
        void subscriber.unsubscribe().catch(() => {})
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
      req.signal.addEventListener("abort", cleanup)

      send(": connected\n\n")
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
