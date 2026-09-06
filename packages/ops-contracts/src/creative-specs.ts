import type { CampaignFormat } from "./enums"

/**
 * Authoritative supplier hardware spec for campaign creative. This is the ONE
 * place these numbers live — the API validator, both advertiser upload UIs
 * (customer-web, customer-mobile) and both ops review UIs (ops, ops-mobile)
 * all import from here. Never retype a dimension or a format list into a
 * component.
 */

/**
 * The supplier console states verbatim: "Note: Materials only support PNG,
 * JPG, GIF, MP4 format!" — so this list is exhaustive, not a starting point.
 *
 * Notably absent, and deliberately so:
 *  - WebP / WebM — the player cannot decode them. Accepting them would let
 *    creative pass ops review and then fail silently on the vehicle, which is
 *    strictly worse than rejecting it at upload.
 *  - BMP — appears in the supplier's local file-picker filter but is absent
 *    from its supported-materials list. That filter is a Windows file-dialog
 *    artifact, not a playback guarantee.
 */
export const CREATIVE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "video/mp4",
] as const
export type CreativeMimeType = (typeof CREATIVE_MIME_TYPES)[number]

/** For an <input accept> attribute / native picker filter. `.jpg` and `.jpeg`
 * are the same format; both spellings reach us from the wild. */
export const CREATIVE_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".mp4"] as const

/** Human-facing format list, e.g. for helper text under a dropzone. */
export const CREATIVE_FORMATS_LABEL = "PNG, JPG, GIF or MP4"

/**
 * Which face of the vehicle unit a creative plays on. The taxi top is
 * double-sided and the bike box is three-sided, so the hardware needs this
 * even though the apps only offer "all" today — per-face artwork is then a
 * picker, not a migration.
 */
export const CREATIVE_SLOTS = ["all", "side_a", "side_b", "left", "right", "rear"] as const
export type CreativeSlot = (typeof CREATIVE_SLOTS)[number]

export const MAX_CREATIVE_BYTES = 50 * 1024 * 1024
export const MAX_CREATIVES_PER_CAMPAIGN = 6

/** Aspect-ratio slack. Encoders round odd dimensions, so an exact float
 * compare would reject legitimate artwork; 2% is tight enough to still catch
 * a genuinely wrong shape (4:3 against 3:1 is off by 56%). */
export const ASPECT_TOLERANCE = 0.02

export type CreativeSpec = {
  /** Panel this spec describes. */
  format: Exclude<CampaignFormat, "both">
  label: string
  /** Physical active canvas. */
  widthMm: number
  heightMm: number
  aspectRatio: number
  aspectLabel: string
  /** How many faces the unit has, and how to say it. */
  sides: number
  sidesLabel: string
  /** LED pixel pitch, where the supplier specified one. */
  pitch: string | null
  /**
   * Advisory pixel canvas — see checkCreativeDimensions. The supplier brief
   * gives these figures in millimetres and calls them the "active pixel
   * canvas", so whether they are also the literal pixel resolution is
   * unconfirmed (320mm at P2.5 works out to 128px, which would make the two
   * different numbers). Used for a warning, never a rejection, until the
   * supplier confirms panel resolution.
   */
  recommendedWidthPx: number
  recommendedHeightPx: number
}

export const CREATIVE_SPECS: Record<Exclude<CampaignFormat, "both">, CreativeSpec> = {
  taxi_top: {
    format: "taxi_top",
    label: "Taxi-top LED",
    widthMm: 960,
    heightMm: 320,
    aspectRatio: 3,
    aspectLabel: "3:1",
    sides: 2,
    sidesLabel: "Double-sided",
    pitch: null,
    recommendedWidthPx: 960,
    recommendedHeightPx: 320,
  },
  delivery_bike: {
    format: "delivery_bike",
    label: "Delivery bike box",
    widthMm: 320,
    heightMm: 320,
    aspectRatio: 1,
    aspectLabel: "1:1",
    sides: 3,
    sidesLabel: "Three sides",
    pitch: "P2.5",
    recommendedWidthPx: 320,
    recommendedHeightPx: 320,
  },
}

/**
 * Specs a campaign's creative must satisfy. A "both" campaign runs on two
 * different panels, so it needs artwork for each aspect ratio — the caller
 * accepts a creative that matches ANY returned spec, and should prompt for
 * one per spec before submit.
 */
export function specsForFormat(format: CampaignFormat): CreativeSpec[] {
  if (format === "both") return [CREATIVE_SPECS.taxi_top, CREATIVE_SPECS.delivery_bike]
  return [CREATIVE_SPECS[format]]
}

/** One-line spec summary for helper text, e.g.
 * "Taxi-top LED — 960 x 320 mm, 3:1, double-sided". */
export function describeSpec(spec: CreativeSpec): string {
  const pitch = spec.pitch ? `, ${spec.pitch}` : ""
  return `${spec.label} — ${spec.widthMm} x ${spec.heightMm} mm${pitch}, ${spec.aspectLabel}, ${spec.sidesLabel.toLowerCase()}`
}

export type CreativeDimensionCheck = {
  level: "ok" | "warn" | "fail"
  /** Convenience for callers that only branch on "may I save this?". */
  ok: boolean
  message?: string
}

/**
 * Aspect ratio is a hard gate; pixel dimensions only warn.
 *
 * Wrong-shaped artwork is unambiguously broken — it will letterbox or crop on
 * a 3:1 panel no matter what the pixel figures mean. Undersized-but-correctly
 * shaped artwork merely looks soft, and because it is not yet confirmed
 * whether the spec's 960x320 is millimetres or pixels, a hard dimension check
 * could reject creative that is actually fine. This split is correct under
 * both readings; tighten it to a hard check once the supplier confirms panel
 * resolution.
 */
export function checkCreativeDimensions(
  spec: CreativeSpec,
  width: number,
  height: number,
): CreativeDimensionCheck {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { level: "fail", ok: false, message: "Could not read this file's dimensions." }
  }

  const actual = width / height
  if (Math.abs(actual - spec.aspectRatio) / spec.aspectRatio > ASPECT_TOLERANCE) {
    return {
      level: "fail",
      ok: false,
      message: `${spec.label} needs ${spec.aspectLabel} artwork (${spec.recommendedWidthPx} x ${spec.recommendedHeightPx}). This file is ${width} x ${height}.`,
    }
  }

  if (width < spec.recommendedWidthPx || height < spec.recommendedHeightPx) {
    return {
      level: "warn",
      ok: true,
      message: `This is smaller than the ${spec.recommendedWidthPx} x ${spec.recommendedHeightPx} panel canvas and may look soft on screen.`,
    }
  }

  return { level: "ok", ok: true }
}

/**
 * Checks a creative against every spec the campaign's format allows and
 * returns the best outcome — a "both" campaign accepts either panel's
 * artwork, so a file only fails when it fits neither.
 */
export function checkCreativeForFormat(
  format: CampaignFormat,
  width: number,
  height: number,
): CreativeDimensionCheck {
  const results = specsForFormat(format).map((spec) => checkCreativeDimensions(spec, width, height))
  return (
    results.find((r) => r.level === "ok") ??
    results.find((r) => r.level === "warn") ??
    results[0]!
  )
}
