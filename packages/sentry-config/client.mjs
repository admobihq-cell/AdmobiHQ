import * as Sentry from "@sentry/nextjs"
import { hasFullConsent } from "@workspace/ui/lib/cookie-consent"

import { resolvePublicSentryDsn } from "./constants.mjs"
import { getSentryEnvironment, getTracesSampleRate } from "./environment.mjs"

/**
 * @param {object} options
 * @param {string} options.appName
 * @param {boolean} [options.enableSessionReplay]
 * @param {number} [options.replaysSessionSampleRate]
 * @param {boolean} [options.requireConsent] Skip init entirely until the
 *   visitor has accepted the cookie-consent banner's "Accept all" option
 *   (see @workspace/ui/lib/cookie-consent). Internal tools (ops) omit this —
 *   no public-visitor consent concern there. Server/edge Sentry init in this
 *   package is never gated: it captures request-handling errors, not
 *   anything stored in or read from the visitor's browser.
 */
export function initClientSentry({
  appName,
  enableSessionReplay = false,
  replaysSessionSampleRate = 0.02,
  requireConsent = false,
}) {
  if (requireConsent && !hasFullConsent()) {
    return
  }

  const dsn = resolvePublicSentryDsn()
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: getSentryEnvironment(),
    tracesSampleRate: getTracesSampleRate(),
    replaysSessionSampleRate: enableSessionReplay ? replaysSessionSampleRate : 0,
    replaysOnErrorSampleRate: enableSessionReplay ? 1.0 : 0,
    enableLogs: false,
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
