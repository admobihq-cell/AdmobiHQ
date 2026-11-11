import { describe, expect, it } from "vitest"

import {
  LEDGER_FILTERS,
  LEDGER_KIND_LABEL,
  WALLET_STATUS_VIEW,
  monthLabel,
  netMarginNote,
  parseRecordTransactionForm,
  refundFormError,
} from "./finance-ui"

const form = (over: Partial<Parameters<typeof parseRecordTransactionForm>[0]> = {}) => ({
  orgId: "1",
  kind: "top_up" as const,
  amount: "5000",
  campaignId: null,
  category: null,
  reference: "",
  reason: "Bank transfer received",
  ...over,
})

describe("refundFormError", () => {
  it("asks for each missing thing in the order the form shows them", () => {
    expect(refundFormError({ orgId: "", amount: "100", reason: "Support case 1" })).toBe("Choose an organization.")
    expect(refundFormError({ orgId: "1", amount: "", reason: "Support case 1" })).toBe("Enter an amount above zero.")
    expect(refundFormError({ orgId: "1", amount: "0", reason: "Support case 1" })).toBe("Enter an amount above zero.")
    expect(refundFormError({ orgId: "1", amount: "abc", reason: "Support case 1" })).toBe("Enter an amount above zero.")
    expect(refundFormError({ orgId: "1", amount: "-5", reason: "Support case 1" })).toBe("Enter an amount above zero.")
    expect(refundFormError({ orgId: "1", amount: "100", reason: " ab " })).toBe(
      "Say why, for the audit trail (the support case number is enough).",
    )
  })

  it("accepts a complete refund, including cents", () => {
    expect(refundFormError({ orgId: "1", amount: "100.50", reason: "Support case 123" })).toBeNull()
  })
})

describe("parseRecordTransactionForm", () => {
  it("turns a valid top-up into the API's input, leaving unset optionals out", () => {
    const result = parseRecordTransactionForm(form({ reference: "  BANK-TRF-001 " }))
    expect(result).toEqual({
      data: { orgId: 1, kind: "top_up", amountKes: 5000, reference: "BANK-TRF-001", reason: "Bank transfer received" },
    })
  })

  it("maps a chosen campaign and category", () => {
    const result = parseRecordTransactionForm(form({ kind: "spend", amount: "300", campaignId: "12", category: "screen_time" }))
    expect(result).toMatchObject({ data: { kind: "spend", campaignId: 12, spendCategory: "screen_time" } })
  })

  it("asks for an organization, then an amount, before judging anything else", () => {
    expect(parseRecordTransactionForm(form({ orgId: "" }))).toEqual({ error: "Choose an organization." })
    expect(parseRecordTransactionForm(form({ amount: "" }))).toEqual({ error: "Enter an amount." })
    expect(parseRecordTransactionForm(form({ amount: "abc" }))).toEqual({ error: "Enter an amount." })
  })

  it("repeats the API's rules in the API's words", () => {
    expect(parseRecordTransactionForm(form({ amount: "0" }))).toEqual({ error: "The amount can't be zero" })
    expect(parseRecordTransactionForm(form({ amount: "-100" }))).toEqual({
      error: "Enter a positive amount; the type sets the sign",
    })
    expect(parseRecordTransactionForm(form({ kind: "spend", amount: "100" }))).toEqual({
      error: "Choose a category for spend and refunds",
    })
    expect(parseRecordTransactionForm(form({ reason: "hi" }))).toEqual({ error: "Say why in a few words" })
  })

  it("lets an adjustment be negative, because that is how money is taken out", () => {
    expect(parseRecordTransactionForm(form({ kind: "adjustment", amount: "-250" }))).toMatchObject({
      data: { kind: "adjustment", amountKes: -250 },
    })
  })
})

describe("labels and filters", () => {
  it("names every ledger kind and offers an All filter first", () => {
    expect(LEDGER_KIND_LABEL.cash_refund).toBe("Refund to payer")
    expect(LEDGER_FILTERS[0]).toEqual({ value: "all", label: "All" })
    expect(LEDGER_FILTERS.map((f) => f.value).slice(1).sort()).toEqual(Object.keys(LEDGER_KIND_LABEL).sort())
  })

  it("words wallet statuses with a tone, never colour alone", () => {
    expect(WALLET_STATUS_VIEW.short).toEqual({ label: "Short of funds", tone: "serious" })
    expect(WALLET_STATUS_VIEW.healthy.tone).toBe("good")
    expect(WALLET_STATUS_VIEW.inactive.tone).toBe("neutral")
  })

  it("writes a month as 'Nov 26' and survives a malformed one", () => {
    expect(monthLabel("2026-11")).toBe("Nov 26")
    expect(monthLabel("2026-01")).toBe("Jan 26")
    expect(monthLabel("garbage")).toContain("garbage")
  })

  it("explains the net margin as a share of revenue, or says there is no revenue yet", () => {
    expect(netMarginNote(250, 1000)).toBe("25% of revenue")
    expect(netMarginNote(-100, 1000)).toBe("-10% of revenue")
    expect(netMarginNote(0, 0)).toBe("No revenue yet")
  })
})
