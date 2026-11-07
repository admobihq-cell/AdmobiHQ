import type {
  FinanceSummaryDto,
  InvoiceDto,
  StatementRowDto,
  TransactionPageDto,
  WalletTransactionKind,
} from "@workspace/ops-contracts"

import { authedFetch, type GetToken } from "@/lib/campaigns-client"

/** Root key for every dashboard read. Mutations that move money invalidate it. */
export const ANALYTICS_QUERY_KEY = ["customer-analytics"] as const

/** Either a preset (`range`) or a custom pair, exactly as the API takes them. */
export type RangeParams = { range?: string; from?: string; to?: string }

export function rangeQuery(range: RangeParams): URLSearchParams {
  const query = new URLSearchParams()
  if (range.from && range.to) {
    query.set("from", range.from)
    query.set("to", range.to)
  } else if (range.range) {
    query.set("range", range.range)
  }
  return query
}

export async function getFinanceSummary(
  getToken: GetToken,
  range: RangeParams
): Promise<FinanceSummaryDto> {
  const res = await authedFetch(getToken, `/v1/customer/finance/summary?${rangeQuery(range)}`)
  return res.json()
}

export type TransactionParams = {
  range: RangeParams
  kind?: WalletTransactionKind
  q?: string
  sort?: string
  page?: number
}

export function transactionsPath(params: TransactionParams, csv = false): string {
  const query = rangeQuery(params.range)
  if (params.kind) query.set("kind", params.kind)
  if (params.q) query.set("q", params.q)
  if (params.sort) query.set("sort", params.sort)
  if (params.page && params.page > 1 && !csv) query.set("page", String(params.page))
  if (csv) query.set("format", "csv")
  return `/v1/customer/finance/transactions?${query}`
}

export async function getTransactions(
  getToken: GetToken,
  params: TransactionParams
): Promise<TransactionPageDto> {
  const res = await authedFetch(getToken, transactionsPath(params))
  return res.json()
}

export async function getInvoices(getToken: GetToken): Promise<InvoiceDto[]> {
  const res = await authedFetch(getToken, "/v1/customer/finance/invoices")
  return (await res.json()).items
}

export async function getStatements(getToken: GetToken): Promise<StatementRowDto[]> {
  const res = await authedFetch(getToken, "/v1/customer/finance/statements")
  return (await res.json()).items
}
