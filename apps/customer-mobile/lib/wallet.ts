import AsyncStorage from "@react-native-async-storage/async-storage"

// Deep, muted rust for the wallet hero card — deliberately darker/less
// saturated than c.primary so it reads as calm rather than a bright pop.
export const WALLET_CARD_BG = "#6B3018"
export const WALLET_CARD_FG = "#FAF9F7"

export function formatCurrency(value: number) {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

// Shared between the dashboard preview card and the billing screen so they
// can't silently drift once either one gets wired to a real balance.
export const PLACEHOLDER_WALLET_BALANCE = 18400
export const PLACEHOLDER_ACTIVE_CAMPAIGN_COUNT = 3

// Local-only wallet state for the billing screen's "top up" / "auto reload"
// actions (web demo only — see app/(tabs)/settings/billing.tsx). Nothing
// here talks to a real payment provider; it's an on-device number, same
// honesty as the rest of this app's placeholder data.
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

export async function getWalletBalance(): Promise<number> {
  const raw = await AsyncStorage.getItem(BALANCE_KEY)
  return raw ? Number(raw) : PLACEHOLDER_WALLET_BALANCE
}

export async function topUpWallet(amount: number): Promise<number> {
  const current = await getWalletBalance()
  const next = current + amount
  await AsyncStorage.setItem(BALANCE_KEY, String(next))
  return next
}

export async function getAutoReloadSettings(): Promise<AutoReloadSettings> {
  const raw = await AsyncStorage.getItem(AUTO_RELOAD_KEY)
  return raw ? (JSON.parse(raw) as AutoReloadSettings) : DEFAULT_AUTO_RELOAD
}

export async function setAutoReloadSettings(settings: AutoReloadSettings): Promise<void> {
  await AsyncStorage.setItem(AUTO_RELOAD_KEY, JSON.stringify(settings))
}
