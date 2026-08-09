import { initClientSentry, onRouterTransitionStart } from "@workspace/sentry-config/client"

initClientSentry({ appName: "driver-web", enableSessionReplay: true })

export { onRouterTransitionStart }
