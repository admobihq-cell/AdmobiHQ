import { NextResponse } from "next/server"

import { exportFileName, formatKes } from "@workspace/ops-contracts"

import { getInvoice } from "@/lib/analytics/finance-queries"
import { jsonError, parseId, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { latin1 } from "@/lib/pdf/latin1"
import { renderPdf } from "@/lib/pdf/render-pdf"
import { CampaignStatementPdf } from "@/lib/pdf/templates/campaign-statement-pdf"

type Params = { params: Promise<{ id: string }> }

/** One invoice as a PDF. Another org's invoice id answers 404. Needs `billing:read`. */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireCustomerPermissionAccess("billing:read")
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const invoice = await getInvoice(auth.access.orgId, id)
  if (!invoice) return jsonError("Not found", 404)

  try {
    const bytes = await renderPdf(
      <CampaignStatementPdf
        title={`Invoice ${latin1(invoice.number)}`}
        subtitle={invoice.campaignName ? latin1(invoice.campaignName) : "Admobi advertising services"}
        summary={[
          { label: "Issued", value: invoice.issuedOn },
          { label: "Due", value: invoice.dueOn },
          { label: "Status", value: invoice.status },
          { label: "Period", value: `${invoice.periodStart} to ${invoice.periodEnd}` },
          { label: "Subtotal", value: formatKes(invoice.subtotalKes) },
          { label: "Tax", value: formatKes(invoice.taxKes) },
        ]}
        headers={["Description", "Amount"]}
        rows={invoice.lines.map((l) => [latin1(l.description), formatKes(l.amountKes)])}
        totalsRow={["Total", formatKes(invoice.totalKes)]}
        footnote="This document is a statement of charges, not a tax invoice."
      />,
      {
        metadata: {
          title: `Admobi - Invoice ${invoice.number}`,
          authors: ["Admobi"],
          creationDate: new Date().toISOString().slice(0, 10),
        },
      }
    )
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${exportFileName("invoice", invoice.number, "pdf")}"`,
      },
    })
  } catch (error: unknown) {
    console.error("[customer /v1/customer/finance/invoices/[id]/pdf GET]", error)
    return jsonError("PDF generation failed", 500)
  }
}
