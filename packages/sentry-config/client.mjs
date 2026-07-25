import * as Sentry from "@sentry/nextjs"

import { resolvePublicSentryDsn } from "./constants.mjs"
import { getSentryEnvironment, getTracesSampleRate } from "./environment.mjs"

export function initClientSentry({
  appName,
  enableSessionReplay = false,
  replaysSessionSampleRate = 0.1,
}) {
  Sentry.init({
    dsn: resolvePublicSentryDsn(),
    environment: getSentryEnvironment(),
    tracesSampleRate: getTracesSampleRate(),
    replaysSessionSampleRate: enableSessionReplay ? replaysSessionSampleRate : 0,
    replaysOnErrorSampleRate: enableSessionReplay ? 1.0 : 0,
    enableLogs: true,
    integrations: enableSessionReplay ? [Sentry.replayIntegration()] : [],
    initialScope: {
      tags: { app: appName },
    },
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
