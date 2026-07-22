import { initClientSentry, onRouterTransitionStart } from "@workspace/sentry-config/client"

initClientSentry({ appName: "customer-web", enableSessionReplay: true })

export { onRouterTransitionStart }
