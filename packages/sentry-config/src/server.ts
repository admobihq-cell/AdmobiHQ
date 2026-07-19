import * as Sentry from "@sentry/nextjs"

import { resolveSentryDsn } from "@workspace/sentry-config/constants"
import { getSentryEnvironment, getTracesSampleRate } from "@workspace/sentry-config/environment"

type ServerSentryOptions = {
  appName: "web" | "app" | "ops" | "api"
}

export function initServerSentry({ appName }: ServerSentryOptions): void {
  Sentry.init({
    dsn: resolveSentryDsn(),
    environment: getSentryEnvironment(),
    tracesSampleRate: getTracesSampleRate(),
    includeLocalVariables: true,
    enableLogs: true,
    initialScope: {
      tags: { app: appName },
    },
  })
}
