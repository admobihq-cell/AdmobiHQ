import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Admobi — Digital taxi-top OOH in Kenya"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 72,
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ fontSize: 28, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.65 }}>
          Nairobi · Kenya
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <p style={{ fontSize: 72, fontWeight: 600, lineHeight: 1.05, margin: 0 }}>Admobi</p>
          <p style={{ fontSize: 36, lineHeight: 1.35, maxWidth: 900, opacity: 0.88, margin: 0 }}>
            Digital taxi-top OOH that moves with the city
          </p>
        </div>
      </div>
    ),
    { ...size },
  )
}
