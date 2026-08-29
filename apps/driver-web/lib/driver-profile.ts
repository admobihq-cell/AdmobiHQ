import { auth } from "@clerk/nextjs/server"
import { unstable_cache } from "next/cache"
import { unstable_rethrow } from "next/navigation"
import type { DriverProfileDto } from "@workspace/ops-contracts"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { apiPublicUrl } from "@/lib/site-urls"

export type DriverProfileFetchResult =
  | { status: "ok"; profile: DriverProfileDto }
  | { status: "error" }

async function fetchDriverProfileDto(token: string): Promise<DriverProfileDto> {
  const res = await fetch(`${apiPublicUrl()}/v1/driver/profile`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    // Generous even for prod: apps/api's first hit after a cold start
    // (dev-mode route compilation, or a cold Lambda) can take several
    // seconds on its own — a tight timeout here turns that into a false
    // "can't verify your profile" for the driver instead of just being slow.
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`${res.status} from /v1/driver/profile: ${body}`)
  }

  return (await res.json()) as DriverProfileDto
}

/** Server-side authenticated fetch of the signed-in driver's profile, used
 * to gate (shell) routes and to hydrate the profile-setup stepper. Unlike
 * getPlatformFlags() (additive, fails-open to an empty set), a failed fetch
 * here must NOT silently let an unapproved driver through — callers should
 * show a retry state on { status: "error" }, never treat it as approved.
 *
 * Cached per Clerk user for 5 minutes so shell navigations do not hit the API
 * (and Neon) on every request. Keyed by userId so profiles cannot leak.
 * Failures throw and are not cached. */
export async function fetchDriverProfile(): Promise<DriverProfileFetchResult> {
  if (!isAuthEnabled()) {
    return { status: "error" }
  }

  try {
    const { userId, getToken } = await auth()
    const token = await getToken()
    if (!userId || !token) {
      console.error("[fetchDriverProfile] auth().getToken() returned no token")
      return { status: "error" }
    }

    const profile = await unstable_cache(
      () => fetchDriverProfileDto(token),
      ["driver-profile", userId],
      { revalidate: 300 },
    )()
    return { status: "ok", profile }
  } catch (error) {
    // auth() reads headers(); catching that during SSG hides the dynamic
    // bailout from Next and the route is prerendered without a session.
    unstable_rethrow(error)
    console.error("[fetchDriverProfile] threw:", error)
    return { status: "error" }
  }
}
