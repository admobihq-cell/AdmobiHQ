"use client"

import { useAuth } from "@clerk/nextjs"
import { keepPreviousData, useQuery } from "@tanstack/react-query"

import type {
  CampaignReportDto,
  ReportAudienceDto,
  ReportCampaignRowDto,
  ReportDeliveryDto,
  ReportOverviewDto,
  ReportSpendDto,
} from "@workspace/ops-contracts"

import {
  ANALYTICS_QUERY_KEY,
  getFinanceSummary,
  getInvoices,
  getReport,
  getStatements,
  getTransactions,
  reportPath,
  type RangeParams,
  type ReportFilterParams,
  type ReportRoute,
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

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

function useReport<T>(
  route: ReportRoute,
  range: RangeParams,
  filters: ReportFilterParams,
  { enabled = true }: Options = {}
) {
  const { getToken, isLoaded } = useAuth()
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, "report", route, range, filters],
    queryFn: () => getReport<T>(getToken, reportPath(route, range, filters)),
    enabled: enabled && isLoaded,
    staleTime: STALE_MS,
    // Keeps the page on screen while a filter or range change loads.
    placeholderData: keepPreviousData,
  })
}

export const useReportOverview = (r: RangeParams, f: ReportFilterParams, o?: Options) =>
  useReport<ReportOverviewDto>("overview", r, f, o)
export const useReportDelivery = (r: RangeParams, f: ReportFilterParams, o?: Options) =>
  useReport<ReportDeliveryDto>("delivery", r, f, o)
export const useReportAudience = (r: RangeParams, f: ReportFilterParams, o?: Options) =>
  useReport<ReportAudienceDto>("audience", r, f, o)
export const useReportSpend = (r: RangeParams, f: ReportFilterParams, o?: Options) =>
  useReport<ReportSpendDto>("spend", r, f, o)
export const useReportCampaigns = (r: RangeParams, f: ReportFilterParams, o?: Options) =>
  useReport<{ items: ReportCampaignRowDto[] }>("campaigns", r, f, o)
export const useCampaignReport = (id: number, r: RangeParams, o?: Options) =>
  useReport<CampaignReportDto>(`campaigns/${id}`, r, {}, o)
