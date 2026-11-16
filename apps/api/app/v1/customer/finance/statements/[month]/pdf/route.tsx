import { NextResponse } from "next/server"

import { exportFileName, formatKes } from "@workspace/ops-contracts"

import { listStatements, listTransactions, monthBounds } from "@/lib/analytics/finance-queries"
import { jsonError, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { latin1 } from "@/lib/pdf/latin1"
import { renderPdf } from "@/lib/pdf/render-pdf"
import { CampaignStatementPdf } from "@/lib/pdf/templates/campaign-statement-pdf"

type Params = { params: Promise<{ month: string }> }

/** One month of the wallet ledger as a PDF. A month with no rows answers 404. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("billing:read")
  if (auth.error) return auth.error

  const { month } = await params
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return jsonError("month must be YYYY-MM", 400)

  const { orgId } = auth.access
  const statement = (await listStatements(orgId)).find((s) => s.month === month)
  if (!statement) return jsonError("Not found", 404)

  const { items } = await listTransactions(orgId, { range: monthBounds(month), sort: "date_asc" }, { all: true })

  try {
    const bytes = await renderPdf(
      <CampaignStatementPdf
        title={`Wallet statement ${month}`}
        subtitle="Admobi advertiser account"
        summary={[
          { label: "Opening balance", value: formatKes(statement.opening) },
          { label: "Top-ups", value: formatKes(statement.topUpsKes) },
          { label: "Spend", value: formatKes(statement.spendKes) },
          { label: "Refunds", value: formatKes(statement.refundsKes) },
          { label: "Adjustments", value: formatKes(statement.adjustmentsKes) },
          { label: "Closing balance", value: formatKes(statement.closing) },
        ]}
        headers={["Date", "Description", "Amount", "Balance"]}
        rows={items.map((t) => [
          t.occurredAt.slice(0, 10),
          latin1(t.campaignName ? `${t.description} (${t.campaignName})` : t.description),
          formatKes(t.amountKes),
          formatKes(t.balanceAfterKes),
        ])}
        totalsRow={["", "Closing balance", "", formatKes(statement.closing)]}
        footnote="This document is a statement of account activity, not a tax invoice."
      />,
      {
        metadata: {
          title: `Admobi - Wallet statement ${month}`,
          authors: ["Admobi"],
          creationDate: new Date().toISOString().slice(0, 10),
        },
      }
    )
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${exportFileName("wallet statement", month, "pdf")}"`,
      },
    })
  } catch (error: unknown) {
    console.error("[customer /v1/customer/finance/statements/[month]/pdf GET]", error)
    return jsonError("PDF generation failed", 500)
  }
}
