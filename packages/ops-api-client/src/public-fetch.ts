import type { ApiErrorResponse } from "@workspace/ops-contracts"

import { publicApiUrl } from "./base-url.js"
import { formatApiError, formatApiErrorResponse } from "./format-error.js"

export type PublicApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

export async function publicApiFetch<T = unknown>(
  resource: string,
  init?: RequestInit,
): Promise<PublicApiResult<T>> {
  try {
    const headers = new Headers(init?.headers)
    if (!headers.has("Content-Type") && init?.body) {
      headers.set("Content-Type", "application/json")
    }

    const res = await fetch(publicApiUrl(resource), {
      ...init,
      headers,
    })

    let body: (ApiErrorResponse & T) | undefined
    try {
      body = (await res.json()) as ApiErrorResponse & T
    } catch {
      body = undefined
    }

    if (!res.ok) {
      return {
        ok: false,
        message: formatApiErrorResponse(body, res.status),
      }
    }

    return { ok: true, data: (body ?? ({} as T)) as T }
  } catch (err) {
    return { ok: false, message: formatApiError(err) }
  }
}
