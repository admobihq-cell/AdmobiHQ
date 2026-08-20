import { createClerkClient } from "@clerk/backend"

/**
 * Admin client for the SEPARATE driver Clerk instance (DRIVER_CLERK_SECRET_KEY)
 * — never the ops instance's clerkClient() singleton in lib/auth.ts, which
 * reads CLERK_SECRET_KEY. See lib/driver-auth.ts's comment on why these two
 * instances must never be crossed.
 */
export const driverClerkClient = createClerkClient({
  secretKey: process.env.DRIVER_CLERK_SECRET_KEY,
})

/** DriverProfile has no email column and the driver JWT only carries `sub`
 * (see lib/driver-auth.ts), so notification emails resolve the address from
 * Clerk directly. Never throws — a Clerk hiccup should log, not block
 * submit/review. */
export async function getDriverEmail(clerkUserId: string): Promise<string | null> {
  try {
    const user = await driverClerkClient.users.getUser(clerkUserId)
    const primary = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId,
    )
    return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
  } catch (error) {
    console.error("[driver-clerk] failed to resolve driver email:", error)
    return null
  }
}
