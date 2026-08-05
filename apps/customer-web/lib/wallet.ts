// Local-only wallet state for the Wallet page's "top up" / "auto reload"
// actions — mirrors apps/customer-mobile/lib/wallet.ts so the web and
// mobile experiences match. Nothing here talks to a real payment provider;
// it's an on-device number, same honesty as the rest of this app's
// placeholder data.

export function formatCurrency(value: number) {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

export const PLACEHOLDER_WALLET_BALANCE = 18400
export const PLACEHOLDER_ACTIVE_CAMPAIGN_COUNT = 3

const BALANCE_KEY = "admobi.customer.walletBalance"
const AUTO_RELOAD_KEY = "admobi.customer.autoReload"

export type AutoReloadSettings = {
  enabled: boolean
  threshold: number
  topUpAmount: number
}

const DEFAULT_AUTO_RELOAD: AutoReloadSettings = {
  enabled: false,
  threshold: 20000,
  topUpAmount: 30000,
}

export function getWalletBalance(): number {
  if (typeof window === "undefined") return PLACEHOLDER_WALLET_BALANCE
  const raw = window.localStorage.getItem(BALANCE_KEY)
  return raw ? Number(raw) : PLACEHOLDER_WALLET_BALANCE
}

export function topUpWallet(amount: number): number {
  const next = getWalletBalance() + amount
  if (typeof window !== "undefined") {
    window.localStorage.setItem(BALANCE_KEY, String(next))
  }
  return next
}

export function getAutoReloadSettings(): AutoReloadSettings {
  if (typeof window === "undefined") return DEFAULT_AUTO_RELOAD
  const raw = window.localStorage.getItem(AUTO_RELOAD_KEY)
  return raw ? (JSON.parse(raw) as AutoReloadSettings) : DEFAULT_AUTO_RELOAD
}

export function setAutoReloadSettings(settings: AutoReloadSettings): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(AUTO_RELOAD_KEY, JSON.stringify(settings))
  }
}
