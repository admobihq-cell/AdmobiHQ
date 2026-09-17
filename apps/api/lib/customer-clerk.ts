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

/** Reads the company name an advertiser gave at sign-up. It lives in Clerk's
 * unsafeMetadata rather than Postgres because Clerk is the system of record for
 * customer identity here — the ops Users list reads Clerk, and `customers` rows
 * are only a support/announcement side-table. `<AdvertiserSignUp>` writes this
 * exact key; see docs/shared/AUTH.md §3. */
export function readCompanyName(user: { unsafeMetadata?: unknown }): string | null {
  const metadata = user.unsafeMetadata
  if (typeof metadata !== "object" || metadata === null) return null
  const companyName = (metadata as Record<string, unknown>).companyName
  return typeof companyName === "string" && companyName.trim() ? companyName.trim() : null
}

/** Best-effort like getCustomerEmail — ops campaign review must still render if
 * Clerk is unreachable, so a failure is a missing company, not a 500. */
export async function getCustomerCompanyName(clerkUserId: string): Promise<string | null> {
  try {
    return readCompanyName(await customerClerkClient.users.getUser(clerkUserId))
  } catch (error) {
    console.error("[customer-clerk] failed to resolve company name:", error)
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
