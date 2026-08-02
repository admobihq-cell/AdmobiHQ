import { readFileSync } from "node:fs"
import { join } from "node:path"

const BRAND_CREAM = "#FAF9F7"

// Native crop of public/brand/logo-mark.png is 85×47.
const MARK_ASPECT = 47 / 85

let cachedMarkDataUri: string | null = null

function getMarkDataUri(): string {
  if (!cachedMarkDataUri) {
    const filePath = join(process.cwd(), "public", "brand", "logo-mark.png")
    const buffer = readFileSync(filePath)
    cachedMarkDataUri = `data:image/png;base64,${buffer.toString("base64")}`
  }
  return cachedMarkDataUri
}

type LogoBrandTileProps = {
  size: number
  padding?: number
  borderRadius?: number
}

/** Cream tile + the actual terracotta logo mark — matches admobihq.com's favicon exactly. */
export function LogoBrandTile({ size, padding, borderRadius }: LogoBrandTileProps) {
  const inset = padding ?? Math.round(size * 0.24)
  const radius = borderRadius ?? Math.round(size * 0.125)
  const markWidth = size - inset * 2
  const markHeight = Math.round(markWidth * MARK_ASPECT)

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        background: BRAND_CREAM,
        borderRadius: radius,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getMarkDataUri()} width={markWidth} height={markHeight} alt="" />
    </div>
  )
}
