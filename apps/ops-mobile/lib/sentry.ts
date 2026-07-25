import * as Sentry from "@sentry/react-native"
import * as Updates from "expo-updates"

/** Admobi HQ Sentry project (admobi-media / admobi-hq), shared with the web apps. DSN is public by design. */
const SENTRY_DSN =
  "https://31b3bd4f4e11809c71541c8dcb24a3f4@o4511701700182016.ingest.de.sentry.io/4511701707194448"

function resolveEnvironment(): string {
  return Updates.channel || (__DEV__ ? "development" : "production")
}

export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? SENTRY_DSN,
    environment: resolveEnvironment(),
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    initialScope: {
      tags: { app: "ops-mobile" },
    },
  })
}
