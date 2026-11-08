"use client"

import { useAuth } from "@clerk/nextjs"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { ANALYTICS_QUERY_KEY } from "@/lib/analytics-client"
import { authedFetch, jsonInit, type CheckoutStart } from "@/lib/campaigns-client"

export type PaymentStatusView = {
  status: "pending" | "success" | "failed" | "abandoned" | "amount_mismatch"
  amountKes: number
  campaignId: number | null
  invoiceId: number | null
  /** Receipt fields; null until Paystack confirms. */
  reference: string
  channel: string | null
  paidAt: string | null
  invoiceNumber: string | null
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong")
const POLL_MS = 3_000
const POLL_FOR_MS = 5 * 60_000

/** Standalone top-up: opens Paystack checkout and leaves the page for it. */
export function useTopUp() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (amountKes: number): Promise<CheckoutStart> =>
      (await authedFetch(getToken, "/v1/customer/payments/top-up", jsonInit("POST", { amountKes }))).json(),
    onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
    onError: (error) => toast.error(messageOf(error)),
  })
}

/** Polls a payment every 3 s until it settles or fails, for up to 5 minutes. */
export function usePaymentStatus(reference: string | null) {
  const { getToken, isLoaded } = useAuth()
  const queryClient = useQueryClient()
  const [startedAt] = useState(() => Date.now())
  const query = useQuery({
    queryKey: ["customer-payment", reference],
    queryFn: async (): Promise<PaymentStatusView> => {
      const view: PaymentStatusView = await (
        await authedFetch(getToken, `/v1/customer/payments/${encodeURIComponent(reference!)}`)
      ).json()
      // Money moved: balances, ledgers and the campaign itself are stale.
      if (view.status === "success") {
        void queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY })
        void queryClient.invalidateQueries({ queryKey: ["customer-campaigns"] })
        void queryClient.invalidateQueries({ queryKey: ["customer-campaign"] })
      }
      return view
    },
    enabled: Boolean(reference) && isLoaded,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" && Date.now() - startedAt < POLL_FOR_MS ? POLL_MS : false,
    retry: 2,
  })
  // Polling stopped with the payment still pending: the webhook or the nightly cron will finish it.
  const gaveUp = query.data?.status === "pending" && query.dataUpdatedAt - startedAt >= POLL_FOR_MS
  return { ...query, gaveUp }
}

/** "Request refund": opens a billing support case for ops. */
export function useRequestRefund() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (input: { amountKes: number; note?: string }) =>
      (await authedFetch(getToken, "/v1/customer/payments/refund-request", jsonInit("POST", input))).json(),
    onSuccess: () => toast.success("Refund requested. Our team will be in touch."),
    onError: (error) => toast.error(messageOf(error)),
  })
}
