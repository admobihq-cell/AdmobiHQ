import { NextResponse } from "next/server"

import { exportFileName } from "@workspace/ops-contracts"

import { jsonError, parseId, requireCustomerAccess } from "@/lib/api-utils"
import { buildProofOfPlay } from "@/lib/campaign-statement"
import { getOwnedCampaign } from "@/lib/campaign-store"
import { CampaignStatementPdf } from "@/lib/pdf/templates/campaign-statement-pdf"
import { renderPdf } from "@/lib/pdf/render-pdf"

type Params = { params: Promise<{ id: string }> }

/**
 * Proof-of-play statement for one campaign, as a PDF.
 *
 * Only an approved campaign with a flight has anything to prove: a draft or a
 * campaign still in review has never run, so the route refuses rather than
 * issuing a document that says a day was delivered when nothing was booked.
 */
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const id = parseId((await params).id)
  if (!id) return jsonError("Invalid id", 400)

  const campaign = await getOwnedCampaign(auth.access.userId, id)
  if (!campaign) return jsonError("Not found", 404)
  if (campaign.status !== "approved" || !campaign.starts_on || !campaign.ends_on) {
    return jsonError("Proof of play is available once a campaign is approved and scheduled", 409)
  }

  const statement = buildProofOfPlay(campaign, {
    generatedAt: new Date().toLocaleDateString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    creativeCount: campaign.creatives.length,
  })

  try {
    const bytes = await renderPdf(
      <CampaignStatementPdf title="Proof of play" {...statement} />,
      {
        metadata: {
          title: `Admobi — Proof of play — ${campaign.name}`,
          authors: ["Admobi"],
          creationDate: new Date().toISOString().slice(0, 10),
        },
      },
    )
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        // Named for the campaign, not its id: this is evidence of delivery that
        // an advertiser files and comes back to. exportFileName slugifies, so a
        // campaign name cannot break out of the quoted filename here.
        "Content-Disposition": `attachment; filename="${exportFileName("proof of play", campaign.name, "pdf")}"`,
      },
    })
  } catch (error: unknown) {
    console.error("[customer /v1/customer/campaigns/[id]/proof-of-play GET]", error)
    return jsonError("PDF generation failed", 500)
  }
}
