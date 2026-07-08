import { ImageResponse } from "next/og"

import { BrandTile } from "@workspace/ui/brand/admobi-mark"

export const runtime = "nodejs"
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <BrandTile size={180} strokeMultiplier={1} padding={22} borderRadius={22} />,
    { ...size },
  )
}
