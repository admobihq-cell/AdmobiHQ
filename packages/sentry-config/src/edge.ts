import * as Sentry from "@sentry/nextjs"

import { resolveSentryDsn } from "@workspace/sentry-config/constants"
import { getSentryEnvironment, getTracesSampleRate } from "@workspace/sentry-config/environment"

type EdgeSentryOptions = {
  appName: "web" | "customer-web" | "ops" | "api"
}

export function initEdgeSentry({ appName }: EdgeSentryOptions): void {
  Sentry.init({
    dsn: resolveSentryDsn(),
    environment: getSentryEnvironment(),
    tracesSampleRate: getTracesSampleRate(),
    enableLogs: true,
    initialScope: {
      tags: { app: appName },
    },
  })
}
