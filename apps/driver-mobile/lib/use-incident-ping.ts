import { useEffect, useRef } from "react"
import { AppState } from "react-native"
import * as Location from "expo-location"

import { SAFETY_TERMINAL_STATUSES } from "@workspace/ops-contracts"

import { pingIncidentLocation } from "@/lib/sos"

const PING_INTERVAL_MS = 120_000
const TERMINAL = new Set<string>(SAFETY_TERMINAL_STATUSES)

/**
 * Foreground-only, 120s, current-position-only location re-ping while an
 * incident is open.
 *
 * No expo-task-manager and no background permission: the battery cost and the
 * store-review burden of always-on location buy nothing an ops responder
 * actually uses, and Neon compute is this platform's main cost driver. The
 * server independently refuses pings on terminal or >6h-old incidents (see
 * pingAdmission in apps/api/lib/safety-incident.ts), so a stuck client cannot
 * ping forever even if this hook misbehaves.
 */
export function useIncidentPing(
  incidentId: number | null,
  status: string | null,
  getToken: () => Promise<string | null>,
) {
  const busy = useRef(false)
  // Kept in a ref so a new getToken identity on every render doesn't tear
  // down and restart the interval.
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  useEffect(() => {
    if (!incidentId || !status || TERMINAL.has(status)) return

    let cancelled = false

    const tick = async () => {
      if (cancelled || busy.current) return
      if (AppState.currentState !== "active") return
      busy.current = true
      try {
        const token = await getTokenRef.current()
        if (!token) return
        const { status: permission } = await Location.getForegroundPermissionsAsync()
        if (permission !== "granted") return
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        if (cancelled) return
        await pingIncidentLocation(
          token,
          incidentId,
          position.coords.latitude,
          position.coords.longitude,
        )
      } catch {
        // A dropped ping is not worth surfacing — the next one is 2 minutes
        // away, and the reported_* snapshot is already with ops.
      } finally {
        busy.current = false
      }
    }

    void tick()
    const timer = setInterval(tick, PING_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [incidentId, status])
}
