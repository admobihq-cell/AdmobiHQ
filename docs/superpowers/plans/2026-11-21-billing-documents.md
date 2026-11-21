# Billing Documents (Quotes & Invoices) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ops creates quotes and invoices from scratch in a SwiftQuote-style editor with a live PDF preview and records manual payments against invoices. Advertisers download their org's documents as PDFs from Billing.

**Architecture:**
- Two new tables, `billing_documents` and `billing_document_payments`, plus a yearly counter table. They are separate from the Paystack `invoices` table.
- Pure logic lives in `@workspace/ops-contracts`: totals, payment state, numbering format and zod schemas.
- `apps/api` owns the routes and one Takumi PDF template, which serves both the preview and the download.
- `apps/ops` gets a Finances list tab and a two-column editor page that talk to the API through `@workspace/ops-api-client`.
- `apps/customer-web` merges the documents into its Billing invoices list.

**Tech Stack:** Next.js App Router, Prisma 7 + Postgres (Neon), takumi-pdf, zod, @tanstack/react-query, @workspace/ui (shadcn), vitest.

**Spec:** [docs/superpowers/specs/2026-11-21-billing-documents-design.md](../specs/2026-11-21-billing-documents-design.md)

## Global Constraints

- Money is KES only. Store it as `Decimal(12,2)` and send it over the wire as a plain `number`. Round to 2 dp with `Math.round(x * 100) / 100`.
- Number formats are `QT/YYYY/NNNN` and `INV/YYYY/NNNN`, with 4-digit zero padding and growing past 9999. The year is the Nairobi year of `issue_date`. They never collide with Paystack's `INV-YYYY-NNNNNN`.
- Numbers are assigned on first save, are read-only and are never reused. A numbered document is never hard-deleted, only voided.
- A manual invoice payment never writes a `WalletTransaction` or a `Payment`.
- Ops routes use `requireOpsPermissionAccess("finances")`. Customer routes use `requireCustomerPermissionAccess("billing:read")` and match `org_id` to the caller's org. Drafts and documents with `org_id = null` are never visible to customers, and the route answers 404.
- Every free-text value rendered into a PDF passes through `latin1()` from `apps/api/lib/pdf/latin1.ts`.
- Use the bundled-image pattern. Never `fs.readFile` a `public/` asset at runtime.
- Every ops write calls `auditFromOpsUser(access, {...})`.
- Payments are append-only and have no edit or delete route.
- Edits are allowed only while `status = "draft"`. Any other status returns 409 on PATCH.
- File names use `exportFileName(kind, number.replaceAll("/", "-"), "pdf")`.
- The PDF footer for these documents is `Admobi Media · admobihq.com`, plus `Page x of y`.
- The PDF palette is black and gray type. Brand colour appears only in the logo.
- Pill colours: red `#b91c1c` on `#fee2e2` for UNPAID and OVERDUE, amber `#b45309` on `#fef3c7` for PART-PAID, green `#15803d` on `#dcfce7` for PAID, and gray `#4b5563` on `#f3f4f6` for VOID and DRAFT.
- Run vitest from an uppercase drive path: `cd "C:/Users/victo/Documents/GitHub/AdmobiHQ/apps/<app>"` (see memory: lowercase `c:` breaks vitest).
- Stage by path only. Never stage the six modified `apps/*-mobile/android/**` files, because a concurrent agent shares this worktree.
- Commit messages carry no Co-Authored-By trailer (CLAUDE.md).
- After code changes, run `graphify update .`.

## Review Focus

1. **Two ops users save new documents at the same moment.** Expected: distinct, consecutive numbers with no unique-constraint 500. Pinned in Task 3 (`concurrent creates get distinct numbers`).
2. **A payment that would overpay, or a payment on a quote, draft or void document.** Expected: 400 or 409 with a clear message, and nothing is written. Pinned in Task 5.
3. **An advertiser guesses another org's document id, or a draft's id.** Expected: 404, not 403. Pinned in Task 6.
4. **Non-Latin-1 text** (emoji, curly quotes, Swahili with diacritics outside Latin-1) in a customer name, line or notes. Expected: the PDF still renders, with stand-ins. Pinned in Task 1 (`renders non-latin1 input`).
5. **A long document with 40 line items.** Expected: it flows onto page 2 and the footer shows `Page 2 of 2`. Pinned in Task 1 (`renders a multi-page document`).

---

### Task 1: PDF template and renderPdf footer option (go/no-go spike)

This task gates everything else. If Takumi can't lay out the letter-spaced labels, the black total bar, the pill or the right-aligned columns, **stop and report** before Task 2.

**Files:**
- Modify: `apps/api/lib/pdf/render-pdf.tsx`. Add a `footer?: ReactElement` option that defaults to the current `DocumentFooter`. Export `PageNumber`/`TotalPages` usage through a new `CustomerFooter`, and register `WORDMARK_SRC` in `images`.
- Create: `apps/api/lib/pdf/logo-typemark.ts`. Base64 of `apps/web/public/brand/logo-typemark.png`, using the same header comment and regenerate command as `logo-mark.ts`. Export `WORDMARK_SRC = "admobi-logo-typemark.png"` and `WORDMARK_BYTES`.
- Create: `apps/api/lib/billing/company.ts`
- Create: `apps/api/lib/pdf/templates/billing-document-pdf.tsx`
- Test: `apps/api/lib/pdf/templates/billing-document-pdf.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // company.ts
  export const ADMOBI_COMPANY: {
    name: "Admobi Media"; contactPerson: string; city: string; email: string; phone: string;
    website: "https://admobihq.com/"; taxPin: string /* "P000000000X" placeholder — TODO(user) */;
    defaults: { note: string; paymentInstructions: string; quoteTerms: string; invoiceTerms: string }
  }
  // billing-document-pdf.tsx
  export type PdfPill = { label: "UNPAID" | "OVERDUE" | "PART-PAID" | "PAID" | "VOID" | "DRAFT"; tone: "red" | "amber" | "green" | "grey" }
  export type BillingDocumentPdfProps = {
    kind: "quote" | "invoice"; number: string | null; pill: PdfPill | null
    customer: { name: string; contact: string; email: string; phone: string; address: string; taxPin: string }
    issueDate: string; dueDate: string; reference: string; campaignName: string | null
    lines: { description: string; unit: string; quantity: number; unitPriceKes: number; amountKes: number }[]
    subtotalKes: number; discountPct: number; discountKes: number; taxPct: number; taxKes: number
    feeLabel: string; feeKes: number; totalKes: number
    paidKes: number | null; balanceKes: number | null
    note: string; paymentInstructions: string; terms: string
  }
  export function BillingDocumentPdf(props: BillingDocumentPdfProps): ReactElement
  export const BILLING_PDF_FOOTER: ReactElement   // "Admobi Media · admobihq.com" … "Page x of y"
  ```
  `renderPdf(element, { footer?, metadata? })` keeps its existing behaviour when `footer` is omitted.
- Defaults copy for `company.ts`:
  - **Note:** "Thank you for choosing Admobi."
  - **Payment instructions:** "Pay by bank transfer or M-Pesa. Quote the document number as your reference." Add a `TODO(user)` for the bank and paybill details.
  - **Quote terms:** "This quote is valid until the expiry date shown above."
  - **Invoice terms:** "Payment is due by the due date shown above."
  - **Company fields:** contact person "Victor Musembi", city "Nairobi", email "victor@admobihq.com", phone "+254703643560". These come from the user's sample PDF.

- [ ] **Step 1: Write the failing tests** in `billing-document-pdf.test.tsx`, using the shape of `campaign-statement-pdf.test.tsx`:
  - `renders the SwiftQuote sample to non-empty PDF bytes`. Use the sample values: customer "Nairoutes Limited" / "Alex Draevon". Lines `4 × 125` "Discovery and content planning" (unit "hours") and `1 × 2400` "Responsive website design" (unit "project"). Totals 2900, kind quote, number `"QT/2026/0001"`, `pill: null`. Assert `bytes.length > 1000` and that `Buffer.from(bytes).subarray(0,5).toString()` is `"%PDF-"`.
  - `renders an invoice with discount, tax, fee, paid and balance rows and an UNPAID pill`.
  - `renders a draft with number null`, with a DRAFT pill.
  - `renders non-latin1 input`. Pass the props through the same `latin1()` mapping the route will use, with name `"Café “Ndovu” 🐘 Ltd"`. Expect no throw.
  - `renders a multi-page document`. Use 40 lines, and assert the byte count is larger than the 2-line render.
- [ ] **Step 2: Run and confirm the tests fail.** Run `cd "C:/Users/victo/Documents/GitHub/AdmobiHQ/apps/api" && npx vitest run lib/pdf/templates/billing-document-pdf.test.tsx`. Expected: FAIL, module not found.
- [ ] **Step 3: Generate `logo-typemark.ts`** with the node one-liner from the `logo-mark.ts` comment, pointed at `../web/public/brand/logo-typemark.png`. Read the PNG's pixel size, and size the `<img>` in the template from that aspect ratio.
- [ ] **Step 4: Add the `footer` option to `renderPdf`** and register `WORDMARK_SRC` and `WORDMARK_BYTES` in `images`.
- [ ] **Step 5: Implement `BillingDocumentPdf`** to the layout in the spec's "PDF template" section:
  - **Header:** the logo mark stacked over the wordmark, then the company name in a large semibold, then muted company lines and the KRA PIN on the left. On the right: `QUOTATION` or `INVOICE` in about 26 pt bold, the number below it in bold (or "DRAFT" when the number is null), then the pill.
  - A 1.5 px black rule.
  - **Middle row:** "PREPARED FOR" (quote) or "BILL TO" (invoice) with the customer block on the left: name in bold, then contact, address lines, email, phone and `KRA PIN {taxPin}`, with empty lines omitted. On the right, a two-column key/value list: Issue date, Expiry date or Due date, Reference, Campaign. Rows with empty values are omitted.
  - **Lines table:** DESCRIPTION / QTY / RATE / AMOUNT, uppercase at about 8 pt with `letterSpacing: "0.12em"`. Numbers are right-aligned with tabular figures. The unit sits muted under the description. Rows are separated by hairlines.
  - **Lower block:** NOTE and PAYMENT INSTRUCTIONS on the left. On the right, the totals: Subtotal, Discount (n%), VAT (n%) and the fee row, each omitted when zero. Then the black Total bar with white bold text. Then Paid and Balance due when `paidKes !== null`.
  - A rule, then TERMS AND CONDITIONS.
  - Money is shown as `Ksh 2,900.00`, using `Intl.NumberFormat("en-KE", { minimumFractionDigits: 2 })` with a "Ksh " prefix.
  - Pass `footer={BILLING_PDF_FOOTER}` when rendering.
- [ ] **Step 6: Run the tests again.** Expected: 5 PASS.
- [ ] **Step 7: Eyeball the output.**
  - Write a throwaway script in the scratchpad that renders the sample and the UNPAID invoice to `.pdf` files, then open them.
  - Compare against the user's `quote-sq-1001-copy-nairoutes-limited.pdf`: label tracking, total bar, column alignment, pill.
  - **Go/no-go:** if something can't be achieved, stop and report to the user with the rendered PDF paths.
- [ ] **Step 8: Commit.**
  ```bash
  git add apps/api/lib/pdf/render-pdf.tsx apps/api/lib/pdf/logo-typemark.ts apps/api/lib/billing/company.ts apps/api/lib/pdf/templates/billing-document-pdf.tsx apps/api/lib/pdf/templates/billing-document-pdf.test.tsx
  git commit -m "feat(pdf): billing document template with customer footer"
  ```

### Task 2: Contracts — schemas, totals, payment state, numbering format

**Files:**
- Create: `packages/ops-contracts/src/billing-document.ts`
- Modify: `packages/ops-contracts/src/index.ts`, to add `export * from "./billing-document"`
- Test: `packages/ops-contracts/src/billing-document.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const BILLING_DOCUMENT_KINDS = ["quote", "invoice"] as const; export type BillingDocumentKind
  export const BILLING_DOCUMENT_STATUSES = ["draft", "sent", "accepted", "declined", "void"] as const; export type BillingDocumentStatus
  export const BILLING_PAYMENT_STATES = ["unpaid", "part_paid", "paid", "overdue"] as const; export type BillingPaymentState
  export const BILLING_PAYMENT_METHODS = ["bank", "mpesa", "cheque", "cash", "other"] as const; export type BillingPaymentMethod
  export const billingLineSchema        // { description: 1–300, unit: ≤30 default "", quantity: >0 ≤1_000_000, unitPriceKes: ≥0 ≤1_000_000_000, taxable: boolean default true }
  export const billingCustomerSchema    // { name: 1–200, contact, email (email | ""), phone, address ≤500, taxPin ≤20, reference ≤100 } — all but name default ""
  export const billingDocumentInputSchema // { kind, orgId: int|null, campaignId: int|null, customer, issueDate: YYYY-MM-DD, dueDate: YYYY-MM-DD (refine ≥ issueDate), reference ≤100 default "", lines: 1–100, discountPct 0–100, taxPct 0–100, feeLabel ≤60 default "", feeKes ≥0 default 0, note/paymentInstructions/terms ≤2000 default "" }
  export type BillingDocumentInput = z.infer<typeof billingDocumentInputSchema>
  export const billingStatusActionSchema // { action: "send" | "accept" | "decline" | "void" }
  export const recordBillingPaymentSchema // { amountKes: >0, method, reference ≤100 default "", paidOn: YYYY-MM-DD, note ≤500 default "" }
  export type BillingTotals = { lineAmounts: number[]; subtotalKes: number; discountKes: number; taxKes: number; feeKes: number; totalKes: number }
  export function computeBillingTotals(input: Pick<BillingDocumentInput, "lines" | "discountPct" | "taxPct" | "feeKes">): BillingTotals
  export function billingPaymentState(doc: { kind: BillingDocumentKind; status: BillingDocumentStatus; totalKes: number; paidKes: number; dueDate: string }, today: string): BillingPaymentState | null
  export function formatBillingNumber(kind: BillingDocumentKind, year: number, seq: number): string
  export type BillingPaymentDto = { id: number; amountKes: number; method: BillingPaymentMethod; reference: string; paidOn: string; note: string; createdAt: string }
  export type BillingDocumentDto = BillingDocumentInput & BillingTotals & {
    id: number; number: string; status: BillingDocumentStatus; orgName: string | null; campaignName: string | null
    paidKes: number; balanceKes: number; paymentState: BillingPaymentState | null
    sentAt: string | null; voidedAt: string | null; sourceQuoteId: number | null; convertedInvoiceId: number | null
    payments: BillingPaymentDto[]; createdAt: string; updatedAt: string
  }
  export type BillingDocumentListItemDto = Pick<BillingDocumentDto, "id" | "kind" | "number" | "status" | "orgName" | "campaignName" | "issueDate" | "dueDate" | "totalKes" | "paidKes" | "paymentState"> & { customerName: string }
  export type BillingDocumentOptionsDto = {
    orgs: { id: number; name: string; billingEmail: string | null; taxPin: string | null; campaigns: { id: number; name: string }[] }[]
    defaults: { note: string; paymentInstructions: string; quoteTerms: string; invoiceTerms: string }
  }
  export type CustomerBillingDocumentDto = Pick<BillingDocumentDto, "id" | "kind" | "number" | "status" | "campaignName" | "issueDate" | "dueDate" | "totalKes" | "paidKes" | "balanceKes" | "paymentState">
  ```
- Totals algorithm (fixed by the spec):
  ```
  lineAmount = round2(quantity × unitPriceKes); subtotal = Σ lineAmount
  discount = round2(subtotal × discountPct/100)
  taxableNet = Σ(taxable lineAmount) × (1 − discountPct/100); tax = round2(taxableNet × taxPct/100)
  total = round2(subtotal − discount + tax + feeKes)
  ```
- Payment-state precedence: `null` for a quote, a draft or a void document. Otherwise `paid` when `paidKes >= totalKes`, then `overdue` when `dueDate < today`, then `part_paid` when `paidKes > 0`, then `unpaid`.

- [ ] **Step 1: Write the failing tests.**
  - `computeBillingTotals`:
    - sample lines with 0/0/0 → subtotal 2900, total 2900;
    - discount 5, tax 16, both lines taxable → discount 145, tax 440.8, total 3195.8;
    - same, with line 2 not taxable → tax 76, total 2831;
    - add `feeKes: 1000` to the previous case → total 3831;
    - `3 × 33.333` → line amount 100.
  - `billingPaymentState`, with today `"2026-11-21"` and total 1000:
    - paid 0, due `2026-12-01` → `unpaid`;
    - due `2026-11-20` → `overdue`;
    - paid 400, due in the future → `part_paid`;
    - paid 400, past due → `overdue`;
    - paid 1000 → `paid`;
    - kind quote → `null`;
    - status draft → `null`;
    - status void → `null`.
  - `formatBillingNumber`:
    - `("invoice", 2026, 7)` → `"INV/2026/0007"`;
    - `("quote", 2026, 12345)` → `"QT/2026/12345"`.
  - `billingDocumentInputSchema`: rejects `dueDate < issueDate`, rejects an empty `lines`, and accepts the sample.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `cd "C:/Users/victo/Documents/GitHub/AdmobiHQ/packages/ops-contracts" && npx vitest run src/billing-document.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** to the interfaces above.
- [ ] **Step 4: Run the tests again.** Expected: all PASS. Also run `npx tsc --noEmit -p packages/ops-contracts`.
- [ ] **Step 5: Commit.**
  ```bash
  git add packages/ops-contracts/src/billing-document.ts packages/ops-contracts/src/billing-document.test.ts packages/ops-contracts/src/index.ts
  git commit -m "feat(contracts): billing document schemas, totals and payment state"
  ```

### Task 3: Schema, migration, numbering and the document service

**Files:**
- Modify: `apps/web/prisma/schema.prisma`. Add the three models exactly as in the spec's "Data model" section, plus back-relations `billingDocuments BillingDocument[]` on `AdvertiserOrg` and `Campaign`.
- Create: `apps/web/prisma/migrations/20261121000000_billing_documents/migration.sql`
- Create: `apps/api/lib/billing/documents.ts`
- Test: `apps/api/lib/billing/documents.test.ts`. Use the real test DB with `describe.skipIf(!testDatabaseUrl())`, as `transactions/route.test.ts` does.

**Interfaces:**
- Consumes: everything from Task 2.
- Produces:
  ```ts
  export async function nextBillingNumber(tx: Prisma.TransactionClient, kind: BillingDocumentKind, issueDate: string): Promise<string>
  export async function createBillingDocument(input: BillingDocumentInput, createdBy: string): Promise<BillingDocumentDto>
  export async function updateBillingDocument(id: number, input: BillingDocumentInput): Promise<BillingDocumentDto | "not_found" | "locked">
  export async function getBillingDocument(id: number, today?: string): Promise<BillingDocumentDto | null>
  export async function listBillingDocuments(filter: { kind?: BillingDocumentKind; status?: BillingDocumentStatus; orgId?: number }, today?: string): Promise<BillingDocumentListItemDto[]>
  export async function assertCampaignBelongsToOrg(orgId: number | null, campaignId: number | null): Promise<string | null> // error message or null
  ```
  - `today` defaults to `nairobiDay(new Date())` from `@workspace/ops-contracts`.
  - Totals always come from `computeBillingTotals`. Client totals are never trusted.
  - `customer` is stored as-is. When `orgId` is set and `customer.name` is empty, it is filled from the org name.
- Numbering SQL, run inside `prisma.$transaction`:
  ```sql
  INSERT INTO billing_document_counters (kind, year, last) VALUES ($1, $2, 1)
  ON CONFLICT (kind, year) DO UPDATE SET last = billing_document_counters.last + 1
  RETURNING last
  ```

- [ ] **Step 1: Add the models** to `schema.prisma`, then generate the migration SQL without applying it:
  ```bash
  cd "C:/Users/victo/Documents/GitHub/AdmobiHQ/apps/web"
  npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20261121000000_billing_documents/migration.sql
  ```
  Review the SQL. It must contain only `CREATE TABLE`, `CREATE INDEX` and `ADD CONSTRAINT` statements for the three new tables, and nothing touching other tables or the `n8n` schema.
- [ ] **Step 2: Apply to the dev DB only.** First check the host in `apps/api/.env.local` `DATABASE_URL` and confirm it is the dev branch, not prod. Then run `npx prisma migrate deploy` from `apps/web` and `node ../../scripts/prisma-generate-safe.mjs` from `apps/api`.
- [ ] **Step 3: Write the failing tests:**
  - `assigns INV/<year>/0001-style numbers per kind and year`: create an invoice and a quote, and expect the numbers to match `/^INV\/2026\/\d{4,}$/` and `/^QT\/2026\/\d{4,}$/`.
  - `concurrent creates get distinct numbers`: `Promise.all` of 5 creates gives 5 unique numbers.
  - `ignores client totals and stores computed totals`: pass the sample with discount 5 and tax 16, and expect `totalKes` to be 3195.8.
  - `update is refused once sent`: set the status to `"sent"` directly, and expect `updateBillingDocument` to return `"locked"`.
  - `assertCampaignBelongsToOrg rejects another org's campaign`.
  - `list returns paymentState derived from payments`: insert a `billing_document_payments` row of 400 on a sent 1000 invoice, and expect `part_paid`.
- [ ] **Step 4: Run the tests and confirm they fail.** Run `cd "C:/Users/victo/Documents/GitHub/AdmobiHQ/apps/api" && npx vitest run lib/billing/documents.test.ts`. Expected: FAIL.
- [ ] **Step 5: Implement `documents.ts`.** Use one `toDto(row)` mapper that includes `org.name`, `campaign.name`, the payments, and the invoice whose `source_quote_id` equals this id, which gives `convertedInvoiceId`.
- [ ] **Step 6: Run the tests again.** Expected: PASS.
- [ ] **Step 7: Commit.**
  ```bash
  git add apps/web/prisma/schema.prisma apps/web/prisma/migrations/20261121000000_billing_documents apps/api/lib/billing/documents.ts apps/api/lib/billing/documents.test.ts
  git commit -m "feat(billing): billing document tables, gapless numbering and service"
  ```

### Task 4: Ops CRUD and options routes

**Files:**
- Create: `apps/api/app/v1/ops/billing-documents/route.ts` (GET list, POST create)
- Create: `apps/api/app/v1/ops/billing-documents/options/route.ts` (GET)
- Create: `apps/api/app/v1/ops/billing-documents/[id]/route.ts` (GET, PATCH)
- Modify: `apps/api/lib/route-catalog.ts`, to register the new paths the way the existing finance routes are registered
- Test: `apps/api/app/v1/ops/billing-documents/route.test.ts`, mocking `api-utils` and `audit` as `transactions/route.test.ts` does

**Interfaces:**
- Consumes: the Task 3 service and the Task 2 schemas. Call `parseJsonBody(req, billingDocumentInputSchema)`.
- Produces these HTTP contracts:
  - `GET ?kind&status&orgId` → `{ items: BillingDocumentListItemDto[] }`
  - `POST` → 201 `BillingDocumentDto`
  - `GET /[id]` → `BillingDocumentDto` or 404
  - `PATCH /[id]` → `BillingDocumentDto`, 404, or 409 `"Only drafts can be edited"`
  - `GET /options` → `BillingDocumentOptionsDto`. The orgs are sorted by name, with their campaigns sorted newest first, and the defaults come from `ADMOBI_COMPANY.defaults`.
- POST and PATCH call `assertCampaignBelongsToOrg` and answer 400 with its message.
- Audit actions are `billing_document.created` and `billing_document.updated`, with `org_id`, `entity_type: "billing_document"` and `entity_id`. Match the field names `RecordAuditEventInput` actually uses.

- [ ] **Step 1: Write the failing tests:**
  - 403 without permission;
  - POST creates and returns a number, and calls audit once;
  - POST with a foreign campaign → 400;
  - PATCH a sent document → 409;
  - GET an unknown id → 404;
  - options lists the test org with its campaign.
- [ ] **Step 2: Run the tests and confirm they fail.** Run `npx vitest run app/v1/ops/billing-documents/route.test.ts`.
- [ ] **Step 3: Implement the three route files.**
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit.**
  ```bash
  git add apps/api/app/v1/ops/billing-documents apps/api/lib/route-catalog.ts
  git commit -m "feat(api): ops billing document CRUD and options routes"
  ```

### Task 5: Status, convert and payment routes

**Files:**
- Modify: `apps/api/lib/billing/documents.ts`
- Create: `apps/api/app/v1/ops/billing-documents/[id]/status/route.ts`
- Create: `apps/api/app/v1/ops/billing-documents/[id]/convert/route.ts`
- Create: `apps/api/app/v1/ops/billing-documents/[id]/payments/route.ts`
- Test: `apps/api/app/v1/ops/billing-documents/[id]/actions.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function changeBillingStatus(id: number, action: "send" | "accept" | "decline" | "void"): Promise<BillingDocumentDto | "not_found" | { conflict: string }>
  export async function convertQuoteToInvoice(id: number, createdBy: string): Promise<BillingDocumentDto | "not_found" | { conflict: string }>
  export async function recordBillingPayment(id: number, input: RecordBillingPaymentInput, createdBy: string): Promise<BillingDocumentDto | "not_found" | { conflict: string }>
  ```
- Allowed transitions; anything else is a 409 `{ conflict }`:
  - `send`: draft → sent. Sets `sent_at` and refreshes the customer snapshot's name, email and taxPin from the org when `org_id` is set.
  - `accept` and `decline`: quote, sent only.
  - `void`: any status except draft and void. Sets `voided_at`.
- Convert: only a quote in `sent` or `accepted` with no existing converted invoice. It creates a **draft invoice** with a new `INV/…` number, today as the issue date, a due date 14 days later, the same content, `invoiceTerms` as the terms, and `source_quote_id = quote.id`. It returns the new invoice.
- Payment rules:
  - A quote → 409 "Payments can only be recorded against invoices".
  - A draft or void document → 409 "Send the invoice before recording a payment" or "This invoice is void".
  - A payment where `paid + amount > total + 0.001` → 409 "That's more than the balance of Ksh X".
  - The check and the insert run inside one `$transaction`, with `SELECT … FOR UPDATE` on the document row so concurrent payments can't both pass.
- Audit actions are `billing_document.status_changed`, `billing_document.converted` and `billing_document.payment_recorded`.

- [ ] **Step 1: Write the failing tests:**
  - `send` on a draft → sent, with `sentAt` set;
  - `send` on a sent document → 409;
  - `accept` on an invoice → 409;
  - `void` on a draft → 409;
  - convert a sent quote → a new draft invoice whose number starts with `INV/` and whose `sourceQuoteId` is set;
  - converting the same quote twice → 409;
  - payment on a quote → 409;
  - payment on a draft → 409;
  - payment of 400 on a sent 1000 invoice → `paymentState` is `part_paid` and the balance is 600;
  - a further 700 → 409;
  - 600 → `paid`;
  - payment on a void invoice → 409;
  - **no wallet row:** `walletTransaction.count` for the org is unchanged after the payments.
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement the service functions and the three routes.** Validate bodies with `billingStatusActionSchema` and `recordBillingPaymentSchema`.
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit.**
  ```bash
  git add apps/api/lib/billing/documents.ts "apps/api/app/v1/ops/billing-documents/[id]"
  git commit -m "feat(api): send, convert and record payments on billing documents"
  ```

### Task 6: PDF routes — ops preview, ops download, customer list and download

**Files:**
- Create: `apps/api/lib/billing/pdf-props.ts`
- Create: `apps/api/app/v1/ops/billing-documents/preview/route.tsx` (POST)
- Create: `apps/api/app/v1/ops/billing-documents/[id]/pdf/route.tsx` (GET)
- Create: `apps/api/app/v1/customer/finance/documents/route.ts` (GET)
- Create: `apps/api/app/v1/customer/finance/documents/[id]/pdf/route.tsx` (GET)
- Modify: `apps/api/lib/billing/documents.ts`, to add `listCustomerBillingDocuments(orgId)` and `getCustomerBillingDocument(orgId, id)`. Both filter `org_id = orgId AND status <> 'draft'`.
- Modify: `apps/api/lib/route-catalog.ts`
- Test: `apps/api/lib/billing/pdf-props.test.ts` and `apps/api/app/v1/customer/finance/documents/documents.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function pillFor(kind: BillingDocumentKind, status: BillingDocumentStatus, state: BillingPaymentState | null): PdfPill | null
  export function toBillingPdfProps(doc: BillingDocumentInput & { number: string | null; status: BillingDocumentStatus; campaignName: string | null; paidKes: number; paymentState: BillingPaymentState | null }): BillingDocumentPdfProps
  export async function renderBillingDocumentPdf(props: BillingDocumentPdfProps, number: string | null): Promise<Uint8Array>  // sets metadata title "Admobi - Invoice INV/2026/0001" and BILLING_PDF_FOOTER
  ```
- `pillFor` mapping:

  | Input | Pill |
  |---|---|
  | draft | DRAFT, grey |
  | void | VOID, grey |
  | quote, any other status | null |
  | invoice, unpaid | UNPAID, red |
  | invoice, overdue | OVERDUE, red |
  | invoice, part_paid | PART-PAID, amber |
  | invoice, paid | PAID, green |

- `toBillingPdfProps`:
  - Applies `latin1()` to every string.
  - Totals come from `computeBillingTotals`.
  - `paidKes` and `balanceKes` are `null` unless the document is an invoice with `paidKes > 0`.
  - `campaignName` is used only when present.
- **Preview:** `POST` with a body `billingDocumentInputSchema & { id?: number }`. When `id` is given, the stored number, status and payments are used; otherwise the number is null and the status draft. The response is `Content-Type: application/pdf` with `Content-Disposition: inline`.
- **Downloads:** both use `attachment` with `exportFileName(kind, number.replaceAll("/", "-"), "pdf")`.
- **Customer list:** returns `{ items: CustomerBillingDocumentDto[] }`. Another org's document, a draft, or a document with `org_id = null` → 404.

- [ ] **Step 1: Write the failing tests:**
  - every `pillFor` row in the table above;
  - `toBillingPdfProps` latin1s an emoji name;
  - customer list excludes drafts and other orgs;
  - customer PDF of another org's document → 404;
  - customer PDF of a draft → 404;
  - customer PDF of its own sent invoice → 200, `application/pdf`, with the body starting `%PDF-`.
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run the tests again.** Expected: PASS.
- [ ] **Step 5: Commit.**
  ```bash
  git add apps/api/lib/billing apps/api/app/v1/ops/billing-documents/preview "apps/api/app/v1/ops/billing-documents/[id]/pdf" apps/api/app/v1/customer/finance/documents apps/api/lib/route-catalog.ts
  git commit -m "feat(api): billing document PDF preview and downloads"
  ```

### Task 7: Ops API client methods

**Files:**
- Modify: `packages/ops-api-client/src/index.ts`. Add a `billingDocuments` group to the `OpsClient` type and to `createOpsClient`. Extend `requestBlob(path, init)` so a caller-supplied `init.signal` also aborts the request: when either signal aborts, abort the internal controller.

**Interfaces:**
- Produces:
  ```ts
  billingDocuments: {
    list: (params?: { kind?: BillingDocumentKind; status?: BillingDocumentStatus; orgId?: number }) => Promise<{ items: BillingDocumentListItemDto[] }>
    options: () => Promise<BillingDocumentOptionsDto>
    get: (id: number) => Promise<BillingDocumentDto>
    create: (body: BillingDocumentInput) => Promise<BillingDocumentDto>
    update: (id: number, body: BillingDocumentInput) => Promise<BillingDocumentDto>
    changeStatus: (id: number, action: "send" | "accept" | "decline" | "void") => Promise<BillingDocumentDto>
    convert: (id: number) => Promise<BillingDocumentDto>
    recordPayment: (id: number, body: RecordBillingPaymentInput) => Promise<BillingDocumentDto>
    preview: (body: BillingDocumentInput & { id?: number }, signal?: AbortSignal) => Promise<Blob>
    pdf: (id: number) => Promise<Blob>
  }
  ```
  `preview` uses a 30 s timeout, because a render takes longer than JSON.

- [ ] **Step 1: Implement**, following the existing `finance` group's style with `${apiPrefix}/ops/billing-documents…`.
- [ ] **Step 2: Typecheck.** Run `cd "C:/Users/victo/Documents/GitHub/AdmobiHQ" && npx tsc --noEmit -p packages/ops-api-client`. Expected: no errors.
- [ ] **Step 3: Commit.**
  ```bash
  git add packages/ops-api-client/src/index.ts
  git commit -m "feat(ops-client): billing document methods"
  ```

### Task 8: Ops "Invoices & quotes" Finances tab

**Files:**
- Modify: `apps/ops/components/finances/finance-view.tsx`. Add `{ value: "documents", label: "Invoices & quotes" }` to `FINANCE_TABS`, placed after "ledger", and add a `case "documents": return <BillingDocumentsTab />`.
- Modify: `apps/ops/app/(dashboard)/finances/page.tsx`. Add `"documents"` to the `showRange` exclusion list.
- Create: `apps/ops/components/finances/billing-documents-tab.tsx` (client)
- Create: `apps/ops/components/finances/billing-status.ts`

**Interfaces:**
- Produces:
  ```ts
  // billing-status.ts — shared by tab and editor
  export function billingPillProps(doc: { kind: BillingDocumentKind; status: BillingDocumentStatus; paymentState: BillingPaymentState | null }): { label: string; tone: StatusTone }
  ```
  `StatusTone` comes from `@workspace/ui/components/dashboard/status-pill`. The mapping:
  - Draft → neutral; Void → neutral.
  - Quote: Sent → info, or neutral if `info` doesn't exist; Accepted → good; Declined → neutral.
  - Invoice: Unpaid → serious; Overdue → serious; Part-paid → warning, or the closest amber tone; Paid → good.

  Read `status-pill.tsx` for the actual tone names.

- [ ] **Step 1: Build the tab.**
  - Use `useQuery(["billing-documents", filters], () => client.billingDocuments.list(filters))`.
  - Use `DataTable` and `TableToolbar` as `roles-view.tsx` does. The toolbar has search (number and customer) plus Kind and Status selects.
  - Columns: Number (medium weight, tabular), Kind, Customer, Campaign, Issued, Due, Total (right-aligned), Paid (right-aligned), Status (`StatusPill`).
  - A row click goes to `/finances/documents/{id}`.
  - The primary "New" button is a link to `/finances/documents/new`.
  - The empty state reads "No invoices or quotes yet", with a New button.
  - The loading state uses `Skeleton`. Errors show `ApiErrorBanner`.
- [ ] **Step 2: Typecheck and lint.** Run `cd "C:/Users/victo/Documents/GitHub/AdmobiHQ/apps/ops" && npx tsc --noEmit && npx eslint components/finances`. Expected: clean.
- [ ] **Step 3: Commit.**
  ```bash
  git add apps/ops/components/finances/finance-view.tsx "apps/ops/app/(dashboard)/finances/page.tsx" apps/ops/components/finances/billing-documents-tab.tsx apps/ops/components/finances/billing-status.ts
  git commit -m "feat(ops): invoices and quotes finances tab"
  ```

### Task 9: Ops editor — form, live preview, save

**Files:**
- Create: `apps/ops/app/(dashboard)/finances/documents/new/page.tsx` and `apps/ops/app/(dashboard)/finances/documents/[id]/page.tsx`. Both are server components calling `requireOpsPermission("finances")`, redirecting to `/home` on failure (copy `campaigns/[id]/page.tsx`), and rendering `<BillingDocumentEditor id={number | null} />`.
- Create: `apps/ops/components/billing/billing-document-editor.tsx`. This is the client shell: data loading, the top bar, and the two-column layout.
- Create: `apps/ops/components/billing/billing-document-form.tsx`, holding sections 1–5 of the spec.
- Create: `apps/ops/components/billing/line-items-field.tsx`
- Create: `apps/ops/components/billing/pdf-preview.tsx`

**Interfaces:**
- Consumes: the Task 7 client, the Task 2 schemas and `computeBillingTotals`, and `useDebouncedValue` from `apps/ops/lib/use-debounced-value.ts`. Check its signature.
- Produces:
  ```ts
  export function BillingDocumentEditor({ id }: { id: number | null }): ReactElement
  export function PdfPreview({ input, id }: { input: BillingDocumentInput; id?: number }): ReactElement // debounced 600ms, aborts stale requests, revokes old object URLs
  ```
- Form state uses `react-hook-form`, which is already in ops, with `zodResolver(billingDocumentInputSchema)` and `useFieldArray` for the lines.
- **New documents** get these defaults: kind `"invoice"`, issue date today, due date today + 14, one empty line, discount, tax and fee all 0, and note, payment instructions and terms from `options.defaults`. The terms are `quoteTerms` or `invoiceTerms` depending on kind, and switch with the kind only while the terms field is untouched.

- [ ] **Step 1: Build the layout.**
  - **Desktop** (`lg`): `grid-cols-[minmax(0,560px)_1fr]`. The form column scrolls. The preview column is `sticky top-[var(--header-h)] h-[calc(100dvh-…)]` on a `bg-muted` canvas, with the iframe centred at A4 ratio (`aspect-[1/1.414]`), `shadow-lg` and white.
  - **Mobile:** stacked, with a "Preview" sheet button instead of the side column.
  - **Top bar:** a back link to `/finances?tab=documents`, then the title "New invoice" or "INV/2026/0007". The number shows in a read-only mono chip, or "Draft" before the first save, next to the status pill. Actions are on the right.
- [ ] **Step 2: Build the form sections.** Each section is a `<section>` with an `h2` in `text-sm font-medium` and fields in a 2-column grid on `sm+`:
  1. **Document:**
     - A Quote/Invoice segmented control (`role="radiogroup"`), disabled after the first save.
     - Issue date, plus "Expiry date" or "Due date" depending on kind, using `<Input type="date">`.
     - Reference.
  2. **Customer:**
     - An org combobox (`Command` in a `Popover` if available in `@workspace/ui`, otherwise `Select`). Choosing an org prefills name, email (billingEmail) and taxPin.
     - A "Not a customer yet" switch that clears `orgId` and `campaignId`.
     - Contact, phone, address (`Textarea`) and customer reference.
     - Campaign select, disabled without an org, with a "No campaign" option.
  3. **Line items** (`line-items-field.tsx`):
     - Each line is a `Card`. Its header reads "Item n", with icon buttons Move up, Move down, Duplicate and Delete. Each button has an `aria-label`, Move up/down is disabled at the edges, and Delete is disabled when only one line is left.
     - Fields: description (full width), then quantity, unit and unit price in 3 columns, then a "Taxable" checkbox.
     - The line amount is right-aligned and bold.
     - An "Add line item" outline button sits after the list.
  4. **Adjustments and totals:** discount %, tax % ("VAT 16%" placeholder), fee label and fee amount. Below them, a `bg-foreground text-background rounded-xl` summary card showing Subtotal, Discount, Tax, Fee and **Total** from `computeBillingTotals(watch())`, with tabular figures.
  5. **Notes and terms:** three `Textarea`s.
  - Field errors appear under each input with `aria-describedby`.
  - Once the document is not a draft, the whole form is `disabled` through a `<fieldset disabled>`, with an inline note "Sent documents are locked. Void and re-issue to change them."
- [ ] **Step 3: Build `PdfPreview`.**
  - It runs on `useDebouncedValue(watch(), 600)` and calls `client.billingDocuments.preview(input, controller.signal)`. It sets `URL.createObjectURL(blob)` as the iframe `src` with `#toolbar=0&view=FitH`, and revokes the previous URL.
  - While a request is in flight it shows a subtle "Updating…" badge over the last good render, never a blank panel.
  - If the form is invalid, it keeps the last render and shows "Fix the highlighted fields to refresh the preview".
- [ ] **Step 4: Wire up Save.**
  - Save calls `create` for a new document, then `router.replace(/finances/documents/{id})` and a toast showing "Saved INV/2026/0007". For an existing draft it calls `update`.
  - Download PDF calls `client.billingDocuments.pdf(id)`, then downloads through an anchor using the Global Constraints filename. It is disabled before the first save.
  - A `beforeunload` guard fires while `formState.isDirty`.
  - Mutations go through react-query, and `["billing-documents"]` is invalidated on success.
- [ ] **Step 5: Typecheck and lint.** Run `npx tsc --noEmit && npx eslint components/billing "app/(dashboard)/finances"` in `apps/ops`. Expected: clean.
- [ ] **Step 6: Manual check.** Start api (3003) and ops locally. Create the SwiftQuote sample invoice and check:
  - the preview updates about 0.6 s after typing stops;
  - Save assigns `INV/2026/000n`;
  - Download gives the same PDF as the preview.
  Screenshot the editor next to the user's SwiftQuote screenshot.
- [ ] **Step 7: Commit.**
  ```bash
  git add "apps/ops/app/(dashboard)/finances/documents" apps/ops/components/billing
  git commit -m "feat(ops): billing document editor with live PDF preview"
  ```

### Task 10: Ops editor — lifecycle actions and payments panel

**Files:**
- Create: `apps/ops/components/billing/document-actions.tsx`, the top-bar action buttons
- Create: `apps/ops/components/billing/record-payment-dialog.tsx`
- Create: `apps/ops/components/billing/payments-panel.tsx`
- Modify: `apps/ops/components/billing/billing-document-editor.tsx`

**Interfaces:**
- Consumes: `changeStatus`, `convert` and `recordPayment` from Task 7, and `billingPillProps` from Task 8.
- Which actions show, by state:

  | State | Actions |
  |---|---|
  | draft | Save, Download PDF, **Mark sent**. Mark sent saves first if the form is dirty, then confirms with "Advertisers in {org} will see this in Billing." |
  | sent quote | Accept, Decline, **Convert to invoice**, Void |
  | accepted quote | **Convert to invoice**, or "View invoice" when `convertedInvoiceId` is set, plus Void |
  | sent invoice, not paid | **Record payment**, Void |
  | paid invoice | Download only, plus Void |
  | void | Download only |

  - Void always opens an `AlertDialog` reading "Void INV/…? This can't be undone. The number stays used."
  - Convert navigates to the new invoice.
- **Record payment dialog:**
  - Amount defaults to the balance (KES input), with a hint showing "Balance Ksh X".
  - Method select uses the labels Bank transfer, M-Pesa, Cheque, Cash and Other.
  - Reference.
  - Paid on, a date field defaulting to today.
  - Note.
  - Submitting toasts "Payment recorded", then refetches. A server 409 message shows inline.
- **Payments panel** (sent invoices only):
  - It sits under the form header as a compact card: Total, Paid and Balance in a 3-up stat row, then a list of payments showing date, method, reference and amount.
  - An empty state reads "No payments recorded yet."

- [ ] **Step 1: Implement the three components** and wire them into the editor.
- [ ] **Step 2: Typecheck and lint** `apps/ops`. Expected: clean.
- [ ] **Step 3: Manual check.**
  - Mark sent, and confirm the preview pill shows UNPAID in red.
  - Record 400 of 1000, and confirm PART-PAID in amber with Paid and Balance rows.
  - Try recording 700, and confirm the inline error.
  - Record 600, and confirm PAID in green.
  - Create a quote, send it and convert it, and confirm a new `INV/…` draft opens.
  - Void a document, and confirm the grey VOID pill.
- [ ] **Step 4: Commit.**
  ```bash
  git add apps/ops/components/billing
  git commit -m "feat(ops): send, convert, void and record payments on billing documents"
  ```

### Task 11: Customer-web Billing — merged list and download

**Files:**
- Modify: `apps/customer-web/lib/use-analytics.ts`. Add `useBillingDocuments()`, which queries `/v1/customer/finance/documents` and follows `useInvoices`.
- Modify: `apps/customer-web/components/billing/format.ts`. Add `BILLING_DOCUMENT_STATUS`, a function from `CustomerBillingDocumentDto` to `{ label; tone }` with the same mapping as Task 8.
- Modify: `apps/customer-web/components/billing/invoices-tab.tsx`

**Interfaces:**
- Consumes: `CustomerBillingDocumentDto` (Task 2) and the customer routes (Task 6).
- Rows are merged into `type BillingRow = { source: "receipt"; invoice: InvoiceDto } | { source: "document"; doc: CustomerBillingDocumentDto }` and sorted by issue date, newest first.
- **Document rows:**
  - Number.
  - Period → "Issued {date}".
  - Campaign.
  - Amount → `totalKes`.
  - Tax → "—".
  - Due → `dueDate`, labelled "Expires" for quotes.
  - Status pill.
  - A PDF button that goes to `/v1/customer/finance/documents/{id}/pdf`.
- Clicking a document row downloads it. The receipt-only `InvoiceSheet` is not opened for documents.
- The "Open" and "Overdue" summary sums also include unpaid and overdue manual invoices, using `balanceKes`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Typecheck and lint.** Run `cd "C:/Users/victo/Documents/GitHub/AdmobiHQ/apps/customer-web" && npx tsc --noEmit && npx eslint components/billing lib`. Expected: clean.
- [ ] **Step 3: Manual check.** As the test org's advertiser:
  - the sent invoice from Task 10 is listed with the right pill;
  - the PDF downloads;
  - a draft is not listed.
- [ ] **Step 4: Commit.**
  ```bash
  git add apps/customer-web/lib/use-analytics.ts apps/customer-web/components/billing/format.ts apps/customer-web/components/billing/invoices-tab.tsx
  git commit -m "feat(customer-web): list and download billing documents in Billing"
  ```

### Task 12: Docs, full verification, graph

**Files:**
- Modify: `docs/ops/OPS-ADMIN.md`. Add an "Invoices & quotes" section covering where it lives, numbering, draft → sent lock, convert, record payment (not wallet), void, and the company details placeholder in `apps/api/lib/billing/company.ts`.
- Modify: `docs/customer/APP.md`. Add a Billing documents section covering what advertisers see and that drafts are hidden.
- Modify: `docs/api/API.md`. Add the 9 ops and 2 customer routes with permissions.
- Modify: `docs/superpowers/specs/2026-11-21-billing-documents-design.md`. Change only the Status line to "approved 2026-11-21".

- [ ] **Step 1: Write the doc sections.**
- [ ] **Step 2: Run the full checks.** From the repo root, `npx turbo run typecheck lint --filter=api --filter=ops --filter=customer-web --filter=@workspace/ops-contracts --filter=@workspace/ops-api-client`, then `cd "C:/Users/victo/Documents/GitHub/AdmobiHQ/apps/api" && npx vitest run`. Expected: all green. Report any pre-existing failures as such, with output.
- [ ] **Step 3: Rebuild the graph.** Run `graphify update .`.
- [ ] **Step 4: Commit.**
  ```bash
  git add docs/ops/OPS-ADMIN.md docs/customer/APP.md docs/api/API.md docs/superpowers/specs/2026-11-21-billing-documents-design.md
  git commit -m "docs: billing documents for ops, customers and API"
  ```
- [ ] **Step 5: Hand back to the user. Do not merge.** The user must:
  1. fill in `TODO(user)` in `company.ts` (KRA PIN, bank and paybill details);
  2. run the migration on prod by hand before merge (additive only), after confirming that the staging `DATABASE_URL` host isn't prod;
  3. decide on the PR.
