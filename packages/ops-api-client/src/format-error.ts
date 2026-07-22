import type { ApiErrorResponse } from "@workspace/ops-contracts"

import { OpsApiError } from "./errors"
import { getApiBaseUrl } from "./base-url"

export type FormatApiErrorOptions = {
  apiUrl?: string
  networkHint?: string
}

export function formatApiError(
  err: unknown,
  options?: FormatApiErrorOptions,
): string {
  if (err instanceof OpsApiError) {
    if (err.status === 401) {
      return "Could not verify your session with the API. Sign out, sign in again, and confirm the app uses production Clerk keys."
    }
    if (err.status === 403) {
      return "Access denied. Use your @admobihq.com account."
    }
    if (err.status === 404) {
      return "API route not found. Check EXPO_PUBLIC_API_URL points to https://api.admobihq.com and redeploy the API."
    }
    return err.message
  }

  if (err instanceof TypeError) {
    const message = err.message.toLowerCase()
    if (
      message.includes("network request failed") ||
      message.includes("failed to fetch")
    ) {
      if (options?.networkHint) return options.networkHint
      const url = options?.apiUrl ?? getApiBaseUrl()
      return `Cannot reach the API at ${url}. Check your connection and try again.`
    }
  }

  return err instanceof Error ? err.message : "Request failed"
}

function firstFieldError(issues: unknown): string | undefined {
  if (!issues || typeof issues !== "object") return undefined
  const fieldErrors = (issues as { fieldErrors?: Record<string, string[]> })
    .fieldErrors
  if (!fieldErrors) return undefined
  for (const messages of Object.values(fieldErrors)) {
    if (messages[0]) return messages[0]
  }
  return undefined
}

export function formatApiErrorResponse(
  body: ApiErrorResponse | undefined,
  status: number,
): string {
  return (
    firstFieldError(body?.issues) ??
    body?.error ??
    `Request failed (${status})`
  )
}
