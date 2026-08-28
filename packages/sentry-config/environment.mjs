export function getSentryEnvironment() {
  return process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"
}

/** Production/preview: 5%. Local next/expo: 0 unless SENTRY_ENABLE_DEV=true. */
export function getTracesSampleRate() {
  if (process.env.NODE_ENV === "development") {
    return process.env.SENTRY_ENABLE_DEV === "true" ? 0.05 : 0
  }
  return 0.05
}
