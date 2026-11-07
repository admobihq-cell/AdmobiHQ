import { Suspense } from "react"

import { BillingView } from "@/components/billing/billing-view"

import BillingLoading from "./loading"

export const metadata = { title: "Finance & Billing" }

export default function BillingPage() {
  return (
    // The view reads ?tab= and ?range= with useSearchParams, which needs a boundary here.
    <Suspense fallback={<BillingLoading />}>
      <BillingView />
    </Suspense>
  )
}
