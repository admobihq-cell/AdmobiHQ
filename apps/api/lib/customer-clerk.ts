import { createClerkClient } from "@clerk/backend"

/**
 * Admin client for the SEPARATE customer Clerk instance
 * (CUSTOMER_CLERK_SECRET_KEY) — never the ops instance's clerkClient()
 * singleton in lib/auth.ts, which reads CLERK_SECRET_KEY, and never the
 * driver instance's client in lib/driver-clerk.ts. These three Clerk
 * instances must never be crossed.
 */
export const customerClerkClient = createClerkClient({
  secretKey: process.env.CUSTOMER_CLERK_SECRET_KEY,
})
