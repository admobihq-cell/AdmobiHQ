"use client"

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error("Turnstile failed to load"))
    }
    document.head.append(script)
  })
  return scriptPromise
}

/**
 * Solves a Cloudflare Turnstile challenge for one form submission and returns
 * its single-use token, or undefined when no site key is configured (local dev,
 * PR previews) — the API skips the check there too. The widget is invisible
 * unless Cloudflare wants an interaction, then shows bottom-right.
 */
export async function getTurnstileToken(): Promise<string | undefined> {
  if (!SITE_KEY) return undefined
  await loadScript()

  const container = document.createElement("div")
  container.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647"
  document.body.append(container)

  let widgetId: string | undefined
  try {
    return await new Promise<string>((resolve, reject) => {
      widgetId = window.turnstile!.render(container, {
        sitekey: SITE_KEY,
        appearance: "interaction-only",
        callback: resolve,
        "error-callback": () => reject(new Error("Turnstile challenge failed")),
        "timeout-callback": () => reject(new Error("Turnstile challenge timed out")),
      })
    })
  } finally {
    if (widgetId) window.turnstile?.remove(widgetId)
    container.remove()
  }
}
