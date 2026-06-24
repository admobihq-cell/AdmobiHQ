import { ImageResponse } from "next/og"

import { BrandTile } from "@/lib/brand/admobi-mark"

export const runtime = "nodejs"
export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    <BrandTile size={32} strokeMultiplier={1.25} padding={4} borderRadius={4} />,
    { ...size },
  )
}
