import { ImageResponse } from "next/og"

import { RouteSignalMark } from "@/lib/brand/admobi-mark"
import { BRAND_CREAM, BRAND_OG_DARK, BRAND_TERRA } from "@/lib/brand/constants"
import { ROUTE_SIGNAL_STROKE_WIDTH } from "@/lib/brand/geometry"

export const OPENGRAPH_IMAGE_SIZE = { width: 1200, height: 630 } as const

export function createOpenGraphImageResponse() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: "100%",
          padding: 72,
          background: BRAND_OG_DARK,
          color: BRAND_CREAM,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 200,
            height: 200,
            marginRight: 56,
            flexShrink: 0,
            background: BRAND_TERRA,
            borderRadius: 24,
          }}
        >
          <RouteSignalMark
            color={BRAND_CREAM}
            width={140}
            height={98}
            strokeWidth={ROUTE_SIGNAL_STROKE_WIDTH}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            height: "100%",
          }}
        >
          <p
            style={{
              fontSize: 28,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              opacity: 0.65,
              margin: 0,
            }}
          >
            Nairobi · Kenya
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <p style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.05, margin: 0 }}>Admobi</p>
            <p style={{ fontSize: 36, lineHeight: 1.35, maxWidth: 720, opacity: 0.88, margin: 0 }}>
              Digital taxi-top OOH that moves with the city
            </p>
          </div>
        </div>
      </div>
    ),
    { ...OPENGRAPH_IMAGE_SIZE },
  )
}
