import { EXPO_PUBLIC_API_URL } from "@/lib/env"

const API_URL = EXPO_PUBLIC_API_URL ?? "http://localhost:3003"

// Right after the app is foregrounded (cold start or resume from background),
// Android's radio/Wi-Fi is often still reconnecting — fetch throws a plain
// "Network request failed" (no response, nothing to retry on) in that window.
// One short-delay retry rides out that gap without masking real HTTP errors,
// which reject with a normal response and skip this path entirely.
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return fetch(url, init)
  }
}

export async function postJson<T>(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetchWithRetry(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`)
  }

  return (await res.json()) as T
}

export async function getJson<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetchWithRetry(`${API_URL}${path}`, { headers })

  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`)
  }

  return (await res.json()) as T
}
