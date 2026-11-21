# Billing documents (quotes and invoices): design

Date: 2026-11-21 · Status: approved approach, awaiting doc sign-off

## Intent

Ops needs to write quotations and invoices by hand for work billed **outside the
Paystack wallet**: bank transfers, M-Pesa paybill, cheques. These include a
campaign quote sent before an advertiser signs up, or an invoice for production
work. Advertisers download those documents as PDFs from their Billing page.
When money arrives, ops records the payment against the specific invoice, and
the invoice shows as paid.

The look and editing flow follow SwiftQuote (https://gettlink.github.io/swiftquote/),
which the user supplied as screenshots plus a sample PDF (`SQ-1001-COPY`). The
layout is a form on the left and a live A4 preview on the right. The PDF has a
clean black-and-white layout, letter-spaced uppercase section labels, a black
total bar, and right-aligned money columns.

## Goals

- Ops can create a **quote** or an **invoice** from scratch: line items,
  discount, tax, extra fee, note, payment instructions and terms.
- The customer is picked from the database (an `AdvertiserOrg`), with free text
  as a fallback for prospects who aren't customers yet. The campaign is
  optional and picked from that org's campaigns.
- The **number is auto-generated and read-only**.
- Admobi's logo and company details come from existing assets and one
  constants module. Nobody retypes them.
- A live preview that **is** the PDF advertisers download.
- Unpaid invoices carry a **red "UNPAID" pill** on the PDF. Part-paid, paid
  and void invoices carry their own pill.
- Ops records manual payments against an invoice. Status is derived from those
  payments. A payment **does not** touch the wallet (user decision, 2026-11-21).
- A quote can be converted to an invoice.
- Advertisers see their org's issued documents in customer-web Billing and
  download the PDF.

## Non-goals (v1)

- Emailing documents. "Mark sent" only changes visibility and does not send mail.
- KRA eTIMS tax invoices. The existing `tax_invoice_ref` idea stays future work.
- Multi-currency. Everything is KES, like the rest of the system.
- SwiftQuote's Modern/Classic and A4/Letter toggles. We use one house style on A4.
- JSON backup/export. The documents live in our database.
- A settings page for editing Admobi's company details. They live in code
  until someone needs to change them often.
- Customer-mobile Billing. Web only in v1.
- Online payment of a manual invoice through Paystack.

## Anti-goals

- A manual invoice payment must never create a wallet transaction or move
  finance revenue totals. If it did, a bank payment would be counted twice
  whenever ops also records a top-up.
- Numbers never repeat and never get reused. Gaps from abandoned work matter
  to a tax auditor.
- An advertiser must never see a draft, another org's document, or a
  free-text-customer document.
- The preview and the downloaded PDF must never differ.

## Constraints from the codebase

- PDFs render server-side with **Takumi** (`apps/api/lib/pdf/render-pdf.tsx`)
  using `tw` classes and no headless browser. Free text must pass through
  `latin1()` (`apps/api/lib/pdf/latin1.ts`), because the bundled font is
  Latin-1 only.
- `renderPdf` hardcodes the footer "confidential, internal use only". It needs
  a `footer` option. Customer documents use "Admobi Media · admobihq.com ·
  Page x of y".
- Images must be bundled as base64. Reading `public/` at runtime 404s on
  Vercel (see the `logo-mark.ts` comment). The wordmark exists only at
  `apps/web/public/brand/logo-typemark.png`. Bundle it the same way and pass it
  through `images`.
- The existing `Invoice` table holds Paystack auto-receipts, numbered
  `INV-YYYY-NNNNNN` (`settle-payment.ts:invoiceNumber`). Manual documents use
  a different format so the two can't be confused in one list.
- `/v1/ops/documents` is already taken (`export`). The new routes live under
  `/v1/ops/billing-documents`.
- Ops write access is the `finances` permission. Customer read access is
  `billing:read`.
- The ledger convention is append-only with an audit event
  (`auditFromOpsUser`). Payments follow it.

## Approaches considered

**Storage**
1. Extend the `Invoice` table. Rejected. It is an immutable Paystack snapshot
   with no concept of a quote, a draft, a free-text customer or part-payment,
   and bending it would couple hand-written invoices to settlement code.
2. **New `BillingDocument` and `BillingDocumentPayment` tables (chosen).**
   This is a clean lifecycle. The cost is that customer Billing merges two
   sources in its list.

**Preview**
1. A live HTML copy of the layout. Rejected. It would mean two templates that
   drift apart.
2. **The preview is the PDF itself (chosen).** The editor POSTs its state and
   shows the returned PDF in an `<iframe>`, debounced about 600 ms after
   typing stops. There is one template, and the preview matches the download
   exactly.

## Design

### Data model (Prisma, `apps/web/prisma/schema.prisma`)

```prisma
/// A hand-written quote or invoice, billed outside the Paystack wallet.
model BillingDocument {
  id              Int       @id @default(autoincrement())
  kind            String    // quote | invoice
  number          String    @unique          // QT/2026/0001, INV/2026/0001
  status          String    @default("draft") // draft | sent | accepted | declined | void
  org_id          Int?
  org             AdvertiserOrg? @relation(fields: [org_id], references: [id], onDelete: SetNull)
  campaign_id     Int?
  campaign        Campaign? @relation(fields: [campaign_id], references: [id], onDelete: SetNull)
  /// Snapshot of who it's addressed to, frozen when the doc is sent.
  customer        Json      // { name, contact, email, phone, address, taxPin, reference }
  issue_date      DateTime  @db.Date
  due_date        DateTime  @db.Date        // expiry date for a quote
  reference       String?                   // PO / reference
  lines           Json      // [{ description, unit, quantity, unitPriceKes, taxable }]
  discount_pct    Decimal   @default(0) @db.Decimal(5, 2)
  tax_pct         Decimal   @default(0) @db.Decimal(5, 2)
  fee_label       String?
  fee_kes         Decimal   @default(0) @db.Decimal(12, 2)
  subtotal_kes    Decimal   @db.Decimal(12, 2)
  discount_kes    Decimal   @db.Decimal(12, 2)
  tax_kes         Decimal   @db.Decimal(12, 2)
  total_kes       Decimal   @db.Decimal(12, 2)
  note            String?
  payment_instructions String?
  terms           String?
  /// Set on the invoice created by converting this quote, pointing back to it.
  source_quote_id Int?      @unique
  sent_at         DateTime?
  voided_at       DateTime?
  created_by      String    // Clerk user id
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt

  payments BillingDocumentPayment[]

  @@index([org_id, issue_date])
  @@index([kind, status])
  @@map("billing_documents")
}

/// Money received against a manual invoice. Append-only; never touches the wallet.
model BillingDocumentPayment {
  id          Int      @id @default(autoincrement())
  document_id Int
  document    BillingDocument @relation(fields: [document_id], references: [id])
  amount_kes  Decimal  @db.Decimal(12, 2)
  method      String   // bank | mpesa | cheque | cash | other
  reference   String?
  paid_on     DateTime @db.Date
  note        String?
  created_by  String
  created_at  DateTime @default(now())

  @@index([document_id])
  @@map("billing_document_payments")
}

/// Yearly counters so numbers are gapless per kind.
model BillingDocumentCounter {
  kind String
  year Int
  last Int @default(0)
  @@id([kind, year])
  @@map("billing_document_counters")
}
```

Back-relations go on `AdvertiserOrg` and `Campaign`.

### Numbering

- The number is assigned on **first save**. The counter row is upserted and
  incremented inside the same transaction as the insert, using
  `UPDATE … SET last = last + 1 RETURNING last`. It is formatted as
  `QT/2026/0001` or `INV/2026/0001`, where the year is the Nairobi year of the
  issue date.
- A converted quote gets its own new `INV/…` number.
- A numbered document is **never hard-deleted**. Ops voids it instead. An
  unsaved draft has no number, and the preview shows "DRAFT" in its place.

### Totals (server-side only, one pure function plus a test)

```
lineAmount = round2(quantity × unitPriceKes)
subtotal   = Σ lineAmount
discount   = round2(subtotal × discount_pct / 100)
taxableNet = Σ taxable lineAmount × (1 − discount_pct/100)
tax        = round2(taxableNet × tax_pct / 100)
total      = subtotal − discount + tax + fee_kes
```

The server ignores any totals the client sends. The same function computes
the preview, so the preview always matches the saved figures. It lives in
`packages/ops-contracts` so the ops form can show running totals without
duplicating the maths.

### Status

- **Stored status:** `draft`, then `sent`. A quote can then become `accepted`
  or `declined`. Any non-draft document can become `void`, which also sets
  `voided_at`.
- **Payment state (invoice only, derived, never stored):**
  - `paid_kes` is the sum of the invoice's payments.
  - `paid` when `paid_kes ≥ total`.
  - `part_paid` when `paid_kes > 0`.
  - `overdue` when it is past the due date and not paid.
  - `unpaid` otherwise.
- **Edit lock:** a document is editable while it is `draft`. Once sent, its
  content is locked and only status and payment actions remain. To correct a
  sent document, ops voids it and creates a new one.
- **Customer snapshot:** at "mark sent", the customer snapshot is refreshed
  from the org: name, `billing_email` and `tax_pin`.

### Payment guards

Recording a payment is rejected when:
- the document is a quote;
- the document is a draft or void;
- the amount is ≤ 0;
- the payment would push `paid_kes` above `total` by more than KES 0.

Every payment write calls `auditFromOpsUser`. There is no edit or delete. A
mistake is fixed by voiding the invoice and re-issuing it, which matches the
ledger's append-only rule.

### PDF template (`apps/api/lib/pdf/templates/billing-document-pdf.tsx`)

The layout follows the SwiftQuote sample:

```
[mark + wordmark]                                    QUOTATION / INVOICE
Admobi Media                                              INV/2026/0007
Nairobi · billing@… · +254… · admobihq.com · KRA PIN    [ UNPAID ] pill
───────────────────────────────────────────────────────────────────────
PREPARED FOR / BILL TO           Issue date            2026-11-21
Org name (bold)                  Due date / Expiry     2026-12-05
Contact · address · email        Reference             PO-123
KRA PIN P05…                     Campaign              Westlands Q1
DESCRIPTION                       QTY        RATE        AMOUNT
──────────────────────────────────────────────────────────────
Line description (bold)             4    Ksh 125.00    Ksh 500.00
unit (muted)
──────────────────────────────────────────────────────────────
NOTE                                  Subtotal         Ksh 2,900.00
…                                     Discount (5%)     −Ksh 145.00
PAYMENT INSTRUCTIONS                  VAT (16%)          Ksh 440.80
…                                     ███ Total ███  Ksh 3,195.80 ███
                                      Paid               Ksh 1,000.00
                                      Balance due        Ksh 2,195.80
───────────────────────────────────────────────────────────────────────
TERMS AND CONDITIONS
…
                Admobi Media · admobihq.com · Page 1 of 1
```

- **Palette:** black and grey type, matching SwiftQuote. The brand colour
  appears only in the logo, because black prints well and reads as a formal
  document. Uppercase labels use tracking of about 0.12em at 8–9 pt, with tabular
  figures and right alignment for money.
- **Pills:**
  - **UNPAID** is red (`#b91c1c` on `#fee2e2`).
  - **OVERDUE** is the same red with the label "OVERDUE".
  - **PART-PAID** is amber.
  - **PAID** is green.
  - **VOID** is grey, and a void document also gets a faint diagonal "VOID"
    watermark if Takumi supports rotation. Otherwise it gets the pill only.
  - Quotes show no payment pill. A draft shows a grey **DRAFT** pill.
- **Paid and balance rows:** shown only on an invoice with at least one payment.
- Rows with zero values (discount, tax, fee) are omitted.
- Long line lists flow onto later pages. The footer repeats on each page.

The company block lives in `apps/api/lib/billing/company.ts`. It is one
constant with name, contact person, city, email, phone, website, KRA PIN, and
default payment instructions, note and terms. These defaults also prefill new
documents in the editor, served through the options endpoint.

### API (`apps/api`)

**Ops endpoints**, all requiring `finances`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/ops/billing-documents?kind=&status=&orgId=` | List view |
| GET | `/v1/ops/billing-documents/options` | Orgs with billing email, tax PIN and address fields; each org's campaigns; company defaults |
| POST | `/v1/ops/billing-documents` | Create; assigns the number |
| GET / PATCH | `/v1/ops/billing-documents/[id]` | Read; edit while draft |
| POST | `/v1/ops/billing-documents/[id]/status` | `{ action: send \| accept \| decline \| void }` |
| POST | `/v1/ops/billing-documents/[id]/convert` | Quote to new draft invoice; copies content; sets `source_quote_id` |
| POST | `/v1/ops/billing-documents/[id]/payments` | Record a payment |
| POST | `/v1/ops/billing-documents/preview` | Unsaved editor state to PDF bytes, inline. No DB write |
| GET | `/v1/ops/billing-documents/[id]/pdf` | Saved document as a PDF |

**Customer endpoints**, all requiring `billing:read`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/customer/finance/documents` | The org's non-draft documents |
| GET | `/v1/customer/finance/documents/[id]/pdf` | Download. Another org's document, a draft, or a free-text-customer document returns 404 |

- Zod schemas and DTOs go in `packages/ops-contracts/src/billing-document.ts`.
- When a campaign is chosen, the server checks it belongs to the chosen org,
  reusing the pattern in `transactions/route.ts`.
- The preview endpoint is rate-light: the client debounces and cancels
  in-flight requests with `AbortController`.

### Ops UI (`apps/ops`)

**List view:** a new Finances tab, "Invoices & quotes".
- The table shows number, kind, customer, campaign, issue date, due date,
  total, paid amount, and a status pill.
- Filters cover kind and status.
- A **New** button opens the editor. Clicking a row opens it too.

**Editor:** at `/finances/documents/new` and `/finances/documents/[id]`.
- The layout is two columns on desktop and stacked on mobile: a form on the
  left (scrolling, max about 560 px) and a sticky A4 preview on the right in an
  `<iframe>` on a soft grey canvas with a paper shadow, like SwiftQuote.
- **Top bar:** title, number chip (read-only; "Draft" before first save),
  status pill, and the actions Save, Download PDF, Mark sent, Convert to
  invoice, Record payment and Void, each shown only when valid.
- **Form sections**, in this order:
  1. **Document**
     - Quote/Invoice segmented toggle, available until the first save.
     - Issue date, plus due date or expiry date, using `<input type="date">`.
     - Reference.
  2. **Customer**
     - An org combobox from the options endpoint. Picking an org prefills the
       contact, email and KRA PIN, and leaves them editable.
     - A "Not a customer yet" toggle that switches to free text.
     - An optional campaign select filtered to that org.
  3. **Line items**
     - Each item is a card with description, quantity, unit, unit price and a
       taxable checkbox.
     - Move up, move down, duplicate and delete icon buttons, each with an
       aria-label.
     - The line total sits at the bottom right of the card.
     - An "Add line item" button.
  4. **Adjustments and totals:** discount %, tax %, fee label and fee amount,
     and a dark summary card with running totals.
  5. **Notes and terms:** note, payment instructions and terms, prefilled from
     the company defaults.
- **Payments panel**, shown on sent invoices: a list of recorded payments with
  the balance, and a "Record payment" dialog with amount (defaulting to the
  balance), method, reference, paid-on date and note.
- **Components:** existing `@workspace/ui` components (Button, Input, Select,
  Dialog, Textarea, Label, StatusPill), `react-hook-form` if the ops app
  already uses it (otherwise controlled state), and toasts through `sonner`.
- **Unsaved changes:** a `beforeunload` guard.
- **Polish:** visible focus rings, 44 px touch targets on mobile, and labels
  tied to their inputs.

### Customer UI (`apps/customer-web`)

- The Billing invoices tab merges Paystack receipts and manual documents into
  one list. Each row carries `source: "receipt" | "document"`.
- Manual rows show the kind (Quote or Invoice) and a status pill. Unpaid and
  overdue pills are red, part-paid is amber, paid is green, and void is grey.
- Download uses the new PDF route. The existing `useDownloadPdf` works as is.
- The `INVOICE_STATUS` map gains `unpaid` and `part_paid`, plus `sent`,
  `accepted` and `declined` for quotes.

### Docs (same change)

- `docs/ops/OPS-ADMIN.md` gets a section on Invoices & quotes: creating,
  numbering, sending, converting, recording payments, and voiding.
- `docs/customer/APP.md` gets a section on Billing documents.
- `docs/api/API.md` gets the new routes.

## Builder check (done inline; resolved)

| Question | Resolution |
|---|---|
| Can a draft be deleted? | Unsaved drafts never hit the database. Saved drafts have a number, so they are voided, not deleted. *My call.* |
| Overpayment? | Rejected. Ops records the exact amount. Refunds of manual payments are out of scope. *My call.* |
| What does the advertiser see for a quote? | Sent, accepted and declined quotes are listed with a PDF download. There is no accept button for advertisers in v1. *My call.* |
| Does the address come from the database? | `AdvertiserOrg` has no address field, so it is typed in the editor and saved in the snapshot. *My call.* |
| Admobi KRA PIN, bank and paybill numbers? | Placeholders in `company.ts`, flagged for the user to fill in before launch. |
| Takumi capability risk | Plan task 1 is a spike rendering the static sample (letter-spaced labels, black total bar, pill, right-aligned columns). If Takumi falls short, revisit before building further. |
| Prod migration | Additive tables only. Run by hand on prod before merge. Confirm the staging `DATABASE_URL` host first (staging once pointed at prod). |

## Left to the builder

Exact component split, query hooks, the debounce value, and test placement,
following existing patterns in `apps/ops/components/finances/*` and
`apps/api/app/v1/ops/finance/*`.
