import { unstable_cache } from "next/cache"

import type { DateRangeKey } from "@workspace/ops-contracts"
import {
  countUnseenPayments,
  markPaymentsSeen as stampPaymentsSeen,
  queryFinanceLedger,
  queryFinanceOverview,
  queryFinancePayouts,
  queryFinanceWallets,
  queryPaymentsNeedingAttention,
  queryRecordOptions,
  toolMonthlyKes,
} from "@workspace/ops-queries"

import { getPgPool } from "@/lib/pg"

/** Ops finance, cached per tab for five minutes. The SQL lives in `@workspace/ops-queries`. */
export const FINANCE_CACHE_TAG = "ops-finance"
const CACHE = { revalidate: 300, tags: [FINANCE_CACHE_TAG] }

export const getFinanceOverview = (range: DateRangeKey) =>
  unstable_cache(() => queryFinanceOverview(getPgPool(), range), ["ops-finance-overview", range], CACHE)()
export const getFinanceLedger = (range: DateRangeKey) =>
  unstable_cache(() => queryFinanceLedger(getPgPool(), range), ["ops-finance-ledger", range], CACHE)()
export const getFinanceWallets = () => unstable_cache(() => queryFinanceWallets(getPgPool()), ["ops-finance-wallets"], CACHE)()
export const getFinancePayouts = (range: DateRangeKey) =>
  unstable_cache(() => queryFinancePayouts(getPgPool(), range), ["ops-finance-payouts", range], CACHE)()
export const getPaymentsNeedingAttention = () =>
  unstable_cache(() => queryPaymentsNeedingAttention(getPgPool()), ["ops-finance-attention"], CACHE)()
export const getToolCosts = () => unstable_cache(() => toolMonthlyKes(getPgPool()), ["ops-finance-tools"], CACHE)()
export const getRecordOptions = () => unstable_cache(() => queryRecordOptions(getPgPool()), ["ops-finance-options"], CACHE)()

/** Settled payments nobody in ops has opened the ledger for yet: the Finances nav badge. */
export const getUnseenPaymentsCount = () =>
  unstable_cache(() => countUnseenPayments(getPgPool()), ["ops-finance-unseen-payments"], CACHE)()

/** Stamps every unseen settled payment as seen; returns how many it stamped. */
export const markPaymentsSeen = (): Promise<number> => stampPaymentsSeen(getPgPool())
