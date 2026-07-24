export type FinanceTransaction = {
  id: string
  label: string
  meta: string
  amount: number
  kind: "credit" | "debit"
}

export const PLATFORM_WALLET_BALANCE = 1264800
export const PLATFORM_MONEY_IN_30D = 489000
export const PLATFORM_MONEY_OUT_30D = 193400
export const PLATFORM_ACTIVE_WALLETS = 58

export const PLATFORM_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: "1",
    label: "Nova Media — campaign top-up",
    meta: "2h ago",
    amount: 50000,
    kind: "credit",
  },
  {
    id: "2",
    label: "Driver payout batch #482",
    meta: "Yesterday",
    amount: 12400,
    kind: "debit",
  },
  {
    id: "3",
    label: "Skyline Ads — campaign top-up",
    meta: "Yesterday",
    amount: 25000,
    kind: "credit",
  },
  {
    id: "4",
    label: "Driver payout — J. Alvarez",
    meta: "2 days ago",
    amount: 1800,
    kind: "debit",
  },
  {
    id: "5",
    label: "Refund — cancelled campaign",
    meta: "3 days ago",
    amount: 6500,
    kind: "debit",
  },
]
