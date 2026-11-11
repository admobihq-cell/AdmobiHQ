import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { DateRangeKey } from "@workspace/ops-contracts"

import { useOpsAccess, useOpsAuthReady, useOpsClient } from "@/lib/ops-client"

/** Everything under `["ops-finance"]` refreshes together after a refund, a record or a payout. */
export const financeKeys = {
  all: ["ops-finance"] as const,
  overview: (range: DateRangeKey) => ["ops-finance", "overview", range] as const,
  ledger: (range: DateRangeKey) => ["ops-finance", "ledger", range] as const,
  wallets: () => ["ops-finance", "wallets"] as const,
  payouts: (range: DateRangeKey) => ["ops-finance", "payouts", range] as const,
  attention: () => ["ops-finance", "attention"] as const,
  recordOptions: () => ["ops-finance", "record-options"] as const,
  toolCosts: () => ["ops-finance", "tool-costs"] as const,
  balance: () => ["ops-finance", "paystack-balance"] as const,
}

export const unseenPaymentsKey = ["ops-unseen-payments"] as const

/**
 * Whether this person may open Finances: an admin, or someone holding `finances`. Read from the cached
 * `me` query rather than inferred from a failed request, so no money request is ever sent without it.
 * `loading` is true until the role is known: show a spinner then, not "no access".
 */
export function useFinanceAccess(): { allowed: boolean; loading: boolean } {
  const { role, permissions, loading } = useOpsAccess()
  return { allowed: role === "admin" || permissions.includes("finances"), loading }
}

/** The `enabled` flag every finance query shares: signed in, and allowed. */
function useFinanceEnabled(): boolean {
  const authReady = useOpsAuthReady()
  const { allowed } = useFinanceAccess()
  return authReady && allowed
}

export function useFinanceOverview(range: DateRangeKey) {
  const client = useOpsClient()
  return useQuery({
    queryKey: financeKeys.overview(range),
    queryFn: () => client.finance.overview(range),
    enabled: useFinanceEnabled(),
    placeholderData: keepPreviousData,
  })
}

export function useFinanceLedger(range: DateRangeKey) {
  const client = useOpsClient()
  return useQuery({
    queryKey: financeKeys.ledger(range),
    queryFn: () => client.finance.ledger(range),
    enabled: useFinanceEnabled(),
    placeholderData: keepPreviousData,
  })
}

export function useFinanceWallets() {
  const client = useOpsClient()
  return useQuery({ queryKey: financeKeys.wallets(), queryFn: () => client.finance.wallets(), enabled: useFinanceEnabled() })
}

export function useFinanceAttention() {
  const client = useOpsClient()
  return useQuery({ queryKey: financeKeys.attention(), queryFn: () => client.finance.attention(), enabled: useFinanceEnabled() })
}

export function useRecordOptions() {
  const client = useOpsClient()
  return useQuery({
    queryKey: financeKeys.recordOptions(),
    queryFn: () => client.finance.recordOptions(),
    enabled: useFinanceEnabled(),
  })
}

export function useToolCosts() {
  const client = useOpsClient()
  return useQuery({ queryKey: financeKeys.toolCosts(), queryFn: () => client.finance.toolCosts(), enabled: useFinanceEnabled() })
}

/** The live Paystack balance. Paystack being unreachable is an ordinary state (`isError`), not a crash. */
export function usePaystackBalance() {
  const client = useOpsClient()
  return useQuery({
    queryKey: financeKeys.balance(),
    queryFn: () => client.finance.paystackBalance(),
    enabled: useFinanceEnabled(),
    retry: false,
  })
}

/** Settled payments nobody has looked at yet: the badge on the Finances entry in the drawer. */
export function useUnseenPayments() {
  const client = useOpsClient()
  return useQuery({
    queryKey: unseenPaymentsKey,
    queryFn: () => client.finance.unseenCount(),
    enabled: useFinanceEnabled(),
    staleTime: 30_000,
    select: (data) => data.count,
  })
}

/** Opening the Ledger stamps every unseen payment as seen and clears the badge. */
export function useMarkPaymentsSeen() {
  const client = useOpsClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => client.finance.markSeen(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unseenPaymentsKey }),
  })
}

/** After money moves (a refund, a recorded transaction, a payout), refresh every finance view and the badge. */
export function useRefreshFinance() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: financeKeys.all }),
      queryClient.invalidateQueries({ queryKey: unseenPaymentsKey }),
    ])
}

/** Whether this person may send payouts to Paystack: an admin, or someone holding `payouts` (separate from `finances`). */
export function useCanDisburse(): boolean {
  const { role, permissions } = useOpsAccess()
  return role === "admin" || permissions.includes("payouts")
}

/** Driver payouts in the range, by status and month, with the rows. */
export function useFinancePayouts(range: DateRangeKey) {
  const client = useOpsClient()
  return useQuery({
    queryKey: financeKeys.payouts(range),
    queryFn: () => client.finance.payouts(range),
    enabled: useFinanceEnabled(),
    placeholderData: keepPreviousData,
  })
}

/** One month's payout run: approved drivers with payout details and any saved payout. Always fresh: money is about to move. */
export function usePayoutRun(month: string) {
  const client = useOpsClient()
  return useQuery({
    queryKey: ["ops-finance", "payout-run", month] as const,
    queryFn: () => client.payouts.getRun(month),
    enabled: useFinanceEnabled(),
    staleTime: 0,
    // Amounts the person is typing live in screen state, so a background refetch must not replace them.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
