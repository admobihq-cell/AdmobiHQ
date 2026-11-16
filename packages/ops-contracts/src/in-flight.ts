/**
 * A synchronous "one at a time" latch for buttons that move money (Refund, Record, Send payouts).
 *
 * `disabled={isPending}` is not enough on its own: a mutation's pending flag only changes on the next
 * render, so two quick taps can both reach `mutate`, and refunds carry no idempotency key. Call
 * `tryStart()` first thing in the handler and return if it says no; call `finish()` when the request
 * settles, whichever way it went.
 */
export function createInFlightGuard(): { tryStart: () => boolean; finish: () => void } {
  let busy = false
  return {
    tryStart: () => {
      if (busy) return false
      busy = true
      return true
    },
    finish: () => {
      busy = false
    },
  }
}
