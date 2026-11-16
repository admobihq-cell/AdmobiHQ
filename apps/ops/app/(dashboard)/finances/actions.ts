"use server"

import { updateTag } from "next/cache"

import { requireOpsPermission } from "@/lib/auth"
import { FINANCE_CACHE_TAG } from "@/lib/queries/finance"

/**
 * Called after a transaction is recorded, so the ledger, wallets and totals show it straight
 * away instead of after the five-minute cache window. Needs the same permission as the page.
 */
export async function refreshFinance(): Promise<void> {
  await requireOpsPermission("finances")
  updateTag(FINANCE_CACHE_TAG)
}
