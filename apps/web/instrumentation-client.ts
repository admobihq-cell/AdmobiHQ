import { initClientSentry, onRouterTransitionStart } from "@workspace/sentry-config/client"

// Marketing traffic is anonymous and high-volume; sample sessions lightly and
// rely on replaysOnErrorSampleRate (always 1.0 when enabled) to still capture
// actual errors in full.
initClientSentry({
  appName: "web",
  enableSessionReplay: true,
  replaysSessionSampleRate: 0.02,
  requireConsent: true,
})

export { onRouterTransitionStart }
