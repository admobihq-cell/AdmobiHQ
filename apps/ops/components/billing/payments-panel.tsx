import { BILLING_PAYMENT_METHOD_LABELS, formatKes, type BillingDocumentDto } from "@workspace/ops-contracts"

import { formatDay } from "@/components/finances/billing-status"

/** Total / paid / balance and the payments recorded against a sent invoice. */
export function PaymentsPanel({ doc }: { doc: BillingDocumentDto }) {
  const stats = [
    { label: "Total", value: formatKes(doc.totalKes) },
    { label: "Paid", value: formatKes(doc.paidKes) },
    { label: "Balance", value: formatKes(doc.balanceKes), emphasis: doc.balanceKes > 0 },
  ]
  return (
    <section aria-labelledby="payments-heading" className="rounded-xl border bg-card p-4">
      <h2 id="payments-heading" className="mb-3 text-sm font-medium">
        Payments
      </h2>
      <dl className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{s.label}</dt>
            <dd className={s.emphasis ? "font-semibold tabular-nums text-destructive" : "font-semibold tabular-nums"}>{s.value}</dd>
          </div>
        ))}
      </dl>
      {doc.payments.length === 0 ? (
        <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y border-t">
          {doc.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="flex min-w-0 flex-col">
                <span>
                  {formatDay(p.paidOn)} · {BILLING_PAYMENT_METHOD_LABELS[p.method]}
                </span>
                {p.reference || p.note ? (
                  <span className="truncate text-xs text-muted-foreground">{[p.reference, p.note].filter(Boolean).join(" · ")}</span>
                ) : null}
              </div>
              <span className="font-medium tabular-nums">{formatKes(p.amountKes)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
