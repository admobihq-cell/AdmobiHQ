import { OpsApiError } from "@workspace/ops-api-client"

export function formatOpsError(err: unknown, opsUrl: string): string {
  if (err instanceof OpsApiError) {
    if (err.status === 401) {
      return "Session expired. Sign out and sign in again."
    }
    if (err.status === 403) {
      return "Access denied. Use your @admobihq.com account."
    }
    return err.message
  }

  if (err instanceof TypeError) {
    const message = err.message.toLowerCase()
    if (
      message.includes("network request failed") ||
      message.includes("failed to fetch")
    ) {
      return `Cannot reach the ops API at ${opsUrl}. Run \`npm run env:pull -w mobile\` and use your machine's LAN IP (not localhost) when testing on a phone.`
    }
  }

  return err instanceof Error ? err.message : "Request failed"
}
