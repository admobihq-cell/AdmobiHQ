import { formatApiError } from "@workspace/ops-api-client"

export function formatOpsError(err: unknown, opsUrl: string): string {
  return formatApiError(err, {
    apiUrl: opsUrl,
    networkHint: `Cannot reach the ops API at ${opsUrl}. Run \`npm run env:pull -w mobile\` and use your machine's LAN IP (not localhost) when testing on a phone.`,
  })
}
