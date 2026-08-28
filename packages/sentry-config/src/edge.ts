import * as Sentry from "@sentry/nextjs"

import { resolveSentryDsn } from "@workspace/sentry-config/constants"
import { getSentryEnvironment, getTracesSampleRate } from "@workspace/sentry-config/environment"

type EdgeSentryOptions = {
  appName: "web" | "customer-web" | "driver-web" | "ops" | "api"
}

export function initEdgeSentry({ appName }: EdgeSentryOptions): void {
  const dsn = resolveSentryDsn()
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: getSentryEnvironment(),
    tracesSampleRate: getTracesSampleRate(),
    enableLogs: false,
    initialScope: {
      tags: { app: appName },
    },
  })
}
