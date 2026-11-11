import type { DateRangeKey, StatusTone } from "@workspace/ops-contracts"

import type { ChartPalette } from "../palette"

export type AlertTone = "bad" | "warn" | "info"
export type DeltaTone = "good" | "bad" | "neutral"

/** Status words are coloured from the theme palette, and always carry their text as well. */
export const statusColor = (palette: ChartPalette, tone: StatusTone): string =>
  tone === "good" ? palette.good : tone === "warning" ? palette.warning : tone === "serious" ? palette.bad : palette.neutral

export const alertColor = (palette: ChartPalette, tone: AlertTone): string =>
  tone === "bad" ? palette.bad : tone === "warn" ? palette.warning : palette.neutral

export const deltaColor = (palette: ChartPalette, tone: DeltaTone): string =>
  tone === "good" ? palette.good : tone === "bad" ? palette.bad : palette.neutral

/** "7d" reads "7D" and "all" reads "All", as on the web toolbar. */
export const rangeLabel = (range: DateRangeKey): string => (range === "all" ? "All" : range.toUpperCase())
