import { NextResponse } from "next/server"

/**
 * Android App Links verification for the Expo app's
 * https://app.admobihq.com/invitations/* intent filter (see
 * apps/customer-mobile/app.json). Without this file Android shows a chooser
 * instead of opening the app directly.
 *
 * Fingerprints are public but build-specific, so they come from env rather
 * than being committed: ANDROID_APP_CERT_FINGERPRINTS is a comma-separated
 * list of SHA-256 signing-certificate fingerprints (get them with
 * `eas credentials`). Unset means "not configured yet" — a 404, which Android
 * treats as unverified, exactly the behaviour before this route existed.
 */
export function GET() {
  const fingerprints = (process.env.ANDROID_APP_CERT_FINGERPRINTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  if (!fingerprints.length) {
    return new NextResponse(null, { status: 404 })
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: process.env.ANDROID_APP_PACKAGE ?? "com.admobihq.app",
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=3600" } },
  )
}
