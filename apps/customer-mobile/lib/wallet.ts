import { useQuery } from "@tanstack/react-query"

import { useTokenGetter } from "@/lib/auth/use-token-getter"
import { getFinanceSummary, getRecentTransactions } from "@/lib/payments"

// Deep, muted rust for the wallet hero card — deliberately darker/less
// saturated than c.primary so it reads as calm rather than a bright pop.
export const WALLET_CARD_BG = "#6B3018"
export const WALLET_CARD_FG = "#FAF9F7"

export function formatCurrency(value: number) {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

export const WALLET_QUERY_KEY = ["wallet"] as const

/**
 * The org's real balance from /v1/customer/finance/summary (30 days), shared by
 * the billing screen and the overview's preview card. `enabled` is false
 * without `billing:read`, so a Member never meets a 403.
 */
export function useWallet({ enabled = true }: { enabled?: boolean } = {}) {
  const getToken = useTokenGetter()
  return useQuery({
    queryKey: [...WALLET_QUERY_KEY, "summary"],
    queryFn: () => getFinanceSummary(getToken),
    enabled,
  })
}

/** The latest ledger rows (90 days, newest first, one page). */
export function useRecentTransactions({ enabled = true }: { enabled?: boolean } = {}) {
  const getToken = useTokenGetter()
  return useQuery({
    queryKey: [...WALLET_QUERY_KEY, "transactions"],
    queryFn: () => getRecentTransactions(getToken),
    enabled,
  })
}
