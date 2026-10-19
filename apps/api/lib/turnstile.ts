/** Header the marketing site's forms send the Cloudflare Turnstile token in. */
export const TURNSTILE_HEADER = "x-turnstile-token"

/**
 * Verifies the request's Turnstile token with Cloudflare. A header rather than
 * a body field because the zod form schemas strip unknown keys.
 *
 * Fails open when TURNSTILE_SECRET_KEY is unset (local dev, PR previews) or
 * Cloudflare is unreachable — same stance as rate limiting: losing real leads
 * to an outage is worse than letting a few bots through.
 */
export async function verifyTurnstile(req: Request): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return true

  const token = req.headers.get(TURNSTILE_HEADER)
  if (!token) return false

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
    })
    if (!res.ok) return true
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (error) {
    console.error("[turnstile] siteverify unreachable, allowing request:", error)
    return true
  }
}
