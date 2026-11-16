import { Suspense } from "react"

import { PaymentReturnView } from "@/components/billing/payment-return-view"

export const metadata = { title: "Payment" }

export default function PaymentReturnPage() {
  return (
    // Paystack appends ?reference= (and ?trxref=) to the callback URL.
    <Suspense fallback={null}>
      <PaymentReturnView />
    </Suspense>
  )
}
