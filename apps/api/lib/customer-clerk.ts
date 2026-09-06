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

/** Campaign has a contact_email the advertiser can set, but it's optional and
 * may differ from the account — so notification emails fall back to the Clerk
 * address, the same way getDriverEmail works. Never throws: a Clerk hiccup
 * should log, not block submit/review. */
export async function getCustomerEmail(clerkUserId: string): Promise<string | null> {
  try {
    const user = await customerClerkClient.users.getUser(clerkUserId)
    const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
    return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
  } catch (error) {
    console.error("[customer-clerk] failed to resolve customer email:", error)
    return null
  }
}

/** Best-effort display name for email greetings. Falls back to null so callers
 * can use their own "there". */
export async function getCustomerName(clerkUserId: string): Promise<string | null> {
  try {
    const user = await customerClerkClient.users.getUser(clerkUserId)
    return user.firstName ?? user.username ?? null
  } catch {
    return null
  }
}
