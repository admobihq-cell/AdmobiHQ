"use server"

import { updateTag } from "next/cache"

import { requireOpsPermission } from "@/lib/auth"
import { FINANCE_CACHE_TAG, markPaymentsSeen } from "@/lib/queries/finance"

/** Called when the ledger opens: clears the Finances badge. True if anything was newly seen. */
export async function seePayments(): Promise<boolean> {
  await requireOpsPermission("finances")
  if ((await markPaymentsSeen()) === 0) return false
  updateTag(FINANCE_CACHE_TAG)
  return true
}

/**
 * Called after a transaction is recorded, so the ledger, wallets and totals show it straight
 * away instead of after the five-minute cache window. Needs the same permission as the page.
 */
export async function refreshFinance(): Promise<void> {
  await requireOpsPermission("finances")
  updateTag(FINANCE_CACHE_TAG)
}
