import * as Sentry from "@sentry/nextjs"

import { resolveSentryDsn } from "@workspace/sentry-config/constants"
import { getSentryEnvironment, getTracesSampleRate } from "@workspace/sentry-config/environment"

type ServerSentryOptions = {
  appName: "web" | "customer-web" | "driver-web" | "ops" | "api"
}

export function initServerSentry({ appName }: ServerSentryOptions): void {
  const dsn = resolveSentryDsn()
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: getSentryEnvironment(),
    tracesSampleRate: getTracesSampleRate(),
    includeLocalVariables: false,
    enableLogs: false,
    initialScope: {
      tags: { app: appName },
    },
  })
}
