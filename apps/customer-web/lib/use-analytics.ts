"use client"

import { useAuth } from "@clerk/nextjs"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
  ANALYTICS_QUERY_KEY,
  getFinanceSummary,
  getInvoices,
  getStatements,
  getTransactions,
  type RangeParams,
  type TransactionParams,
} from "@/lib/analytics-client"

/** Dashboards read aggregates that move slowly, so a revisit within 5 minutes reuses the data. */
const STALE_MS = 5 * 60_000

type Options = {
  /** False when the viewer lacks the permission: no request, so no 403 toast. */
  enabled?: boolean
}

export function useFinanceSummary(range: RangeParams, { enabled = true }: Options = {}) {
  const { getToken, isLoaded } = useAuth()
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, "finance-summary", range],
    queryFn: () => getFinanceSummary(getToken, range),
    enabled: enabled && isLoaded,
    staleTime: STALE_MS,
    placeholderData: keepPreviousData,
  })
}

export function useTransactions(params: TransactionParams, { enabled = true }: Options = {}) {
  const { getToken, isLoaded } = useAuth()
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, "transactions", params],
    queryFn: () => getTransactions(getToken, params),
    enabled: enabled && isLoaded,
    staleTime: STALE_MS,
    // Keeps the table on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
  })
}

export function useInvoices({ enabled = true }: Options = {}) {
  const { getToken, isLoaded } = useAuth()
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, "invoices"],
    queryFn: () => getInvoices(getToken),
    enabled: enabled && isLoaded,
    staleTime: STALE_MS,
  })
}

export function useStatements({ enabled = true }: Options = {}) {
  const { getToken, isLoaded } = useAuth()
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, "statements"],
    queryFn: () => getStatements(getToken),
    enabled: enabled && isLoaded,
    staleTime: STALE_MS,
  })
}
