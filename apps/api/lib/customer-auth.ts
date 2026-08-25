import { verifyToken } from "@clerk/backend"
import { headers } from "next/headers"

/**
 * Verifies against the CUSTOMER Clerk instance (CUSTOMER_CLERK_SECRET_KEY), a
 * separate instance from ops (lib/auth.ts) and driver (lib/driver-auth.ts).
 * Bearer-token only, no session-cookie fallback — apps/api is a separate
 * origin from customer-web/customer-mobile. Callers must send
 * `Authorization: Bearer <token>` using a token from the customer Clerk
 * instance's getToken().
 */

export type CustomerAccess =
  | { status: "unauthenticated" }
  | { status: "authorized"; userId: string }

async function resolveCustomerUserId(): Promise<string | null> {
  const authHeader = (await headers()).get("authorization")
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null
  if (!bearer) {
    return null
  }

  try {
    const payload = await verifyToken(bearer, {
      secretKey: process.env.CUSTOMER_CLERK_SECRET_KEY,
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}

export async function getCustomerAccess(): Promise<CustomerAccess> {
  const userId = await resolveCustomerUserId()
  if (!userId) {
    return { status: "unauthenticated" }
  }
  return { status: "authorized", userId }
}

export async function requireCustomerUser() {
  const access = await getCustomerAccess()
  if (access.status === "unauthenticated") {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  return access
}
