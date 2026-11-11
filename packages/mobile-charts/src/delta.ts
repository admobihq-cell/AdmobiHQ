import type { Delta } from "@workspace/ops-contracts"

export type DeltaGood = "up" | "down" | "neutral"

export type DeltaView = {
  direction: "up" | "down" | "flat"
  tone: "good" | "bad" | "neutral"
  text: string
  /** For screen readers: the direction in words, so colour and arrow are never the only cue. */
  label: string
}

/**
 * Change against the previous period, decided the way the web `DeltaPill` does. Colour follows meaning,
 * not sign (spend rising is "neutral" for an advertiser). Returns null when there is nothing to compare
 * (`change` is null, e.g. the "All" range), rather than a misleading 0%.
 */
export function deltaView(delta: Delta, good: DeltaGood, format?: (change: number) => string): DeltaView | null {
  const change = delta.change
  if (change === null || !Number.isFinite(change)) return null

  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat"
  const tone = direction === "flat" || good === "neutral" ? "neutral" : direction === good ? "good" : "bad"
  const text = direction === "flat" ? "0%" : format ? format(Math.abs(change)) : `${Math.abs(change).toFixed(1)}%`
  const label =
    direction === "flat"
      ? "No change on the previous period"
      : `${direction === "up" ? "Up" : "Down"} ${text} on the previous period`
  return { direction, tone, text, label }
}
