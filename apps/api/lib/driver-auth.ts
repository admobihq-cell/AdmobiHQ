import { verifyToken } from "@clerk/backend"
import { headers } from "next/headers"

/**
 * Verifies against the DRIVER Clerk instance (DRIVER_CLERK_SECRET_KEY), a
 * separate instance from the ops Clerk instance apps/api/lib/auth.ts
 * verifies against (CLERK_SECRET_KEY) — see apps/driver-web/middleware.ts's
 * comment on the jwk-kid-mismatch bug this split avoids.
 *
 * Bearer-token only, no session-cookie fallback: apps/api is a separate
 * origin from driver-web/driver-mobile, so there's no shared Clerk session
 * cookie to read via auth(). Callers must send
 * `Authorization: Bearer <token>` using a token from the driver Clerk
 * instance's getToken().
 */

export type DriverAccess =
  | { status: "unauthenticated" }
  | { status: "authorized"; userId: string }

async function resolveDriverUserId(): Promise<string | null> {
  const authHeader = (await headers()).get("authorization")
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null
  if (!bearer) {
    return null
  }

  try {
    const payload = await verifyToken(bearer, {
      secretKey: process.env.DRIVER_CLERK_SECRET_KEY,
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}

export async function getDriverAccess(): Promise<DriverAccess> {
  const userId = await resolveDriverUserId()
  if (!userId) {
    return { status: "unauthenticated" }
  }
  return { status: "authorized", userId }
}

export async function requireDriverUser() {
  const access = await getDriverAccess()
  if (access.status === "unauthenticated") {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  return access
}
