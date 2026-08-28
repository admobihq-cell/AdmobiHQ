/** Admobi HQ Sentry project (admobi-media / admobi-hq). DSN is public by design. */
export const SENTRY_DSN =
  "https://31b3bd4f4e11809c71541c8dcb24a3f4@o4511701700182016.ingest.de.sentry.io/4511701707194448"

export const SENTRY_ORG = "admobi-media"
export const SENTRY_PROJECT = "admobi-hq"

function sentryDisabled() {
  if (process.env.SENTRY_DISABLED === "true") return true
  if (process.env.SENTRY_DSN === "") return true
  if (process.env.NODE_ENV === "development" && process.env.SENTRY_ENABLE_DEV !== "true") {
    return true
  }
  return false
}

export function resolveSentryDsn() {
  if (sentryDisabled()) return undefined
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? SENTRY_DSN
}

export function resolvePublicSentryDsn() {
  if (sentryDisabled()) return undefined
  return process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? SENTRY_DSN
}
