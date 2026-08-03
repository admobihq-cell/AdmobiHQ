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
