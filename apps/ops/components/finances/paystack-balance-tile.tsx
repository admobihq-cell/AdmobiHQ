"use client"

import { useEffect, useState } from "react"
import { formatKes } from "@workspace/ops-contracts"

import { MetricTile } from "@workspace/ui/components/dashboard/metric-tile"
import { useOpsClient } from "@/lib/ops-client"

/** Live, never cached: it is what driver payouts are funded from. */
export function PaystackBalanceTile() {
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

  return (
    <MetricTile
      label="Paystack balance"
      value={state.balanceKes != null ? formatKes(state.balanceKes) : state.error ? "Unavailable" : "…"}
      note="Funds driver payouts. Sweep any surplus to the bank"
    />
  )
}
