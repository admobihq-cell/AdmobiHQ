import { describe, expect, it } from "vitest"

import { renderAnnouncementTemplate } from "@/lib/push/announcement-template"

describe("renderAnnouncementTemplate", () => {
  it("substitutes first_name and org_name", () => {
    expect(
      renderAnnouncementTemplate("Dear {{first_name}} from {{org_name}}", {
        firstName: "Jordan",
        orgName: "Acme Ads",
      }),
    ).toBe("Dear Jordan from Acme Ads")
  })

  it("strips missing tags and cleans punctuation", () => {
    expect(renderAnnouncementTemplate("Hi {{first_name}}, welcome")).toBe("Hi, welcome")
    expect(
      renderAnnouncementTemplate("Dear {{first_name}} from {{org_name}}, hi", {
        firstName: "Jordan",
      }),
    ).toBe("Dear Jordan from, hi")
  })

  it("allows whitespace inside tags", () => {
    expect(
      renderAnnouncementTemplate("{{ first_name }} @ {{ org_name }}", {
        firstName: "A",
        orgName: "B",
      }),
    ).toBe("A @ B")
  })
})
