import { useEffect, useRef, useState } from "react"
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

/**
 * Ops-controlled platform flags (e.g. "deliveries"). Fetched on launch and
 * again whenever the app returns to the foreground, so a toggle in ops
 * propagates here within about a minute without an app update — see
 * docs/driver/DRIVER-APP.md for the full design.
 */
export function usePlatformFlags(): Record<string, boolean> {
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    async function load() {
      try {
        const next = await fetchFlags()
        if (mounted.current) setFlags(next)
      } catch {
        // Flags are additive UI, never load-bearing — keep whatever we had.
      }
    }

    void load()

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") void load()
      },
    )

    return () => {
      mounted.current = false
      subscription.remove()
    }
  }, [])

  return flags
}
