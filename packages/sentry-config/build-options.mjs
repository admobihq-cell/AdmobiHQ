/** Admobi HQ Sentry project (admobi-media / admobi-hq). DSN is public by design. */
export const SENTRY_DSN =
  "https://31b3bd4f4e11809c71541c8dcb24a3f4@o4511701700182016.ingest.de.sentry.io/4511701707194448"

export const SENTRY_ORG = "admobi-media"
export const SENTRY_PROJECT = "admobi-hq"

/** Shared `withSentryConfig()` options for Next.js apps in this monorepo. */
export function getSentryBuildPluginOptions() {
  return {
    org: process.env.SENTRY_ORG ?? SENTRY_ORG,
    project: process.env.SENTRY_PROJECT ?? SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    widenClientFileUpload: true,
    tunnelRoute: "/monitoring",
    silent: !process.env.CI,
  }
}
