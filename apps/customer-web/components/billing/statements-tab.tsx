"use client"

import { LedgerSkeletonShell } from "@/components/skeletons/dashboard-skeletons"
import { FileDown } from "lucide-react"
import { exportFileName, formatKes, type StatementRowDto } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Button } from "@workspace/ui/components/button"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { NO_LEDGER_MESSAGE, monthLabel } from "@/components/billing/billing-overview-tab"
import { useStatements } from "@/lib/use-analytics"
import { useDownloadPdf } from "@/lib/use-campaigns"

export function StatementsTab() {
  const query = useStatements()
  const download = useDownloadPdf()
  // The API answers oldest first so openings chain downwards; people read newest first.
  const rows = [...(query.data ?? [])].reverse()

  const columns: LedgerColumn<StatementRowDto>[] = [
    { key: "month", header: "Month", render: (r) => <span className="font-medium">{monthLabel(r.month)}</span> },
    { key: "opening", header: "Opening", align: "right", render: (r) => formatKes(r.opening) },
    { key: "topups", header: "Top-ups", align: "right", render: (r) => formatKes(r.topUpsKes) },
    { key: "spend", header: "Spend", align: "right", render: (r) => formatKes(r.spendKes) },
    { key: "refunds", header: "Refunds", align: "right", render: (r) => formatKes(r.refundsKes) },
    { key: "closing", header: "Closing", align: "right", render: (r) => <span className="font-medium">{formatKes(r.closing)}</span> },
    {
      key: "pdf",
      header: <span className="sr-only">PDF</span>,
      render: (r) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Download the ${monthLabel(r.month)} statement as PDF`}
          onClick={() =>
            download.mutate({
              path: `/v1/customer/finance/statements/${r.month}/pdf`,
              filename: exportFileName("wallet statement", r.month, "pdf"),
            })
          }
        >
          <FileDown />
        </Button>
      ),
    },
  ]

  if (query.isError) {
    return (
      <ApiErrorBanner
        message={query.error instanceof Error ? query.error.message : "Could not load statements."}
        onRetry={() => void query.refetch()}
      />
    )
  }

  if (query.isPending) return <LedgerSkeletonShell label="Loading statements" columns={4} />

  return (
    <LedgerCard
      title="Statements"
      description="One statement per month. Each closing balance is the next month's opening"
      toolbar={
        <Button
          variant="outline"
          size="sm"
          loading={download.isPending}
          onClick={() =>
            download.mutate({
              path: "/v1/customer/campaigns/statement",
              filename: exportFileName("campaign budget statement", null, "pdf"),
            })
          }
        >
          <FileDown aria-hidden />
          Budget statement
        </Button>
      }
      columns={columns}
      rows={rows}
      rowKey={(r) => r.month}
      footer={{ viewing: `Viewing ${rows.length} out of ${rows.length}`, page: 1, pageCount: 1, onPageChange: () => {} }}
      empty={query.isPending ? "Loading statements." : NO_LEDGER_MESSAGE}
    />
  )
}
