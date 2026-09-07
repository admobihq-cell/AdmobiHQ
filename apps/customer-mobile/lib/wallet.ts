import AsyncStorage from "@react-native-async-storage/async-storage"
import { useQuery } from "@tanstack/react-query"

// Deep, muted rust for the wallet hero card — deliberately darker/less
// saturated than c.primary so it reads as calm rather than a bright pop.
export const WALLET_CARD_BG = "#6B3018"
export const WALLET_CARD_FG = "#FAF9F7"

export function formatCurrency(value: number) {
  return `KES ${value.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

// Seed for the on-device balance below. The active-campaign line that used to
// sit beside it is gone: that number is real now, counted off
// /v1/customer/campaigns rather than frozen at 3.
export const PLACEHOLDER_WALLET_BALANCE = 18400

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

export const WALLET_QUERY_KEY = ["wallet"] as const

/**
 * The on-device wallet state, shared by the billing screen and the overview's
 * preview card. Both read through this one query so a top-up on billing is
 * reflected on the dashboard — the card used to render
 * `PLACEHOLDER_WALLET_BALANCE` directly and stayed frozen at 18,400 no matter
 * what the billing screen did.
 *
 * Still local-only: there is no balance endpoint until a payment provider is
 * wired up. See docs/customer/APP-MOBILE.md.
 */
export function useWallet() {
  return useQuery({
    queryKey: WALLET_QUERY_KEY,
    queryFn: async () => {
      const [balance, autoReload] = await Promise.all([
        getWalletBalance(),
        getAutoReloadSettings(),
      ])
      return { balance, autoReload }
    },
  })
}
