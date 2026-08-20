import { useEffect, useSyncExternalStore } from "react"
import { AppState, type AppStateStatus } from "react-native"
import type { PublicConfigDto } from "@workspace/ops-contracts"

import { EXPO_PUBLIC_API_URL } from "@/lib/env"

const API_URL = EXPO_PUBLIC_API_URL ?? "http://localhost:3003"

async function fetchFlags(): Promise<Record<string, boolean>> {
  const res = await fetch(`${API_URL}/v1/public/config`)
  if (!res.ok) throw new Error(`Config request failed with status ${res.status}`)
  const data = (await res.json()) as PublicConfigDto
  return data.flags ?? {}
}

let flagsCache: Record<string, boolean> = {}
let inFlight: Promise<void> | null = null
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return flagsCache
}

/**
 * usePlatformFlags() is called from the tab layout, the dashboard, and the
 * deliveries screen independently — without a shared cache each of those
 * fired its own request to /v1/public/config on every mount and again on
 * every foreground resume, so up to three duplicate requests raced on cold
 * start and any flag-gated UI (e.g. the Deliveries quick action) flashed in
 * late per screen. Sharing one in-flight request and one cached result
 * means only the first caller pays for the fetch; everyone else — mounted
 * at the same time or later — reads the cached value immediately.
 */
function refresh(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = fetchFlags()
    .then((next) => {
      flagsCache = next
      notify()
    })
    .catch(() => {
      // Flags are additive UI, never load-bearing — keep whatever we had.
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}

/**
 * Ops-controlled platform flags (e.g. "deliveries"). Fetched once on first
 * use and shared across every consumer, then refreshed whenever the app
 * returns to the foreground, so a toggle in ops propagates here within
 * about a minute without an app update — see docs/driver/DRIVER-APP.md for
 * the full design.
 */
export function usePlatformFlags(): Record<string, boolean> {
  const flags = useSyncExternalStore(subscribe, getSnapshot)

  useEffect(() => {
    void refresh()

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") void refresh()
      },
    )

    return () => {
      subscription.remove()
    }
  }, [])

  return flags
}
