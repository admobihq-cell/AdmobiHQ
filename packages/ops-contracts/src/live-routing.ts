import type { LiveEvent } from "./live"

/**
 * Which advertiser-web query keys a live event makes stale. Keys are prefixes: TanStack Query
 * invalidates every query that starts with them. Kept here (not in customer-web) so it's tested.
 */
const MONEY_PREFIXES = ["payment_", "refund_", "billing_document_", "top_up", "credit_"]

export function customerKeysForEvent(event: LiveEvent): unknown[][] {
  switch (event.topic) {
    case "notification": {
      const type = event.type ?? ""
      const keys: unknown[][] = [["customer-notifications"]]
      if (type.startsWith("campaign_")) keys.push(["customer-campaigns"], ["customer-campaign"])
      if (MONEY_PREFIXES.some((prefix) => type.startsWith(prefix))) keys.push(["customer-analytics"])
      return keys
    }
    case "payment":
      return [["customer-analytics"], ["customer-payment"]]
    case "billing-document":
      return [
        ["customer-analytics", "billing-documents"],
        ["customer-analytics", "invoices"],
      ]
    case "campaign":
      return [["customer-campaigns"], ["customer-campaign", ...(event.id !== undefined ? [event.id] : [])]]
    default:
      return []
  }
}

const WARNING_TYPES = new Set(["campaign_rejected", "campaign_changes_requested", "payment_failed", "payment_not_applied"])

/** Toast tone and sound for an advertiser notification type. */
export function customerToastTone(type: string): { tone: "info" | "success" | "warning"; sound: "chime" | "ping" | "low" } {
  if (WARNING_TYPES.has(type)) return { tone: "warning", sound: "low" }
  if (type === "campaign_approved" || type === "payment_received") return { tone: "success", sound: "ping" }
  return { tone: "info", sound: "chime" }
}

/** What a driver event makes stale. */
export function driverKeysForEvent(event: LiveEvent): unknown[][] {
  if (event.topic !== "notification") return []
  const type = event.type ?? ""
  const keys: unknown[][] = [["driver-notifications"]]
  if (type.startsWith("application_")) keys.push(["driver-profile"])
  if (type.startsWith("payout_")) keys.push(["driver-payouts"])
  if (type.startsWith("sos_")) keys.push(["sos"])
  return keys
}

const DRIVER_SUCCESS = new Set(["application_approved", "payout_settled"])
const DRIVER_WARNING = new Set(["application_rejected", "application_changes_requested", "payout_failed"])

/** Toast tone and sound for a driver notification type. */
export function driverToastTone(type: string): { tone: "info" | "success" | "warning"; sound: "chime" | "ping" | "low" } {
  if (DRIVER_WARNING.has(type)) return { tone: "warning", sound: "low" }
  if (DRIVER_SUCCESS.has(type)) return { tone: "success", sound: "ping" }
  return { tone: "info", sound: "chime" }
}
