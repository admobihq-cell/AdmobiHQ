/**
 * The advertiser's company lives in Clerk's `unsafeMetadata` rather than
 * Postgres because Clerk is the system of record for customer identity here —
 * ops reads it back with `readCompanyName` in apps/api/lib/customer-clerk.ts.
 * `unsafeMetadata` is the one metadata bag a signed-in client may write, which
 * is what lets the sign-up form, the first-load prompt, and account settings
 * all set it without an API route. Keeping the key in one place so those four
 * readers/writers can't drift apart.
 */
const COMPANY_NAME_KEY = "companyName"

export function readCompanyName(unsafeMetadata: unknown): string {
  if (typeof unsafeMetadata !== "object" || unsafeMetadata === null) return ""
  const value = (unsafeMetadata as Record<string, unknown>)[COMPANY_NAME_KEY]
  return typeof value === "string" ? value.trim() : ""
}

/** Merges rather than replaces — `update()` overwrites the whole bag. */
export function withCompanyName(
  unsafeMetadata: unknown,
  companyName: string,
): Record<string, unknown> {
  const base = typeof unsafeMetadata === "object" && unsafeMetadata !== null ? unsafeMetadata : {}
  return { ...(base as Record<string, unknown>), [COMPANY_NAME_KEY]: companyName.trim() }
}
