import Link from "next/link"
import { formatKes } from "@workspace/ops-contracts"

import { DashboardCard } from "@workspace/ui/components/dashboard/dashboard-card"
import type { AttentionItemDto } from "@/lib/queries/finance"

/** Money that needs a human: its own tab, so the overview layout never shifts around it. */
export function AttentionTab({ attention }: { attention: AttentionItemDto[] }) {
  return (
    <DashboardCard
      title="Needs attention"
      description="Payment mismatches, payments pending over an hour, failed refunds and failed driver payouts"
    >
      {attention.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing needs attention.</p>
      ) : (
        <ul className="divide-y">
          {attention.map((item, i) => {
            const body = (
              <>
                <div className="min-w-0">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-muted-foreground">{item.detail}</p>
                </div>
                <span className="shrink-0 tabular-nums">{formatKes(item.amountKes)}</span>
              </>
            )
            return (
              <li key={`${item.kind}-${i}`}>
                {item.kind === "payout" ? (
                  <Link
                    href="/finances?tab=payouts"
                    className="-mx-2 flex items-baseline justify-between gap-4 rounded-md px-2 py-2 text-sm hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-baseline justify-between gap-4 py-2 text-sm">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </DashboardCard>
  )
}
