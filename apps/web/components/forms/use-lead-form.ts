"use client"

import { useState } from "react"

import { publicApiFetch } from "@workspace/ops-api-client"

import { trackEvent } from "@/lib/analytics"

type UseLeadFormOptions = {
  endpoint: string
  /** Extra fields merged into every submission's body, e.g. { channel: "web" }. */
  extra?: Record<string, unknown>
}

/**
 * Shared submit/error/success state for the marketing site's lead-capture
 * forms. Centralizing this also fixes a bug every form had independently: a
 * 200 response with an unparseable or unexpected body resolved `data.success`
 * to `undefined`, which every form's `if (result.data.success)` check treated
 * as a silent no-op — the button just re-enabled with no feedback at all.
 */
export function useLeadForm(options: UseLeadFormOptions) {
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [honeypot, setHoneypot] = useState("")

  async function submit(data: Record<string, unknown>) {
    setSubmitError(null)

    // Bots that fill every field tend to fill hidden ones too — pretend to
    // succeed rather than revealing what tripped the check.
    if (honeypot) {
      setSubmitted(true)
      return
    }

    const result = await publicApiFetch<{ success?: boolean }>(options.endpoint, {
      method: "POST",
      body: JSON.stringify({ ...data, ...options.extra }),
    })

    if (!result.ok) {
      setSubmitError(result.message)
      return
    }
    if (!result.data.success) {
      setSubmitError("Something went wrong on our end — please try again.")
      return
    }
    trackEvent("generate_lead", { form: options.endpoint })
    setSubmitted(true)
  }

  function reset() {
    setSubmitError(null)
    setSubmitted(false)
    setHoneypot("")
  }

  return {
    submitted,
    submitError,
    dismissError: () => setSubmitError(null),
    honeypot,
    setHoneypot,
    submit,
    reset,
  }
}
