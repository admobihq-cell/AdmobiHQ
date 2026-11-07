import type { NextResponse } from "next/server"

import { resolveReportRange, type ReportRange } from "@workspace/ops-contracts"

import { jsonError } from "@/lib/api-utils"

/**
 * Reads `range`, or `from` + `to`, off a request URL and resolves it to Nairobi calendar days.
 * An unknown preset, a malformed or reversed pair, or more than 366 days answers 400.
 */
export function parseReportQuery(
  url: URL,
  today = new Date()
): { range: ReportRange; error?: undefined } | { range?: undefined; error: NextResponse } {
  const get = (key: string) => url.searchParams.get(key) || undefined
  try {
    return {
      range: resolveReportRange({ range: get("range"), from: get("from"), to: get("to") }, today),
    }
  } catch (e) {
    if (e instanceof RangeError) return { error: jsonError(e.message, 400) }
    throw e
  }
}
