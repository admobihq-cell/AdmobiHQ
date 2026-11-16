import { NextResponse } from "next/server"

import {
  WALLET_TRANSACTION_KINDS,
  exportFileName,
  toCsv,
  type WalletTransactionKind,
} from "@workspace/ops-contracts"

import {
  TRANSACTION_SORTS,
  listTransactions,
  type TransactionSort,
} from "@/lib/analytics/finance-queries"
import { parseReportQuery } from "@/lib/analytics/parse-report-query"
import { jsonError, requireCustomerPermissionAccess } from "@/lib/api-utils"

const MAX_SEARCH_LENGTH = 100

/** A spreadsheet runs a cell that starts with one of these as a formula. */
function csvSafe(value: string | null): string {
  return value !== null && /^[=+\-@\t\r]/.test(value) ? `'${value}` : (value ?? "")
}

/**
 * The org's ledger, one page at a time, or every filtered row as CSV with `format=csv`.
 * Filters: `kind`, `q`, range, `sort`, `page`. Needs `billing:read`. Read-only.
 */
export async function GET(req: Request) {
  const auth = await requireCustomerPermissionAccess("billing:read")
  if (auth.error) return auth.error

  const url = new URL(req.url)
  const parsed = parseReportQuery(url)
  if (parsed.error) return parsed.error

  const kind = url.searchParams.get("kind") || undefined
  if (kind && !(WALLET_TRANSACTION_KINDS as readonly string[]).includes(kind)) {
    return jsonError(`Unknown kind: ${kind}`, 400)
  }
  const sort = url.searchParams.get("sort") || undefined
  if (sort && !(TRANSACTION_SORTS as string[]).includes(sort)) {
    return jsonError(`Unknown sort: ${sort}`, 400)
  }
  const pageParam = url.searchParams.get("page")
  const page = pageParam === null ? 1 : Number(pageParam)
  if (!Number.isInteger(page) || page < 1) return jsonError("page must be a positive integer", 400)
  const q = url.searchParams.get("q")?.trim() || undefined
  if (q && q.length > MAX_SEARCH_LENGTH) return jsonError("Search is too long", 400)

  const csv = url.searchParams.get("format") === "csv"
  const result = await listTransactions(
    auth.access.orgId,
    {
      range: parsed.range,
      kind: kind as WalletTransactionKind | undefined,
      q,
      page,
      sort: sort as TransactionSort | undefined,
    },
    { all: csv }
  )

  if (!csv) return NextResponse.json(result)

  const body = toCsv(
    result.items.map((t) => ({
      date: t.occurredAt.slice(0, 10),
      type: t.kind,
      description: csvSafe(t.description),
      reference: csvSafe(t.reference),
      campaign: csvSafe(t.campaignName),
      category: t.spendCategory ?? "",
      amount_kes: t.amountKes,
      balance_after_kes: t.balanceAfterKes,
    })),
    ["date", "type", "description", "reference", "campaign", "category", "amount_kes", "balance_after_kes"]
  )
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName("transactions", null, "csv")}"`,
    },
  })
}
