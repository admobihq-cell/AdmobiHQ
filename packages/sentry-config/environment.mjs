export function getSentryEnvironment() {
  return process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development"
}

export function getTracesSampleRate() {
  return process.env.NODE_ENV === "development" ? 1.0 : 0.1
}
