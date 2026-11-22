"use client"

import { LedgerSkeletonShell } from "@/components/skeletons/dashboard-skeletons"
import { useState } from "react"
import Link from "next/link"
import { FileDown } from "lucide-react"
import {
  exportFileName,
  formatKes,
  type CustomerBillingDocumentDto,
  type InvoiceDto,
} from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Button } from "@workspace/ui/components/button"
import { LedgerCard, type LedgerColumn } from "@workspace/ui/components/dashboard/ledger-card"
import { AlertStrip } from "@workspace/ui/components/dashboard/notes"
import { StatusPill } from "@workspace/ui/components/dashboard/status-pill"
import { InvoiceSheet } from "@/components/billing/invoice-sheet"
import { INVOICE_STATUS, billingDocumentStatus, formatDate } from "@/components/billing/format"
import { useBillingDocuments, useInvoices } from "@/lib/use-analytics"
import { useDownloadPdf } from "@/lib/use-campaigns"
import { useOrg } from "@/lib/use-org"

/** Paystack receipts and the quotes/invoices ops writes by hand, in one list. */
type BillingRow =
  | { source: "receipt"; invoice: InvoiceDto }
  | { source: "document"; doc: CustomerBillingDocumentDto }

const issued = (row: BillingRow) => (row.source === "receipt" ? row.invoice.issuedOn : row.doc.issueDate)
const rowKey = (row: BillingRow) => (row.source === "receipt" ? `r${row.invoice.id}` : `d${row.doc.id}`)

export function InvoicesTab() {
  const [selected, setSelected] = useState<InvoiceDto | null>(null)
  const receiptsQuery = useInvoices()
  const documentsQuery = useBillingDocuments()
  const org = useOrg().data
  const download = useDownloadPdf()
  const invoices = receiptsQuery.data ?? []
  const documents = documentsQuery.data ?? []

  const rows: BillingRow[] = [
    ...invoices.map((invoice) => ({ source: "receipt" as const, invoice })),
    ...documents.map((doc) => ({ source: "document" as const, doc })),
  ].sort((a, b) => issued(b).localeCompare(issued(a)))

  // Money still owed: Paystack invoices by total, manual invoices by remaining balance.
  const sum = (rows: InvoiceDto[]) => rows.reduce((total, i) => total + i.totalKes, 0)
  const owed = (docs: CustomerBillingDocumentDto[]) => docs.reduce((total, d) => total + d.balanceKes, 0)
  const openReceipts = invoices.filter((i) => i.status === "issued")
  const overdueReceipts = invoices.filter((i) => i.status === "overdue")
  const openDocs = documents.filter((d) => d.paymentState === "unpaid" || d.paymentState === "part_paid")
  const overdueDocs = documents.filter((d) => d.paymentState === "overdue")
  const year = String(new Date().getFullYear())
  const paidThisYear = invoices.filter((i) => i.status === "paid" && (i.paidAt ?? i.issuedOn).startsWith(year))
  const paidDocsThisYear = documents.filter((d) => d.paymentState === "paid" && d.issueDate.startsWith(year))

  const downloadRow = (row: BillingRow) => {
    if (row.source === "receipt") {
      download.mutate({
        path: `/v1/customer/finance/invoices/${row.invoice.id}/pdf`,
        filename: exportFileName("invoice", row.invoice.number, "pdf"),
      })
    } else {
      download.mutate({
        path: `/v1/customer/finance/documents/${row.doc.id}/pdf`,
        filename: exportFileName(row.doc.kind, row.doc.number.replaceAll("/", "-"), "pdf"),
      })
    }
  }

  const columns: LedgerColumn<BillingRow>[] = [
    {
      key: "number",
      header: "Number",
      render: (row) => (
        <span className="font-medium tabular-nums">{row.source === "receipt" ? row.invoice.number : row.doc.number}</span>
      ),
    },
    {
      key: "period",
      header: "Period",
      render: (row) =>
        row.source === "receipt"
          ? `${formatDate(row.invoice.periodStart)} to ${formatDate(row.invoice.periodEnd)}`
          : `${row.doc.kind === "quote" ? "Quote" : "Issued"} ${formatDate(row.doc.issueDate)}`,
    },
    {
      key: "campaign",
      header: "Campaign",
      render: (row) => (row.source === "receipt" ? row.invoice.campaignName : row.doc.campaignName) ?? "All campaigns",
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (row) => formatKes(row.source === "receipt" ? row.invoice.totalKes : row.doc.totalKes),
    },
    {
      key: "tax",
      header: "Tax",
      align: "right",
      render: (row) => (row.source === "receipt" ? formatKes(row.invoice.taxKes) : "—"),
    },
    {
      key: "due",
      header: "Due",
      render: (row) =>
        row.source === "receipt"
          ? formatDate(row.invoice.dueOn)
          : `${row.doc.kind === "quote" ? "Expires " : ""}${formatDate(row.doc.dueDate)}`,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const pill = row.source === "receipt" ? INVOICE_STATUS[row.invoice.status] : billingDocumentStatus(row.doc)
        return <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
      },
    },
    {
      key: "pdf",
      header: <span className="sr-only">PDF</span>,
      render: (row) => {
        const number = row.source === "receipt" ? row.invoice.number : row.doc.number
        const label = row.source === "document" && row.doc.kind === "quote" ? "quote" : "invoice"
        return (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Download ${label} ${number} as PDF`}
            onClick={(event) => {
              event.stopPropagation()
              downloadRow(row)
            }}
          >
            <FileDown />
          </Button>
        )
      },
    },
  ]

  const error = receiptsQuery.error ?? documentsQuery.error
  if (error) {
    return (
      <ApiErrorBanner
        message={error instanceof Error ? error.message : "Could not load invoices."}
        onRetry={() => {
          void receiptsQuery.refetch()
          void documentsQuery.refetch()
        }}
      />
    )
  }

  if (receiptsQuery.isPending || documentsQuery.isPending) return <LedgerSkeletonShell label="Loading invoices" columns={5} />

  const missingDetails = org && (!org.billingEmail || !org.taxPin)

  return (
    <div className="grid gap-4">
      {missingDetails ? (
        <AlertStrip
          title="Add your billing details"
          body="Invoices carry your billing email and KRA PIN. Add them so they reach the right person."
          action={
            <Button size="sm" variant="outline" asChild>
              <Link href="/settings/team">Open organization settings</Link>
            </Button>
          }
        />
      ) : null}
      <LedgerCard
        title="Invoices"
        description="Receipts for wallet top-ups, plus quotes and invoices from your account manager"
        summary={[
          {
            label: "Open",
            value: formatKes(sum(openReceipts) + owed(openDocs)),
            note: `${openReceipts.length + openDocs.length} awaiting payment`,
          },
          {
            label: "Overdue",
            value: formatKes(sum(overdueReceipts) + owed(overdueDocs)),
            note: `${overdueReceipts.length + overdueDocs.length} past due`,
          },
          {
            label: "Paid this year",
            value: formatKes(sum(paidThisYear) + paidDocsThisYear.reduce((t, d) => t + d.totalKes, 0)),
            note: `${paidThisYear.length + paidDocsThisYear.length} paid`,
          },
        ]}
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        // Receipts open their detail sheet; hand-written documents download straight away.
        onRowClick={(row) => (row.source === "receipt" ? setSelected(row.invoice) : downloadRow(row))}
        empty="Invoices appear here once your account manager issues one."
      />
      <InvoiceSheet
        invoice={selected}
        billingEmail={org?.billingEmail ?? null}
        taxPin={org?.taxPin ?? null}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
