import { initClientSentry, onRouterTransitionStart } from "@workspace/sentry-config/client"

initClientSentry({ appName: "app", enableSessionReplay: true })

export { onRouterTransitionStart }
