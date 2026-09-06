import { describe, expect, it } from "vitest"

import { renderTemplate } from "@/lib/email/render-template"
import { CampaignDecision } from "@/lib/email/templates/CampaignDecision"
import { CampaignSubmitted, campaignUrl } from "@/lib/email/templates/CampaignSubmitted"

/** A template that throws only fails in production, where the catch around the
 * notification block swallows it and the advertiser silently gets no email. */

describe("campaignUrl", () => {
  it("builds an absolute link to the campaign", () => {
    expect(campaignUrl(42)).toMatch(/\/campaigns\/42$/)
    expect(campaignUrl(42)).toMatch(/^https?:\/\//)
  })
})

describe("CampaignSubmitted", () => {
  it("renders with the campaign name", async () => {
    const html = await renderTemplate(CampaignSubmitted, {
      name: "Amina",
      campaignName: "Kilimani Launch Week",
    })
    expect(html).toContain("Amina")
    expect(html).toContain("Kilimani Launch Week")
    expect(html.length).toBeGreaterThan(200)
  })
})

describe("CampaignDecision", () => {
  it("shows the review reason verbatim when changes are requested", async () => {
    const reason = "Creative is 4:3 — the taxi top needs 3:1 artwork."
    const html = await renderTemplate(CampaignDecision, {
      name: "Amina",
      campaignName: "Kilimani Launch Week",
      campaignId: 42,
      decision: "changes_requested",
      reason,
    })
    expect(html).toContain("What needs to change")
    // Verbatim: paraphrasing would leave the email disagreeing with the app.
    expect(html).toContain("taxi top needs 3:1 artwork")
    expect(html).toContain("/campaigns/42")
  })

  it("labels a rejection differently from a change request", async () => {
    const html = await renderTemplate(CampaignDecision, {
      name: "Amina",
      campaignName: "C",
      campaignId: 1,
      decision: "rejected",
      reason: "Out of inventory for that window.",
    })
    expect(html).toContain("was not approved")
    expect(html).toContain("Why it wasn&#x27;t approved")
  })

  it("renders an approval with no reason at all", async () => {
    const html = await renderTemplate(CampaignDecision, {
      name: "Amina",
      campaignName: "C",
      campaignId: 1,
      decision: "approved",
      reason: null,
    })
    expect(html).toContain("approved")
    expect(html).not.toContain("Why it")
  })
})
