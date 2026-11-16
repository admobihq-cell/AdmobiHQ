import type { NextResponse } from "next/server"

import {
  AD_FORMATS,
  DAYPARTS,
  REPORT_MARKETS,
  resolveReportRange,
  type ReportRange,
} from "@workspace/ops-contracts"

import type { ReportFilters } from "@/lib/analytics/report-queries"
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

const FILTER_VALUES = {
  market: REPORT_MARKETS as readonly string[],
  format: AD_FORMATS as readonly string[],
  daypart: DAYPARTS as readonly string[],
}

/**
 * Reads the report filters: `campaign` (an id), `market`, `format`, `daypart`. An unknown value
 * answers 400 rather than silently returning an empty report. CSV downloads use `export=csv`,
 * since `format` is taken by the filter.
 */
export function parseReportFilters(
  url: URL
): { filters: ReportFilters; error?: undefined } | { filters?: undefined; error: NextResponse } {
  const filters: ReportFilters = {}
  const campaign = url.searchParams.get("campaign")
  if (campaign) {
    const id = Number(campaign)
    if (!Number.isInteger(id) || id < 1) return { error: jsonError("campaign must be an id", 400) }
    filters.campaignId = id
  }
  for (const key of ["market", "format", "daypart"] as const) {
    const value = url.searchParams.get(key)
    if (!value) continue
    if (!FILTER_VALUES[key].includes(value)) return { error: jsonError(`Unknown ${key}: ${value}`, 400) }
    filters[key] = value
  }
  return { filters }
}
