import { ImageResponse } from "next/og"

import { LogoBrandTile } from "@/lib/brand/favicon-mark"

export const runtime = "nodejs"
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(<LogoBrandTile size={180} padding={40} borderRadius={40} />, {
    ...size,
  })
}
