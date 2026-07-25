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
    // Replay is added lazily below (when enabled) instead of listed here, so its
    // recorder (~100KB+) is code-split out of the initial bundle instead of
    // shipping to every visitor on first paint.
    integrations: [],
    initialScope: {
      tags: { app: appName },
    },
  })

  if (enableSessionReplay && typeof window !== "undefined") {
    const loadReplay = () => {
      import("@sentry/nextjs").then((lazyLoadedSentry) => {
        Sentry.addIntegration(lazyLoadedSentry.replayIntegration())
      })
    }
    if (document.readyState === "complete") {
      loadReplay()
    } else {
      window.addEventListener("load", loadReplay, { once: true })
    }
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
