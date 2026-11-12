import { describe, expect, it } from "vitest"

import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  campaignFundingLabel,
  announcementDelivery,
  hasTemplateTokens,
  insertAtSelection,
  previewAudiences,
  previewFor,
} from "./announcement-ui"

describe("insertAtSelection", () => {
  it("puts the tag at the cursor and moves the cursor after it", () => {
    expect(insertAtSelection("Hi , welcome", "{{first_name}}", { start: 3, end: 3 }, 178)).toEqual({
      value: "Hi {{first_name}}, welcome",
      cursor: 17,
    })
  })

  it("replaces a selected range", () => {
    expect(insertAtSelection("Hello there", "{{org_name}}", { start: 6, end: 11 }, 178)?.value).toBe("Hello {{org_name}}")
  })

  it("refuses an insert that would go past the field limit, as the web does", () => {
    const full = "x".repeat(ANNOUNCEMENT_TITLE_MAX)
    expect(insertAtSelection(full, "{{first_name}}", { start: 0, end: 0 }, ANNOUNCEMENT_TITLE_MAX)).toBeNull()
  })

  it("appends when there is no cursor yet", () => {
    expect(insertAtSelection("Hi ", "{{first_name}}", null, ANNOUNCEMENT_BODY_MAX)?.value).toBe("Hi {{first_name}}")
  })
})

describe("preview", () => {
  it("offers each audience the target apps include, customer first", () => {
    expect(previewAudiences(["driver-mobile", "customer-mobile"])).toEqual(["customer", "driver"])
    expect(previewAudiences(["driver-web"])).toEqual(["driver"])
    expect(previewAudiences([])).toEqual(["customer"])
  })

  it("renders with the sample values: drivers have no organisation", () => {
    expect(previewFor("customer", "Hi {{first_name}} from {{org_name}}")).toBe("Hi Jordan from Acme Ads")
    expect(previewFor("driver", "Hi {{first_name}} at {{org_name}}!")).toBe("Hi Jordan at!")
  })

  it("knows when a message is personalised", () => {
    expect(hasTemplateTokens("Hello", "{{ first_name }}")).toBe(true)
    expect(hasTemplateTokens("Hello", "world")).toBe(false)
  })
})

describe("campaignFundingLabel", () => {
  it("says Funded with the held amount, or Not funded", () => {
    expect(campaignFundingLabel("2026-11-01T10:00:00Z", "12500")).toBe("Funded · KES 12,500 held")
    expect(campaignFundingLabel(null, "12500")).toBe("Not funded")
  })

  it("does not invent an amount when the budget is missing", () => {
    expect(campaignFundingLabel("2026-11-01T10:00:00Z", null)).toBe("Funded · KES 0 held")
  })
})

describe("announcementDelivery", () => {
  it("splits reached, unreachable and awaiting-receipt, as the web detail does", () => {
    expect(announcementDelivery({ target_count: 10, delivered_count: 6, invalid_count: 1 })).toEqual({
      target: 10, delivered: 6, invalid: 1, unconfirmed: 3, deliveredPct: 60, invalidPct: 10,
    })
  })

  it("never lets the parts exceed the target when the counts disagree", () => {
    const d = announcementDelivery({ target_count: 4, delivered_count: 9, invalid_count: 5 })
    expect(d.delivered).toBe(4)
    expect(d.invalid).toBe(0)
    expect(d.unconfirmed).toBe(0)
  })

  it("has no percentages for an empty audience instead of dividing by zero", () => {
    expect(announcementDelivery({ target_count: 0, delivered_count: 0, invalid_count: 0 })).toMatchObject({ target: 0, deliveredPct: 0, invalidPct: 0 })
  })
})
