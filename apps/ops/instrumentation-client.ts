import { initClientSentry, onRouterTransitionStart } from "@workspace/sentry-config/client"

initClientSentry({ appName: "ops", enableSessionReplay: false })

export { onRouterTransitionStart }
