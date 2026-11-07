"use client"

import Link from "next/link"
import {
  SPEND_CATEGORY_LABELS,
  formatKes,
  type TransactionDto,
} from "@workspace/ops-contracts"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { KIND_LABELS, formatDate, signedKes } from "@/components/billing/format"

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

/** Full detail for one ledger row. */
export function TransactionSheet({
  transaction,
  onClose,
}: {
  transaction: TransactionDto | null
  onClose: () => void
}) {
  return (
    <Sheet open={transaction !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        {transaction ? (
          <>
            <SheetHeader>
              <SheetTitle>{KIND_LABELS[transaction.kind]}</SheetTitle>
              <SheetDescription>{formatDate(transaction.occurredAt)}</SheetDescription>
            </SheetHeader>
            <dl className="px-4">
              <Row label="Amount">
                <span className="tabular-nums">{signedKes(transaction.amountKes, formatKes)}</span>
              </Row>
              <Row label="Balance after">
                <span className="tabular-nums">{formatKes(transaction.balanceAfterKes)}</span>
              </Row>
              <Row label="Description">{transaction.description}</Row>
              <Row label="Reference">{transaction.reference ?? "None"}</Row>
              <Row label="Campaign">
                {transaction.campaignId && transaction.campaignName ? (
                  <Link href={`/campaigns/${transaction.campaignId}`} className="hover:underline">
                    {transaction.campaignName}
                  </Link>
                ) : (
                  "Not linked to a campaign"
                )}
              </Row>
              <Row label="Category">
                {transaction.spendCategory ? SPEND_CATEGORY_LABELS[transaction.spendCategory] : "None"}
              </Row>
            </dl>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
