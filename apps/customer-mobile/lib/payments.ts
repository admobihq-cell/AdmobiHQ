import * as WebBrowser from "expo-web-browser"
import type { FinanceSummaryDto, TransactionPageDto } from "@workspace/ops-contracts"

import { authedFetch, jsonInit, type GetToken } from "@/lib/campaigns-client"

export type CheckoutStart = { authorizationUrl: string; reference: string; amountKes: number }
export type PaymentStatus = "pending" | "success" | "failed" | "abandoned" | "amount_mismatch"

const POLL_MS = 3_000
const POLL_FOR_MS = 2 * 60_000
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function checkoutCampaign(getToken: GetToken, campaignId: number): Promise<CheckoutStart> {
  return (await authedFetch(getToken, `/v1/customer/campaigns/${campaignId}/checkout`, { method: "POST" })).json()
}

export async function startTopUp(getToken: GetToken, amountKes: number): Promise<CheckoutStart> {
  return (await authedFetch(getToken, "/v1/customer/payments/top-up", jsonInit("POST", { amountKes }))).json()
}

export async function getPaymentStatus(getToken: GetToken, reference: string): Promise<PaymentStatus> {
  const res = await authedFetch(getToken, `/v1/customer/payments/${encodeURIComponent(reference)}`)
  return ((await res.json()) as { status: PaymentStatus }).status
}

/**
 * Opens Paystack's hosted checkout in the in-app browser. When the browser
 * closes, polls the same status endpoint the web return page uses, every 3 s
 * for up to 2 minutes. "pending" after that means the webhook or the nightly
 * cron will finish it; the money is never lost.
 */
export async function payWithPaystack(getToken: GetToken, start: CheckoutStart): Promise<PaymentStatus> {
  await WebBrowser.openBrowserAsync(start.authorizationUrl)
  const until = Date.now() + POLL_FOR_MS
  for (;;) {
    const status = await getPaymentStatus(getToken, start.reference).catch(() => "pending" as const)
    if (status !== "pending" || Date.now() > until) return status
    await sleep(POLL_MS)
  }
}

export async function getFinanceSummary(getToken: GetToken): Promise<FinanceSummaryDto> {
  return (await authedFetch(getToken, "/v1/customer/finance/summary?range=30d")).json()
}

export async function getRecentTransactions(getToken: GetToken): Promise<TransactionPageDto> {
  return (await authedFetch(getToken, "/v1/customer/finance/transactions?range=90d&sort=date_desc")).json()
}

/** `dueKes` from a 402 submit response, if the error carries one. */
export function dueKesOf(error: unknown): number | null {
  const due = (error as { body?: { dueKes?: unknown } } | null)?.body?.dueKes
  return typeof due === "number" ? due : null
}
