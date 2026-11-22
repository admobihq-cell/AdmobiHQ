// Run: npx tsx --test apps/ops/components/billing/preview-input.test.ts
import assert from "node:assert/strict"
import { test } from "node:test"

import { billingDocumentInputSchema } from "@workspace/ops-contracts"

import { previewable } from "./preview-input"

test("a blank or half-filled form still yields a renderable document", () => {
  for (const raw of [
    {},
    { kind: "quote", customer: { name: "", email: "nope" }, lines: [], dueDate: "2026-01-01", issueDate: "2026-02-01" },
    { lines: [{ description: "", quantity: null, unitPriceKes: null }], discountPct: 250, taxPct: null, feeKes: -5 },
  ]) {
    assert.ok(billingDocumentInputSchema.safeParse(previewable(raw)).success, JSON.stringify(raw))
  }
})

test("filled values pass through untouched", () => {
  const doc = previewable({ customer: { name: "Acme" }, lines: [{ description: "Wrap", quantity: 2, unitPriceKes: 500 }] }) as {
    customer: { name: string }
    lines: { quantity: number; unitPriceKes: number }[]
  }
  assert.equal(doc.customer.name, "Acme")
  assert.deepEqual([doc.lines[0]!.quantity, doc.lines[0]!.unitPriceKes], [2, 500])
})
