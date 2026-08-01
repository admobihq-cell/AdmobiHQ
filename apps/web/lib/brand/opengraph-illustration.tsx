import { readFileSync } from "node:fs"
import { join } from "node:path"

import { BRAND_CREAM, BRAND_TERRA } from "@/lib/brand/constants"

/**
 * Static, Satori-safe cut of the on-site RouteSignal hero illustration
 * (apps/web/components/landing/system-illustration.tsx): skyline + SUV +
 * lit LED unit, minus the parts that don't survive a non-DOM renderer
 * (Tailwind/CSS-var classes, animation, blur filters) or don't read at
 * share-card size (chips, stepper, signal arcs).
 */
const SKYLINE_PATH =
  "M 0 380 L 0 320 L 50 320 L 50 285 L 95 285 L 95 325 L 135 325 L 135 260 L 190 260 L 190 310 L 225 310 L 225 330 L 273 330 L 273 290 L 315 290 L 315 315 L 353 315 L 353 275 L 378 250 L 403 275 L 403 325 L 443 325 L 443 285 L 478 285 L 478 335 L 510 335 L 510 250 L 525 250 L 525 220 L 550 220 L 550 250 L 565 250 L 565 320 L 600 320 L 600 280 L 640 280 L 640 330 L 670 330 L 670 270 L 715 270 L 715 325 L 750 325 L 750 295 L 800 295 L 800 380 Z"

// Source coordinate space, matching system-illustration.tsx's viewBox.
const SOURCE_WIDTH = 800
const CROP_TOP = 130 // skips the top signal-arc/chip band, keeps skyline + car + LED unit
const CROP_HEIGHT = 290

let cachedSuvDataUri: string | null = null
let cachedTypemarkDataUri: string | null = null

function readAsDataUri(...segments: string[]): string {
  const filePath = join(process.cwd(), "public", ...segments)
  const buffer = readFileSync(filePath)
  return `data:image/png;base64,${buffer.toString("base64")}`
}

function getSuvDataUri(): string {
  if (!cachedSuvDataUri) {
    cachedSuvDataUri = readAsDataUri("art", "suv-hero-2.png")
  }
  return cachedSuvDataUri
}

function getTypemarkDataUri(): string {
  if (!cachedTypemarkDataUri) {
    cachedTypemarkDataUri = readAsDataUri("brand", "logo-typemark.png")
  }
  return cachedTypemarkDataUri
}

type OgHeroIllustrationProps = {
  /** Rendered width in px; height follows the crop's aspect ratio. */
  width: number
}

/** Skyline + SUV + lit LED unit, sized for the OG/social share card. */
export function OgHeroIllustration({ width }: OgHeroIllustrationProps) {
  const scale = width / SOURCE_WIDTH
  const height = CROP_HEIGHT * scale
  const s = (v: number) => v * scale
  const sy = (v: number) => (v - CROP_TOP) * scale

  return (
    <div style={{ position: "relative", width, height, display: "flex" }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 ${CROP_TOP} ${SOURCE_WIDTH} ${CROP_HEIGHT}`}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <path d={SKYLINE_PATH} fill={BRAND_CREAM} fillOpacity={0.08} />
      </svg>

      {/* Contact shadow */}
      <div
        style={{
          position: "absolute",
          left: s(215),
          top: sy(389),
          width: s(300),
          height: s(20),
          borderRadius: "50%",
          background: "#000000",
          opacity: 0.35,
        }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getSuvDataUri()}
        alt=""
        style={{
          position: "absolute",
          left: s(210),
          top: sy(280),
          width: s(310),
          height: s(120),
        }}
      />

      {/* LED unit housing */}
      <div
        style={{
          position: "absolute",
          left: s(210),
          top: sy(180),
          width: s(380),
          height: s(80),
          borderRadius: s(9),
          background: BRAND_CREAM,
          opacity: 0.08,
        }}
      />
      {/* Warm glow behind the panel */}
      <div
        style={{
          position: "absolute",
          left: s(224),
          top: sy(194),
          width: s(352),
          height: s(52),
          borderRadius: s(8),
          background: BRAND_TERRA,
          opacity: 0.35,
        }}
      />
      {/* Inset LED panel */}
      <div
        style={{
          position: "absolute",
          left: s(224),
          top: sy(194),
          width: s(352),
          height: s(52),
          borderRadius: s(5),
          background: "#171310",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getTypemarkDataUri()} alt="" width={s(61)} height={s(34)} />
      </div>

      {/* Roof mount legs */}
      <div
        style={{
          position: "absolute",
          left: s(383),
          top: sy(258),
          width: s(10),
          height: s(24),
          borderRadius: s(2),
          background: BRAND_CREAM,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: s(417),
          top: sy(258),
          width: s(10),
          height: s(24),
          borderRadius: s(2),
          background: BRAND_CREAM,
          opacity: 0.6,
        }}
      />
    </div>
  )
}
