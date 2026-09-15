import { NextResponse } from "next/server"

/**
 * iOS Universal Links verification for the Expo app's
 * `applinks:app.admobihq.com` associated domain (see
 * apps/customer-mobile/app.json). Only /invitations/* is claimed — every other
 * path keeps opening in Safari.
 *
 * APPLE_APP_TEAM_ID is the 10-character Apple Developer Team ID. Unset means
 * "not configured yet" — a 404, which iOS treats as unclaimed.
 */
export function GET() {
  const teamId = process.env.APPLE_APP_TEAM_ID?.trim()
  if (!teamId) {
    return new NextResponse(null, { status: 404 })
  }

  const bundleId = process.env.APPLE_APP_BUNDLE_ID ?? "com.admobihq.app"

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [{ appID: `${teamId}.${bundleId}`, paths: ["/invitations/*"] }],
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    },
  )
}
