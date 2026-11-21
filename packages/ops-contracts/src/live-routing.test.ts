import { describe, expect, it } from "vitest"

import { customerKeysForEvent, customerToastTone } from "./live-routing"

describe("customerKeysForEvent", () => {
  it("refreshes campaigns for campaign notifications", () => {
    const keys = customerKeysForEvent({ topic: "notification", type: "campaign_approved" })
    expect(keys).toContainEqual(["customer-notifications"])
    expect(keys).toContainEqual(["customer-campaigns"])
    expect(keys).toContainEqual(["customer-campaign"])
  })

  it("refreshes money views for payment and billing notifications", () => {
    for (const type of ["payment_received", "refund_completed", "billing_document_sent", "top_up_manual"]) {
      expect(customerKeysForEvent({ topic: "notification", type })).toContainEqual(["customer-analytics"])
    }
  })

  it("refreshes only the inbox for other notifications", () => {
    expect(customerKeysForEvent({ topic: "notification", type: "invite_declined" })).toEqual([["customer-notifications"]])
  })

  it("maps org topics to their screens", () => {
    expect(customerKeysForEvent({ topic: "payment" })).toEqual([["customer-analytics"], ["customer-payment"]])
    expect(customerKeysForEvent({ topic: "billing-document", id: 3 })).toEqual([
      ["customer-analytics", "billing-documents"],
      ["customer-analytics", "invoices"],
    ])
    expect(customerKeysForEvent({ topic: "campaign", id: 7 })).toEqual([["customer-campaigns"], ["customer-campaign", 7]])
  })

  it("ignores ops-only topics", () => {
    expect(customerKeysForEvent({ topic: "sos", id: 1 })).toEqual([])
  })
})

describe("customerToastTone", () => {
  it("picks tone and sound from the notification type", () => {
    expect(customerToastTone("campaign_approved")).toEqual({ tone: "success", sound: "ping" })
    expect(customerToastTone("payment_received")).toEqual({ tone: "success", sound: "ping" })
    expect(customerToastTone("campaign_rejected")).toEqual({ tone: "warning", sound: "low" })
    expect(customerToastTone("campaign_changes_requested")).toEqual({ tone: "warning", sound: "low" })
    expect(customerToastTone("payment_failed")).toEqual({ tone: "warning", sound: "low" })
    expect(customerToastTone("billing_document_sent")).toEqual({ tone: "info", sound: "chime" })
  })
})
