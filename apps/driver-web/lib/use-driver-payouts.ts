"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import type { DriverPayoutsDto } from "@workspace/ops-contracts"

import { fetchDriverPayouts } from "@/lib/driver-profile-client"

/** Real payout rows for the earnings and dashboard screens. */
export function useDriverPayouts() {
  const { getToken, isLoaded } = useAuth()
  const [state, setState] = useState<{ data?: DriverPayoutsDto; error?: string }>({})

  useEffect(() => {
    if (!isLoaded) return
    let live = true
    fetchDriverPayouts(getToken)
      .then((data) => live && setState({ data }))
      .catch((e: unknown) => live && setState({ error: e instanceof Error ? e.message : "Couldn't load payouts" }))
    return () => {
      live = false
    }
  }, [getToken, isLoaded])

  return state
}

export const formatKes = (amount: number) =>
  `KES ${amount.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`

export const formatPayoutDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
/** "2026-11" → "Nov 2026". */
export const monthName = (m: string) => `${MONTHS[Number(m.slice(5)) - 1] ?? m} ${m.slice(0, 4)}`

export const PAYOUT_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Sending",
  settled: "Paid",
  failed: "Didn't go through",
  reversed: "Reversed",
}
