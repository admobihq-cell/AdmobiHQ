"use client"

import { useEffect, useState } from "react"
import { formatKes } from "@workspace/ops-contracts"

import { useOpsClient } from "@/lib/ops-client"

/** The live Paystack transfer balance as display text. Never cached: driver payouts are funded from it. */
export function usePaystackBalance(): string {
  const client = useOpsClient()
  const [state, setState] = useState<{ balanceKes?: number; error?: boolean }>({})

  useEffect(() => {
    let live = true
    client.finance
      .paystackBalance()
      .then(({ balanceKes }) => live && setState({ balanceKes }))
      .catch(() => live && setState({ error: true }))
    return () => {
      live = false
    }
  }, [client])

  return state.balanceKes != null ? formatKes(state.balanceKes) : state.error ? "Unavailable" : "…"
}
