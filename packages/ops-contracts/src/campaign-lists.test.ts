import { describe, expect, it } from "vitest"

import { campaignCreateSchema } from "./schemas"
import { describeCampaignObjectives, joinCampaignList, splitCampaignList } from "./enums"

describe("campaign lists (markets / objectives)", () => {
  it("round-trips, trims and drops blanks", () => {
    expect(joinCampaignList(["CBD", "Mombasa Rd"])).toBe("CBD, Mombasa Rd")
    expect(splitCampaignList("CBD, Mombasa Rd")).toEqual(["CBD", "Mombasa Rd"])
    expect(splitCampaignList(" a ,, b ")).toEqual(["a", "b"])
    expect(splitCampaignList(null)).toEqual([])
  })

  it("labels objectives and shows a dash when none", () => {
    expect(describeCampaignObjectives("promo, launch")).toBe("Promotion, Launch")
    expect(describeCampaignObjectives(null)).toBe("—")
    expect(describeCampaignObjectives("mystery")).toBe("mystery")
  })

  it("the campaign schema takes one or many known objectives, nothing else", () => {
    const ok = (objective: string) => campaignCreateSchema.safeParse({ name: "x", objective }).success
    expect(ok("awareness")).toBe(true)
    expect(ok("awareness, promo")).toBe(true)
    expect(ok("awareness, hype")).toBe(false)
    expect(ok(" , ")).toBe(false)
  })
})
