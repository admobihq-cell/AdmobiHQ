import * as Updates from "expo-updates"
import { formatApiError } from "@workspace/ops-api-client"

/** Mirrors lib/sentry.ts's environment resolution: only a local Metro/dev-client session gets engineer-facing detail. Preview and production builds (what staff actually run) get plain, actionable copy. */
function isEngineerBuild(): boolean {
  return __DEV__ || Updates.channel === "development"
}

export function formatOpsError(err: unknown, opsUrl: string): string {
  const verbose = isEngineerBuild()
  return formatApiError(err, {
    apiUrl: opsUrl,
    verbose,
    networkHint: verbose
      ? `Cannot reach the ops API at ${opsUrl}. Run \`npm run env:pull -w ops-mobile\` and use your machine's LAN IP (not localhost) when testing on a phone.`
      : "Can't reach Admobi's servers right now. Check your connection and try again, or contact IT if this continues.",
  })
}
