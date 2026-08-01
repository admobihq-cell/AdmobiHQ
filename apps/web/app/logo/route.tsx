import { ImageResponse } from "next/og"

import { BrandTile } from "@/lib/brand/favicon-mark"

export const runtime = "nodejs"

/** 512×512 schema.org Organization.logo — Google recommends ≥112×112px. */
export async function GET() {
  return new ImageResponse(<BrandTile size={512} padding={112} borderRadius={112} />, {
    width: 512,
    height: 512,
  })
}
