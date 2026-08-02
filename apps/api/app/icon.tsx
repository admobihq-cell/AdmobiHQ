import { ImageResponse } from "next/og"

import { LogoBrandTile } from "@/lib/brand/favicon-mark"

export const runtime = "nodejs"
export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(<LogoBrandTile size={32} padding={4} borderRadius={7} />, { ...size })
}
