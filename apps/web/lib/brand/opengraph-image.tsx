import { ImageResponse } from "next/og"

import { BRAND_CREAM, BRAND_OG_DARK } from "@/lib/brand/constants"
import { OgHeroIllustration } from "@/lib/brand/opengraph-illustration"

export const OPENGRAPH_IMAGE_SIZE = { width: 1200, height: 630 } as const

export function createOpenGraphImageResponse() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: 64,
          background: BRAND_OG_DARK,
          color: BRAND_CREAM,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <p
            style={{
              fontSize: 26,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: 0.65,
              margin: 0,
            }}
          >
            Nairobi · Kenya
          </p>
          <p style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.05, margin: 0 }}>Admobi</p>
          <p style={{ fontSize: 32, lineHeight: 1.35, maxWidth: 620, opacity: 0.88, margin: 0 }}>
            Digital taxi-top OOH that moves with the city
          </p>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "flex-end" }}>
          <OgHeroIllustration width={720} />
        </div>
      </div>
    ),
    { ...OPENGRAPH_IMAGE_SIZE },
  )
}
