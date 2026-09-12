import { NextResponse } from "next/server"

import { exportFileName } from "@workspace/ops-contracts"

import { jsonError, requireCustomerPermissionAccess } from "@/lib/api-utils"
import { buildBudgetStatement } from "@/lib/campaign-statement"
import { listOwnedCampaigns } from "@/lib/campaign-store"
import { CampaignStatementPdf } from "@/lib/pdf/templates/campaign-statement-pdf"
import { renderPdf } from "@/lib/pdf/render-pdf"

/**
 * The advertiser's own campaign list with budgets and totals, as a PDF.
 *
 * Unlike /v1/ops/documents/export the rows are queried here rather than posted
 * in: this is a customer-facing document, and an advertiser must not be able
 * to put another account's campaigns (or their own invented numbers) on
 * Admobi letterhead. listOwnedCampaigns scopes to the caller.
 */
export async function GET() {
  const auth = await requireCustomerPermissionAccess("reports:read")
  if (auth.error) return auth.error

  const campaigns = await listOwnedCampaigns(auth.access.orgId)
  const generatedAt = new Date().toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const statement = buildBudgetStatement(campaigns, {
    accountLabel: campaigns.find((campaign) => campaign.contact_email)?.contact_email ?? "Advertiser account",
    generatedAt,
  })

  try {
    const bytes = await renderPdf(
      <CampaignStatementPdf title="Campaign budget statement" {...statement} />,
      {
        metadata: {
          title: "Admobi — Campaign budget statement",
          authors: ["Admobi"],
          creationDate: new Date().toISOString().slice(0, 10),
        },
      },
    )
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // Account-level, so there is no single campaign to name it after — but
        // it still gets a date, or every download collides in Downloads.
        "Content-Disposition": `attachment; filename="${exportFileName("campaign budget statement", null, "pdf")}"`,
      },
    })
  } catch (error: unknown) {
    console.error("[customer /v1/customer/campaigns/statement GET]", error)
    return jsonError("PDF generation failed", 500)
  }
}
