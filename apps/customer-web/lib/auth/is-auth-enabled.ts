/**
 * Real auth (Clerk) only turns on when both the flag and the customer
 * instance's publishable key are present — a stray flag with no key must
 * never crash the app into a half-mounted ClerkProvider.
 */
export function isAuthEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" &&
    Boolean(process.env.NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY)
  )
}
