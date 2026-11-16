import { jsonError } from "@/lib/api-utils"
import { PaystackError } from "@/lib/payments/paystack"
import { CheckoutConfigError } from "@/lib/payments/start-checkout"

/** Paystack or config failures while opening a checkout; never leaks Paystack's body. */
export function checkoutErrorResponse(error: unknown) {
  console.error("[payments] checkout failed:", error)
  if (error instanceof CheckoutConfigError) return jsonError("Payments aren't available right now", 503)
  if (error instanceof PaystackError) return jsonError("Couldn't start the payment. Please try again.", 502)
  return jsonError("Couldn't start the payment. Please try again.", 502)
}
