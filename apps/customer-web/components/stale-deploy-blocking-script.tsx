import { getStaleDeployBlockingScript } from "@/lib/stale-deploy-reload"

/** Must render as a plain inline <script> directly in <head>, before any
 * module script — see getStaleDeployBlockingScript's doc comment. */
export function StaleDeployBlockingScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: getStaleDeployBlockingScript() }}
      suppressHydrationWarning
    />
  )
}
