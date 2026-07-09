import { initClientSentry, onRouterTransitionStart } from "@workspace/sentry-config/client"

initClientSentry({ appName: "web", enableSessionReplay: true })

export { onRouterTransitionStart }
