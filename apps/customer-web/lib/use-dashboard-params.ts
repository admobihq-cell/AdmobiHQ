"use client"

import { useSearchParams } from "next/navigation"

import type { RangeParams } from "@/lib/analytics-client"

const DEFAULT_RANGE = "30d"

/**
 * Dashboard state kept in the URL (`?tab=delivery&range=30d&market=CBD`), so a view can be
 * shared and Back works. Reads `useSearchParams`, so the page must sit inside a `Suspense`.
 *
 * Writes go through the history API rather than a router push: Next keeps `useSearchParams` in
 * sync, and nothing re-fetches on the server. Tab changes push (Back returns to the last tab);
 * range and filter changes replace.
 */
export function useDashboardParams(defaultTab: string, filterKeys: readonly string[] = []) {
  const searchParams = useSearchParams()

  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const range: RangeParams = from && to ? { from, to } : { range: searchParams.get("range") ?? DEFAULT_RANGE }
  const filters = Object.fromEntries(
    filterKeys.flatMap((key) => {
      const value = searchParams.get(key)
      return value ? [[key, value] as const] : []
    })
  ) as Record<string, string>

  function write(updates: Record<string, string | null>, mode: "push" | "replace") {
    const next = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    const query = next.toString()
    const url = `${window.location.pathname}${query ? `?${query}` : ""}`
    window.history[mode === "push" ? "pushState" : "replaceState"](null, "", url)
  }

  return {
    tab: searchParams.get("tab") ?? defaultTab,
    range,
    filters,
    setTab: (tab: string) => write({ tab: tab === defaultTab ? null : tab }, "push"),
    setRange: (next: RangeParams) =>
      write(
        { range: next.range ?? null, from: next.from ?? null, to: next.to ?? null },
        "replace"
      ),
    setFilter: (key: string, value: string | null) => write({ [key]: value }, "replace"),
    clearFilters: () => write(Object.fromEntries(filterKeys.map((key) => [key, null])), "replace"),
  }
}
