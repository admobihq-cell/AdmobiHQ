import { ImageResponse } from "next/og"

import { BrandTile } from "@/lib/brand/admobi-mark"

export const runtime = "nodejs"

/** 512×512 schema.org Organization.logo — Google recommends ≥112×112px. */
export async function GET() {
  return new ImageResponse(
    <BrandTile size={512} strokeMultiplier={1} padding={64} borderRadius={62} />,
    { width: 512, height: 512 },
  )
}
