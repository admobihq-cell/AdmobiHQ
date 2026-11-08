# Paystack Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Advertisers fund campaigns at submission through Paystack (M-Pesa and card), unused money stays as refundable credit, and ops pays drivers with one Disburse press through Paystack Transfers.

**Architecture:**
- One Paystack client module in `apps/api/lib/payments/`.
- One money-in function (`settlePayment`) that every path calls: the webhook, the status poll and the cron.
- The existing append-only `wallet_transactions` ledger plus three new tables (`payments`, `refunds`, and the extended `payouts`).
- A single nightly cron that writes straight-line spend and reconciles anything left pending.

**Tech Stack:** Next.js route handlers (`apps/api`), Prisma (schema in `apps/web/prisma`), Postgres (Neon), Vitest, React (customer-web, ops, driver-web), Expo (customer-mobile, driver-mobile), Paystack REST API.

**Spec:** [docs/superpowers/specs/2026-11-07-paystack-payments-design.md](../specs/2026-11-07-paystack-payments-design.md). Read it before any task. Section numbers below (§) refer to it.

## Global Constraints

- **Branch:** create `feat/paystack-payments` off `master`. Do not create a git worktree (the user said "no worktree"). Another agent may share the working tree, so stage files by path, never `git add -A`.
- **Commits:** no `Co-Authored-By` trailers, and no "Generated with Claude Code" lines (CLAUDE.md).
- **API base:** Paystack is `https://api.paystack.co`, with header `authorization: Bearer ${PAYSTACK_SECRET_KEY}`.
- **Amounts:** every Paystack amount is KES × 100 (cents), sent as an integer. The DB stores `Decimal(12,2)` KES.
- **Reference formats:**
  - payments: `adm-pay-<12 lowercase hex>`
  - refunds: `adm-refund-<refund id>`
  - transfers: `adm-payout-<payout id>-<yyyymm>`
  - spend rows: `spend-c<campaign id>-<YYYY-MM-DD>`
- **Days:** Nairobi calendar days (`Africa/Nairobi`). Reuse `LEDGER_DAY` and `ledgerInRange` from `finance-queries.ts` for anything reported.
- **Tax:** `VAT_RATE = 0` lives in `packages/ops-contracts/src/pricing.ts`. No VAT line anywhere while it is 0.
- **Permissions:**
  - Paying at submission needs `campaigns:submit`.
  - Top-up and refund requests need `billing:write`.
  - Ops refunds need `finances`.
  - Disburse needs the new ops permission `payouts`.
- **Notifications:** every route that mutates money writes an audit event (`lib/audit.ts`). Notifications are fire-and-forget after commit, in the same style as `customer/campaigns/[id]/submit/route.ts`. All of them go through `lib/payments/money-notify.ts` (Task 3A), and they fire only when an `UPDATE … WHERE status = <old>` actually changed a row, never because an event merely arrived. Spec §6.1 IDs (A1–A10, O1–O7, D1–D3) are cited below.
- **Docs:** CLAUDE.md requires each task that changes behaviour to update the matching doc under `docs/` in the same commit (the doc is named in each task).
- **Tests:**
  - API tests: `npm test -w api -- <path>`. DB tests use `testDatabaseUrl()` and `describe.skipIf(!databaseUrl)`, like `apps/api/app/v1/ops/finance/transactions/route.test.ts`.
  - Contracts: `npm test -w @workspace/ops-contracts`.
  - Typecheck: `npm run typecheck -w <workspace>`.
- **Graph:** after code changes, run `graphify update .`.

## Review Focus

1. **Webhook and status poll racing for the same reference.** The money must be credited exactly once. Test: `settlePayment` called twice concurrently writes one ledger row (Task 4).
2. **Balance spent between checkout start and settlement.** The money must stay as credit, the campaign must stay a draft, and the advertiser must be notified. Test: in Task 4.
3. **Refund larger than any single payment.** It must be spread across several payments, and no payment may be refunded beyond its amount net of earlier refunds. Test: `allocateRefund` (Task 8).
4. **Campaign approved after its start date.** No spend may be written for days before approval, and the remainder must become credit when the flight ends. Test: `dailySpendRows` (Task 6).
5. **Transfer approval for an unknown or tampered transfer.** The answer must be 400 and fast, with no Paystack call made. Test: in Task 11.

---

## Phase 0 — Prerequisites

### Task 0: Paystack account setup and test-mode spike (human + throwaway script)

**Files:**
- Create: `apps/api/scripts/paystack-spike.ts` (throwaway; delete before merging)

- [ ] **Step 1 (human):** In the Paystack Kenya dashboard:
  - Confirm the business is "Registered" and Transfers are enabled.
  - Switch settlement to **Manual Payouts**.
  - Disable transfer OTP (Settings → Preferences → Transfer approvals: uncheck "Confirm transfers before sending").
  - Set the test webhook URL to `<api preview url>/v1/payments/paystack/webhook`.
  - Set the transfer approval URL to `<api preview url>/v1/payments/paystack/transfer-approval`.
- [ ] **Step 2 (human):** Add `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` and `PAYSTACK_CALLBACK_URL` (`https://<customer-web>/billing/payment-return`) to Infisical for dev and preview (test keys) and prod (live keys). Then pull them into `apps/api/.env.local`.
- [ ] **Step 3:** In the spike script:
  1. Initialize a KES 10 transaction with `channels: ["mobile_money","card"]`.
  2. Open `authorization_url` and pay with test phone `+254710000000`.
  3. Record whether hosted checkout offers M-Pesa (STK) and what `verify` returns (`channel`, `fees`, `amount`).
  4. Create an `MPESA` transfer recipient using each of `0710000000`, `254710000000` and `+254710000000`, and record which formats succeed.
  5. Send a KES 10 test transfer and record whether a `transfer.success` webhook arrives.
- [ ] **Step 4:** Append a dated "Spike results" section to the spec §13 with the three answers. If hosted checkout has no M-Pesa STK, Task 5 uses `POST /charge` for M-Pesa instead (see Task 5, Step 3 note).
- [ ] **Step 5:** Commit the spec addendum only. Delete the spike script.

---

## Phase 1 — Collections

### Task 1: Schema, migration and contract enums

**Files:**
- Modify: `apps/web/prisma/schema.prisma`:
  - `Campaign` (~L664)
  - `WalletTransaction` comments (~L853)
  - `Payout` (~L963)
  - `DriverProfile` (~L585)
  - `AdvertiserOrg.tax_pin` comment (~L461), changing "Pesapal" to "Paystack"
- Create: `apps/web/prisma/migrations/<timestamp>_paystack_payments/migration.sql` (generated)
- Modify: `packages/ops-contracts/src/analytics.ts:33` (`WALLET_TRANSACTION_KINDS`) and the kind label map next to it
- Modify: `packages/ops-contracts/src/enums.ts` (`OPS_PERMISSIONS` gains `"payouts"`)
- Create: `packages/ops-contracts/src/payments.ts` (status unions, exported from `src/index.ts`)
- Modify: `apps/api/scripts/seed-demo-data.ts`: seed rows get `provider: "seed"` (unchanged). Demo payouts must set `driver_profile_id` when a demo driver profile exists, and keep `driver_id` otherwise.
- Docs: `docs/shared/DATABASE.md` (new tables and columns, ledger kinds table from spec §4)

**Interfaces:**
- Produces Prisma models `Payment`, `Refund` and the new columns exactly as spec §7, with these names:
  - Relations: `Payment.org`, `Payment.campaign`, `Payment.refunds`, `Refund.payment`, `Payout.driverProfile`.
  - `WalletTransaction` gets optional back-relations `payment Payment?` and `refundRow Refund?`, keyed through `Payment.wallet_transaction_id @unique` and `Refund.wallet_transaction_id @unique`.
- Produces in `@workspace/ops-contracts`:
  - `WALLET_TRANSACTION_KINDS = ["top_up","spend","refund","adjustment","cash_refund"]`
  - `PAYMENT_STATUSES = ["initiated","success","failed","abandoned","amount_mismatch"] as const` and `type PaymentStatus`
  - `REFUND_STATUSES = ["pending","processing","needs_attention","processed","failed"] as const` and `type RefundStatus`
  - `PAYOUT_STATUSES = ["pending","processing","settled","failed","reversed"] as const` and `type PayoutStatus`
  - `VAT_RATE = 0`, in `pricing.ts`

- [ ] **Step 1:** Write the failing contract test `packages/ops-contracts/src/payments.test.ts`. It asserts `WALLET_TRANSACTION_KINDS` contains `"cash_refund"`, `OPS_PERMISSIONS` contains `"payouts"`, `VAT_RATE === 0`, and the three status arrays equal the values above.
- [ ] **Step 2:** Run `npm test -w @workspace/ops-contracts -- payments`. Expected: FAIL.
- [ ] **Step 3:** Add the enums and `VAT_RATE`, and give `cash_refund` the label "Refund to payer" in the kind label map.
- [ ] **Step 4:** Edit `schema.prisma` per spec §7. Then run `cd apps/web && npx dotenv -e .env.local -- prisma migrate dev --name paystack_payments --create-only`. Read the SQL: it must be additive only (no drops or renames), then apply it with `prisma migrate dev`.
- [ ] **Step 5:** Run `npm test -w @workspace/ops-contracts` and `npm run typecheck -w api -w ops -w customer-web`. Expected: PASS, apart from TypeScript errors listing exhaustive kind maps. Fix each one by adding `cash_refund`.
- [ ] **Step 6:** Update `docs/shared/DATABASE.md`. Commit: `feat(db): payments, refunds and payout transfer columns for Paystack`.

> **Prod migration is human-run and must precede the merge** (same rule as the media library).

### Task 2: Paystack client and webhook signature

**Files:**
- Create: `apps/api/lib/payments/paystack.ts`
- Test: `apps/api/lib/payments/paystack.test.ts`

**Interfaces (Produces):**
```ts
export const toSubunit: (kes: number) => number            // Math.round(kes * 100)
export const fromSubunit: (cents: number) => number        // cents / 100
export function verifyWebhookSignature(rawBody: string, header: string | null, secret: string): boolean
export type PaystackTx = { id: number; status: string; reference: string; amount: number; currency: string;
  channel: string | null; fees: number | null; paid_at: string | null; gateway_response: string | null }
export function initializeTransaction(input: { email: string; amountKes: number; reference: string;
  callbackUrl: string; metadata: Record<string, unknown>; channels?: string[] }): Promise<{ authorizationUrl: string; accessCode: string }>
export function verifyTransaction(reference: string): Promise<PaystackTx>
export function createRefund(input: { transactionReference: string; amountKes: number; reference: string; merchantNote: string }):
  Promise<{ id: number; status: string }>
export function createTransferRecipient(input: { type: "mobile_money" | "kepss"; name: string; accountNumber: string; bankCode: string }):
  Promise<{ recipientCode: string }>
export function listKesBanks(): Promise<{ name: string; code: string }[]>   // GET /bank?currency=KES
export function bulkTransfer(transfers: { amountKes: number; recipient: string; reference: string; reason: string }[]):
  Promise<{ reference: string; transferCode: string; status: string }[]>    // source "balance", currency "KES"; ≤100 items
export function verifyTransfer(reference: string): Promise<{ status: string; fee_charged: number | null; reason: string | null }>
export function getKesBalance(): Promise<number>                            // GET /balance → KES entry, in KES
export class PaystackError extends Error { status: number; body: unknown }
```

- [ ] **Step 1:** Write failing tests:
  - `verifyWebhookSignature` returns true for `createHmac("sha512", "sk_test_x").update(body).digest("hex")`, false for a one-character change, and false for a `null` header. It must never throw on a length mismatch.
  - `toSubunit(1234.565) === 123457` and `toSubunit(50000) === 5000000`.
  - `initializeTransaction` (with `fetch` mocked via `vi.stubGlobal`) POSTs to `https://api.paystack.co/transaction/initialize` with `amount: 5000000`, `currency: "KES"`, `metadata` as a **JSON string** and the bearer header, and returns `authorizationUrl` from `data.authorization_url`.
  - Any non-2xx or `status:false` response throws `PaystackError` carrying the HTTP status.
  - `bulkTransfer` throws when given more than 100 items.
- [ ] **Step 2:** Run `npm test -w api -- lib/payments/paystack`. Expected: FAIL.
- [ ] **Step 3:** Implement with global `fetch` and one private `paystack<T>(method, path, body?)` helper that reads `process.env.PAYSTACK_SECRET_KEY` at call time and throws if it's missing. The signature check is `crypto.timingSafeEqual` on equal-length buffers.
- [ ] **Step 4:** Run the tests. Expected: PASS. Commit: `feat(api): Paystack client and webhook signature check`.

### Task 3: Funding math and "holds funds"

**Files:**
- Create: `apps/api/lib/payments/funding.ts`
- Modify: `apps/api/lib/analytics/finance-queries.ts:133-137`. `committed` filters with `holdsFunds` instead of `isActive`. Leave `isActive` alone, because the budget statement PDF uses it.
- Test: `apps/api/lib/payments/funding.test.ts`; update `apps/api/app/v1/customer/finance/finance.test.ts` expectations for committed.

**Interfaces (Produces):**
```ts
export const HOLDING_STATUSES: ReadonlySet<string>   // submitted, approved, changes_requested
export function holdsFunds(c: Pick<Campaign, "funded_at" | "status" | "starts_on" | "ends_on">, today?: Date): boolean
export function dueNowKes(budgetKes: number, availableKes: number): number    // max(0, budget − max(0, available)), cents-rounded
export function availableKes(tx: Prisma.TransactionClient, orgId: number, today?: Date): Promise<number>
  // balance − Σ(budget − spent) over holdsFunds campaigns. Caller must hold `SELECT … FROM advertiser_orgs WHERE id = $1 FOR UPDATE`.
export function lockOrg(tx: Prisma.TransactionClient, orgId: number): Promise<void>
```

- [ ] **Step 1:** Failing tests:
  - `holdsFunds` is true for funded `submitted`, `approved` (flight scheduled or live) and `changes_requested` campaigns.
  - It is false for unfunded, `rejected` or `cancelled` campaigns, and for `approved` campaigns whose `ends_on` was yesterday.
  - `dueNowKes(50000, 12000.5) === 37999.5`, `dueNowKes(50000, 80000) === 0` and `dueNowKes(50000, -300) === 50000`.
  - DB test: an org with a `top_up` of 100,000, one funded submitted campaign (budget 60,000) and one unfunded draft gives `availableKes === 40000`.
- [ ] **Step 2:** Run, and see it fail. **Step 3:** Implement. `availableKes` reuses the same SQL shape as the `ledger` and `spentByCampaign` queries in `finance-queries.ts`.
- [ ] **Step 4:** Run `npm test -w api -- lib/payments/funding app/v1/customer/finance`. Expected: PASS. Commit: `feat(api): held-funds rule for committed balance`.

### Task 3A: Money notifications module

**Files:**
- Create: `apps/api/lib/payments/money-notify.ts`
- Create: `apps/api/lib/email/templates/PaymentReceipt.tsx` (amount, method, invoice number, campaign or "Account top-up", date, a "View receipt" link to `/billing?tab=invoices`), and `apps/api/lib/email/templates/MoneyUpdate.tsx` (title, body, CTA). Both use `shared/EmailLayout`, like `CampaignDecision.tsx`.
- Modify: `apps/api/lib/push/ops-alerts.ts`:
  - `OpsAlertType` gains `"finance"` (label "Finance", segment `"finances"`).
  - `OpsStaffAlertInput` gains an optional `href`, which overrides `/(ops)/${segment}/${entityId}`. Finance alerts pass `"/(ops)/finances"`.
- Test: `apps/api/lib/payments/money-notify.test.ts`

**Interfaces (Produces):** every function catches and logs its own errors and resolves `void`.
```ts
export function notifyPaymentReceived(p: { orgId: number; payerUserId: string; amountKes: number; channel: string | null;
  invoiceNumber: string; campaign: { id: number; name: string } | null }): Promise<void>   // A1 (campaign) | A2 (top-up)
export function notifyPaymentNotApplied(p: { orgId: number; amountKes: number; campaign: { id: number; name: string } }): Promise<void> // A3
export function notifyPaymentFailed(p: { orgId: number; payerUserId: string; campaign: { id: number; name: string } | null }): Promise<void> // A4
export function notifyPaymentMismatch(p: { orgId: number; payerUserId: string; reference: string }): Promise<void> // A5 + O2
export function notifyCreditReleased(p: { orgId: number; amountKes: number; campaign: { id: number; name: string };
  reason: "rejected" | "cancelled" | "completed" }): Promise<void>                                                // A6
export function notifyManualTopUp(p: { orgId: number; amountKes: number }): Promise<void>                          // A7
export function notifyRefundUpdate(p: { orgId: number; amountKes: number; method: "mpesa" | "card" | "other";
  stage: "sent" | "processed" | "delayed" }): Promise<void>                                                        // A8 | A9 | A10 (+O4 on delayed)
export function alertOpsFinance(p: { title: string; body: string; email?: boolean }): Promise<void>               // O2–O7 primitive
export function notifyPayoutUpdate(p: { driverClerkUserId: string; amountKes: number; method: "mpesa" | "bank";
  stage: "settled" | "failed" }): Promise<void>                                                                    // D1 | D2
export function notifyPayoutDetailsChanged(driverClerkUserId: string): Promise<void>                              // D3 (inbox + push + email)
```
Recipients:
- Advertiser money notices go to `listOrgMemberIdsWithPermission(orgId, "billing:read")` through `notifyCustomerUsers`.
- Receipt and refund emails go to `getCustomerEmail(payerUserId)` and `org.billing_email`, deduplicated case-insensitively. If both are null, no email is sent.
- Driver email comes from the existing driver Clerk helper in `lib/driver/driver-clerk.ts`.

Inbox `type` strings: `payment_received`, `payment_not_applied`, `payment_failed`, `payment_review`, `credit_released`, `refund_sent`, `refund_processed`, `refund_delayed`, `payout_settled`, `payout_failed`, `payout_details_changed`. Copy is verbatim from spec §6.1.

- [ ] **Step 1:** Failing tests. Mock `notifyCustomerUsers`, `sendEmail`, `sendAdminEmail`, `notifyOpsStaffAlert` and `notifyUserPush`.
  - `notifyPaymentReceived` with a campaign sends one email to each distinct address. Payer `a@x.co` plus billing `A@x.co` gives one email. It writes no inbox row (A1 rides the submit notice).
  - With no campaign it sends one email, plus `notifyCustomerUsers` with title "Payment received".
  - `notifyCreditReleased({ reason: "completed" })` writes a body containing "finished under budget".
  - `notifyRefundUpdate({ stage: "delayed" })` also calls `alertOpsFinance` with `email: true`.
  - `alertOpsFinance` passes `type: "finance"` and `href: "/(ops)/finances"`.
  - A throwing `sendEmail` does not reject.
  - `ops-alerts`: an `href` override is used verbatim; without one, the old path is unchanged (existing tests still pass).
- [ ] **Step 2:** Run `npm test -w api -- lib/payments/money-notify lib/push`. Expected: FAIL. **Step 3:** Implement. **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(api): money notifications for advertisers, ops and drivers`.

### Task 4: `settlePayment`, the only money-in path

**Files:**
- Create: `apps/api/lib/payments/settle-payment.ts`
- Create: `apps/api/lib/campaigns/submit-campaign.ts`. The DB update, audit and notifications move here from `customer/campaigns/[id]/submit/route.ts:46-106`, unchanged in behaviour.
- Modify: `apps/api/app/v1/customer/campaigns/[id]/submit/route.ts` (calls `submitCampaign`, see Step 5)
- Test: `apps/api/lib/payments/settle-payment.test.ts`, `apps/api/app/v1/customer/campaigns/[id]/submit/route.test.ts` (create if absent)

**Interfaces:**
- Consumes: `verifyTransaction`, `fromSubunit` (Task 2); `availableKes`, `lockOrg` (Task 3).
- Produces:
```ts
export async function submitCampaign(campaignId: number, actor: { userId: string }): Promise<Campaign & { creatives: … }>
  // status → submitted, submitted_at, review_reason null, audit, fire-and-forget notifications (as today)
export async function fundFromBalance(tx: Prisma.TransactionClient, campaign: Campaign): Promise<boolean>
  // lockOrg; if availableKes ≥ budget: set funded_at = now(), return true; else false
export type SettleResult = "settled" | "already_settled" | "pending" | "failed" | "abandoned" | "amount_mismatch" | "unknown_reference"
export async function settlePayment(reference: string): Promise<SettleResult>
export function invoiceNumber(paymentId: number, paidAt: Date): string   // "INV-2026-000042"
```

`settlePayment` does the following, inside one `prisma.$transaction`:
- `SELECT … FROM payments WHERE reference = $1 FOR UPDATE`
- If the status is `success`, return `already_settled`. Otherwise call `verifyTransaction`.
- Map the Paystack status: `success` continues; `failed` or `abandoned` updates the row; anything else returns `pending`.
- Check `currency === "KES"` and `amount === toSubunit(payment.amount_kes)`. If either doesn't match, set `amount_mismatch` and return.
- Write the `top_up` ledger row:
  - `provider "paystack"`, `reference` = the payment reference, `campaign_id`
  - `created_by null`
  - `description` "Payment for campaign #N" or "Account top-up"
- Write the paid `Invoice` (spec §5.6).
- Update the payment: `status success`, `channel`, `provider_fee_kes = fromSubunit(fees)`, `paid_at`, `provider_tx_id`, `raw_event` (without `authorization` and `customer`), `wallet_transaction_id`.
- If the payment has a campaign that's still in `EDITABLE_STATUSES`, call `fundFromBalance`.

After commit (Task 3A functions), only on the run that changed the row:
- `success`: call `notifyPaymentReceived` (A1/A2). If the campaign was funded, then call `submitCampaign(campaignId, { userId: payment.created_by })`, which sends the existing submitted notices and O1. Otherwise, if there's a campaign, call `notifyPaymentNotApplied` (A3).
- `failed` or `abandoned`: call `notifyPaymentFailed` (A4).
- `amount_mismatch`: call `notifyPaymentMismatch` (A5 + O2).
- The O1 body in `submitCampaign` gains `· Funded KES {budget}` when `funded_at` is set.

- [ ] **Step 1:** Failing tests. Mock `verifyTransaction`; use a real DB.
  - `settles a successful payment once`: one ledger row `top_up` +37,999.50, one invoice `paid` with `tax_kes 0`, `funded_at` set, campaign `submitted`.
  - `is idempotent under concurrency`: `Promise.all([settlePayment(r), settlePayment(r)])` gives exactly one ledger row, and the results are `["settled","already_settled"]` in either order.
  - `rejects an amount mismatch`: verify returns 100 fewer cents, so status is `amount_mismatch`, there are no ledger rows, and the campaign is still `draft`.
  - `keeps credit when the balance moved`: another campaign is funded from the same balance before settlement, so the ledger row exists, the campaign stays `draft` and `funded_at` stays null.
  - `marks failed`: verify `status: "failed"` sets the payment to `failed`, and nothing else is written.
  - `unknown_reference` when there's no row.
  - `notifies once`: with `money-notify` mocked, two settles of the same reference call `notifyPaymentReceived` once, and an `amount_mismatch` calls `notifyPaymentMismatch` once.
  - `invoiceNumber(42, new Date("2026-11-08")) === "INV-2026-000042"`.
- [ ] **Step 2:** Run `npm test -w api -- lib/payments/settle-payment`. Expected: FAIL. **Step 3:** Implement.
- [ ] **Step 4:** Submit-route test, failing first:
  - unfunded campaign plus enough balance: 200, `funded_at` set, `submitted`.
  - unfunded campaign plus a short balance: **402** `{ error: "Payment required", dueKes }`.
  - already-funded campaign (a resubmit after changes requested): 200, with no balance check.
- [ ] **Step 5:** In the submit route, after the existing completeness checks:
  - If `!campaign.funded_at`, run a transaction that calls `fundFromBalance`. If it returns false, respond 402 with `dueKes` from `dueNowKes`.
  - Then `return NextResponse.json(toCampaignDto(await submitCampaign(id, { userId })))`.
- [ ] **Step 6:** Run both test files. Expected: PASS. Commit: `feat(api): settlePayment and balance-funded submission`.

### Task 5: Checkout, top-up and status endpoints

**Files:**
- Create: `apps/api/lib/payments/start-checkout.ts`
- Create: `apps/api/app/v1/customer/campaigns/[id]/checkout/route.ts` (POST)
- Create: `apps/api/app/v1/customer/payments/top-up/route.ts` (POST `{ amountKes }`)
- Create: `apps/api/app/v1/customer/payments/[reference]/route.ts` (GET)
- Modify: `apps/api/lib/route-catalog.ts` (register the routes, as the existing entries do)
- Test: one `route.test.ts` beside each route
- Docs: `docs/api/API.md` (the three routes)

**Interfaces:**
- Consumes: `initializeTransaction`, `settlePayment`, `availableKes`, `dueNowKes`.
- Produces:
```ts
export async function startCheckout(input: { orgId: number; campaignId: number | null; amountKes: number;
  userId: string; email: string }): Promise<{ authorizationUrl: string; reference: string; amountKes: number }>
  // reuses an `initiated` Payment (same org, campaign, amount, < 30 min old) before creating one
export async function refreshPayment(reference: string, orgId: number):
  Promise<{ status: PaymentStatus | "pending"; amountKes: number; campaignId: number | null; invoiceId: number | null } | null>
  // org-scoped; if initiated and created > 20 s ago → settlePayment(reference) first
```
- `POST checkout` (`campaigns:submit`):
  - 404 if the campaign isn't owned by the caller's org.
  - 409 if it isn't in `EDITABLE_STATUSES` or is already funded.
  - 400 with `missingFields` and `missingCreatives` if it's incomplete (reuse the same helpers as submit).
  - 409 `{ dueKes: 0 }` when the balance already covers it, so the client calls submit instead.
  - Otherwise 200 `{ authorizationUrl, reference, amountKes }`.
- `POST top-up` (`billing:write`): `amountKes` is an integer, 100 to 1,000,000, otherwise 400. Returns 200 with the same shape.
- `GET payments/:reference` (`billing:read` or `campaigns:submit`): 404 for another org's reference.
- Email for Paystack: `getCustomerEmail(userId)`. Metadata: `{ payment_reference, org_id, campaign_id }`. Channels: `["mobile_money","card"]`. `callback_url`: `${PAYSTACK_CALLBACK_URL}`.

- [ ] **Step 1:** Write failing route tests covering each status code listed above. Mock Paystack and auth the way `ops/finance/transactions/route.test.ts` does. Add `reuses an initiated payment within 30 minutes` (a second POST returns the same reference and calls `initializeTransaction` once), and `status poll settles after 20 s` (use fake timers).
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. *If Task 0 found no STK on hosted checkout:* add `chargeMpesa({ phone })` to `paystack.ts` (`POST /charge` with `mobile_money: { phone, provider: "mpesa" }`), and accept an optional `phone` on the checkout and top-up routes. When `phone` is present, charge M-Pesa directly and return `{ reference, displayText }` in place of `authorizationUrl`.
- [ ] **Step 4:** Run. Expected: PASS. Update API.md. Commit: `feat(api): Paystack checkout, top-up and payment status routes`.

### Task 6: Webhook route and the nightly finance cron

**Files:**
- Create: `apps/api/app/v1/payments/paystack/webhook/route.ts`
- Create: `apps/api/lib/payments/daily-spend.ts`
- Create: `apps/api/app/v1/cron/finance-daily/route.ts` (GET and POST, `CRON_SECRET` or ops user, copying `push-receipts/check/route.ts`)
- Modify: `apps/api/vercel.json`, adding `{ "path": "/v1/cron/finance-daily", "schedule": "30 21 * * *" }`, which is 00:30 Nairobi.
- Test: `webhook/route.test.ts`, `lib/payments/daily-spend.test.ts`

**Interfaces:**
- Consumes: `verifyWebhookSignature`, `settlePayment`; later tasks plug in `handleRefundEvent` (Task 8) and `handleTransferEvent` (Task 11).
- Produces:
```ts
export function dailySpendRows(c: { id: number; budgetKes: number; startsOn: string; endsOn: string; approvedOn: string },
  existing: Set<string>, yesterday: string): { reference: string; day: string; amountKes: number }[]
  // day ∈ [max(startsOn, approvedOn), min(endsOn, yesterday)], reference spend-c<id>-<day> not in existing;
  // amount = round2(budget / flightDays); the ends_on row = budget − round2(budget/flightDays) × (flightDays − 1)
export async function writeDailySpend(today?: Date): Promise<{ rows: number }>
export async function reconcileStalePayments(olderThanMinutes = 60): Promise<Record<SettleResult, number>>
```
- Webhook: read `await req.text()`, verify, then `JSON.parse`, then dispatch on `event`:
  - `charge.success` → `settlePayment(data.reference)`
  - `refund.*` → `handleRefundEvent(event, data)`
  - `transfer.*` → `handleTransferEvent(event, data)`
  - anything else → 200 `{ ignored: true }`
  - A bad signature returns 401. A handler throwing returns 500, so Paystack retries.
- Cron, in order:
  1. `reconcileStalePayments()`
  2. `writeDailySpend()`
  3. `releaseCompletedCredit()`
  4. `reconcileProcessingTransfers()` (Task 11; a no-op stub until then)
  5. `sendFinanceDigest()`

  It returns the summaries as JSON.
- `releaseCompletedCredit(today?: Date): Promise<{ notified: number }>`: for funded, approved campaigns whose `ends_on` is yesterday (Nairobi) and where budget − spent > 0, call `notifyCreditReleased({ reason: "completed" })` (A6). `ponytail:` keyed on "ended yesterday", so a skipped night skips that notice; the money is still correct.
- `sendFinanceDigest(): Promise<{ items: number }>`: counts `amount_mismatch` payments, payments still `initiated` after an hour, refunds that are `failed` or `needs_attention`, and payouts that are `failed` or `reversed`. If the total is above 0, call `alertOpsFinance({ title: "Finance: {n} items need attention", email: true })` (O7).
- The spend row has `kind "spend"`, `spend_category "screen_time"`, `provider "paystack"`, `occurred_at` = that day at 12:00 Nairobi, and `description` "Screen time: <campaign name>, <day>".

- [ ] **Step 1:** Failing tests:
  - Webhook: valid signature plus `charge.success` calls `settlePayment` with the reference and returns 200. A bad signature returns 401 and calls nothing. An unknown event returns 200 ignored.
  - `dailySpendRows` for a budget of 10,000 over 3 days (Nov 1–3), approved Nov 1, yesterday Nov 3: three rows of 3333.33, 3333.33 and 3333.34.
  - Approved Nov 2: two rows (Nov 2 and Nov 3); the Nov 1 share is never written.
  - Yesterday = Nov 1: one row.
  - Rows already present: skipped.
  - DB test: running `writeDailySpend` twice leaves the row count unchanged.
  - `releaseCompletedCredit`: a campaign that ended yesterday with 2,000 unspent calls `notifyCreditReleased` with `amountKes: 2000`. One that ended two days ago, or was fully spent, is not notified.
  - `sendFinanceDigest` with no items calls nothing; with one failed refund it calls `alertOpsFinance` with `email: true`.
- [ ] **Step 2:** Run. Expected: FAIL. **Step 3:** Implement. `writeDailySpend` selects approved campaigns with `funded_at`, a budget, and `starts_on ≤ yesterday`. It reads the existing `spend-c<id>-%` references, and `createMany` inserts with `skipDuplicates` (`reference` is unique). `approvedOn` is `reviewed_at` as a Nairobi day.
- [ ] **Step 4:** Run. Expected: PASS. Commit: `feat(api): Paystack webhook and nightly finance cron`.

### Task 7: Lifecycle rules (budget lock, release on reject or cancel)

**Files:**
- Modify: `apps/api/app/v1/customer/campaigns/[id]/route.ts` (PATCH rejects a `budget_kes` change with 409 `"Budget is locked once a campaign is funded"` when `funded_at` is set)
- Modify: `apps/api/app/v1/campaigns/[id]/review/route.ts` (when the decision is `rejected`, set `funded_at: null` in the same update)
- Modify: whichever ops route sets `status: "cancelled"` (`apps/api/app/v1/campaigns/route.ts`; grep `cancelled`), so it also sets `funded_at: null`
- Modify: `apps/api/lib/campaigns/campaign-dto.ts` (expose `fundedAt` and `isFunded`)
- Notifications: when a reject or cancel clears a non-null `funded_at`, call `notifyCreditReleased({ reason: "rejected" | "cancelled", amountKes: budget − spent })` (A6) after the existing decision notice. Add a test asserting that it fires on reject of a funded campaign and does not fire for an unfunded one.
- Test: the existing tests of these routes, plus new cases
- Docs: `docs/customer/APP.md` (funding, locked budget), `docs/ops/OPS-ADMIN.md` (the funded badge in review)

- [ ] **Step 1:** Failing tests:
  - PATCH with a budget on a funded `changes_requested` campaign returns 409. PATCH with dates on the same campaign returns 200.
  - Reject sets `funded_at` to null.
  - `changes_requested` keeps `funded_at`.
  - Un-approve to `rejected` sets `funded_at` to null.
- [ ] **Step 2–4:** Run (fail), implement, run (pass). Commit: `feat(api): lock budget once funded; release hold on reject and cancel`.

### Task 8: Refunds (ops-initiated, from a support request)

**Files:**
- Create: `apps/api/lib/payments/refunds.ts`
- Create: `apps/api/app/v1/ops/payments/refunds/route.ts` (POST `{ orgId, amountKes, reason }`, permission `finances`)
- Create: `apps/api/app/v1/customer/payments/refund-request/route.ts` (POST `{ amountKes, note? }`, `billing:write`). It creates a `billing` support case titled `Refund request: KES <amount>` through the existing support-case creation helper in `apps/api/lib/support/`. The amount must be ≤ `availableKes`.
- Modify: the webhook dispatch (Task 6) to call `handleRefundEvent`
- Modify: `apps/api/app/v1/ops/finance/transactions/route.ts`, accepting `kind: "cash_refund"` (amount stored negative, `provider "manual"`). A recorded `top_up` calls `notifyManualTopUp` (A7).
- Notifications:
  - The refund-request route calls `alertOpsFinance({ title: "Refund requested: KES {amount}, {org}" })` (O3).
  - `refundCredit` calls `notifyRefundUpdate({ stage: "sent" })` (A8) once per request, not once per slice.
  - `handleRefundEvent` sends `processed` → A9, and `failed` or `needs-attention` → A10 + O4, each only on a status change.
  - `method` comes from the refunded payment's `channel`: `mobile_money` → `mpesa`, `card` → `card`, otherwise `other`.
- Test: `lib/payments/refunds.test.ts`, the route tests

**Interfaces (Produces):**
```ts
export function allocateRefund(amountKes: number, payments: { id: number; reference: string; amountKes: number; refundedKes: number; paidAt: Date }[]):
  { paymentId: number; reference: string; amountKes: number }[]   // newest first; throws RangeError if total refundable < amount
export async function refundCredit(input: { orgId: number; amountKes: number; reason: string; opsEmail: string }): Promise<{ refundIds: number[] }>
  // tx: lockOrg, availableKes ≥ amount else throw; allocate; per slice: Refund(pending) + cash_refund ledger row (−slice, provider paystack,
  // reference adm-refund-<id>); after commit: createRefund per slice → store provider_refund_id/status
export async function handleRefundEvent(event: string, data: { id: number; status: string; transaction_reference?: string }): Promise<void>
  // processed → status processed; failed → status failed + adjustment (+slice, reference adm-refund-<id>-reversal) + ops alert;
  // needs-attention → needs_attention + ops alert
```
- [ ] **Step 1:** Failing tests:
  - `allocateRefund(30000, [p1 20000 refunded 0 (older), p2 15000 refunded 5000 (newer)])` returns `[{p2, 10000}, {p1, 20000}]`.
  - A total refundable of less than the amount throws `RangeError`.
  - DB: `refundCredit` for more than available throws, and nothing is written.
  - A successful `refundCredit` writes `cash_refund` rows that drop the balance immediately.
  - `refund.failed` writes the reversal, and the balance is restored.
  - The same `refund.failed` delivered twice writes one reversal (unique reference).
  - The ops route without `finances` returns 403.
- [ ] **Step 2–4:** Run (fail), implement, run (pass). Commit: `feat(api): refund unused credit to the original payment`.

### Task 9: Customer-web payment UI

**Files:**
- Modify: `apps/customer-web/components/campaigns/campaign-wizard.tsx` (review step ~L555–620)
- Modify: `apps/customer-web/lib/use-campaigns.ts` (add `useCheckoutCampaign()`; `useSubmitCampaign` surfaces a 402 `dueKes`)
- Create: `apps/customer-web/lib/use-payments.ts` (`useTopUp()`, `usePaymentStatus(reference)` polling every 3 s until terminal, max 5 min; `useRequestRefund()`)
- Create: `apps/customer-web/app/(shell)/billing/payment-return/page.tsx`
- Modify: `apps/customer-web/components/billing/billing-view.tsx` (replace `TopUpNoticeDialog` with a `TopUpDialog`: amount input, then `startCheckout`, then `window.location.assign(authorizationUrl)`; add a `RefundRequestDialog`)
- Modify: `apps/customer-web/components/billing/billing-panels.tsx` and `billing-overview-tab.tsx` (copy; a "Request refund" action shown when available > 0 and the user has `billing:write`)
- Modify: transactions-tab label for `cash_refund` ("Refund to payer")
- Modify: the campaign detail page header (a Funded / Not funded `StatusPill`)
- Docs: `docs/customer/APP.md` (billing row: top-up real, refund request, return page; remove "no payment provider yet (Pesapal planned)")

Exact copy:
- Review step, due > 0: button **"Pay KES {due} and submit"**, with the subtext "Paid by M-Pesa or card through Paystack. M-Pesa is limited per transaction by Safaricom; use a card for larger amounts."
- Review step, due = 0: button **"Submit (KES {budget} from your balance)"**.
- Return page: pending **"Confirming your payment…"**; success **"Payment received"** plus links "View receipt" and "Back to campaign"; failed or abandoned **"Payment didn't go through"** plus a "Try again" button that re-runs checkout.

- [ ] **Step 1:** Component tests, if customer-web has a Vitest + Testing Library setup (check `apps/customer-web/package.json`); otherwise skip to Step 2.
  - The review step renders "Pay KES 37,999.50 and submit" when the summary shows available 12,000.50 against a budget of 50,000.
  - It renders the from-balance button when available ≥ budget.
- [ ] **Step 2:** Implement. Get the available figure from the existing finance summary query (`availableKes`). The server is still the authority (402 / 409 `dueKes`).
- [ ] **Step 3:** `npm run typecheck -w customer-web && npm run lint -w customer-web`. Expected: clean.
- [ ] **Step 4:** Run `/run` (the run skill) against customer-web with Paystack test keys and complete one M-Pesa test payment end to end. Confirm: the campaign moves to `submitted`, Transactions shows the top-up, and Invoices shows a `paid` INV row.
- [ ] **Step 5:** Commit: `feat(customer-web): pay at submission, top-up and refund requests`.

### Task 10: Customer-mobile and ops collection UI

**Files:**
- Modify: `apps/customer-mobile/lib/campaigns-client.ts` (`checkoutCampaign(id)`, `getPaymentStatus(ref)`; `submitCampaign` surfaces a 402 `dueKes`)
- Modify: `apps/customer-mobile/app/(tabs)/campaigns/[id].tsx` (Pay and submit: `WebBrowser.openBrowserAsync(authorizationUrl)`, then on close poll status every 3 s, up to 2 min)
- Modify: `apps/customer-mobile/app/(tabs)/settings/billing.tsx` and `components/wallet/wallet-preview-card.tsx` (top-up through the same flow; `cash_refund` label)
- Modify: `apps/ops/lib/queries/finance.ts`:
  - New `queryPaymentsNeedingAttention()`
  - `netMargin` subtracts `SUM(payments.provider_fee_kes)` over the range
  - Payouts join `driver_profiles` (`COALESCE(dp.full_name, d.name)`)
- Modify: `apps/ops/components/finances/overview-tab.tsx:106-107`:
  - Replace the two `ComingSoonDialog`s with a `RefundDialog` (org picker, amount ≤ available, reason; calls `POST /v1/ops/payments/refunds`) and a "New payout run" link to the payouts tab (built in Task 12).
  - Add the needs-attention card and a "Paystack balance" stat (via a new `GET /v1/ops/payments/balance` route calling `getKesBalance`, permission `finances`).
- Modify: `apps/ops/components/finances/record-transaction-dialog.tsx` (the `cash_refund` kind)
- Modify: `apps/ops/app/(dashboard)/campaigns/[id]/campaign-detail-view.tsx` (the Funded pill and amount next to the review buttons)
- Docs: `docs/ops/OPS-ADMIN.md` (Finances: refund, balance, needs attention); `docs/customer/APP.md` mobile section

- [ ] **Step 1:** Write a failing API test for `GET /v1/ops/payments/balance`: 403 without `finances`, and 200 `{ balanceKes }` with `getKesBalance` mocked.
- [ ] **Step 2:** Implement everything above. **Step 3:** Run `npm run typecheck -w ops -w customer-mobile` and `npm test -w api -- ops/payments`. Expected: clean, PASS.
- [ ] **Step 4:** Make one manual test-mode payment from the customer-mobile dev build. Commit: `feat(ops,customer-mobile): payment UI, refunds and payment health`.

---

## Phase 2 — Driver payouts

### Task 11: Recipients, payout runs, disbursement and transfer approval

**Files:**
- Create: `apps/api/lib/payments/payouts.ts`
- Create: `apps/api/app/v1/ops/payouts/route.ts` (GET for a month; POST `{ periodMonth: "YYYY-MM", items: [{ driverProfileId, amountKes }] }` upserts `pending` rows, permission `finances`)
- Create: `apps/api/app/v1/ops/payouts/disburse/route.ts` (POST `{ payoutIds }`, permission `payouts`)
- Create: `apps/api/app/v1/ops/payouts/[id]/retry/route.ts` (POST, permission `payouts`)
- Create: `apps/api/app/v1/payments/paystack/transfer-approval/route.ts` (POST). Paystack's docs don't say whether approval requests are signed. Check `x-paystack-signature` when the header is present, and record what arrives in the Task 0 spike. The reference-and-amount match in `approveTransfer` is the real control either way.
- Create: `apps/api/app/v1/driver/payout-banks/route.ts` (GET; `listKesBanks()` cached 24 h with `unstable_cache`)
- Modify: `apps/api/lib/driver/driver-profile-store.ts` and the driver-profile PATCH route, so that changing any `payout_*` field clears `paystack_recipient_code` and that `payout_bank_code` is accepted
- Modify: the webhook dispatch → `handleTransferEvent`; the cron → `reconcileProcessingTransfers`
- Test: `lib/payments/payouts.test.ts` and the route tests
- Docs: `docs/ops/OPS-ADMIN.md` (payout runs, Disburse, retry), `docs/driver/` profile doc (bank picker)

**Interfaces (Produces):**
```ts
export function transferReference(payoutId: number, periodMonth: Date): string        // "adm-payout-42-202611"
export function estimateTransferFeeKes(method: "mpesa" | "bank", amountKes: number): number
  // mpesa: ≤1500 → 20, ≤20000 → 40, else 60; bank: ≤10000 → 80, ≤50000 → 120, else 140
export async function ensureRecipient(profile: DriverProfile): Promise<string>        // creates + stores paystack_recipient_code if null
export async function disburse(payoutIds: number[], opsEmail: string):
  Promise<{ queued: number; skipped: { id: number; reason: string }[] }>
  // rows must be pending|failed (retry); balance check: getKesBalance() ≥ Σ amount + Σ estimateTransferFeeKes, else throw InsufficientBalanceError;
  // status → processing BEFORE calling Paystack; chunks of 100, ≥5 s apart; per-item Paystack error → back to failed with reason
export async function approveTransfer(body: { reference?: string; amount?: number }): Promise<boolean>
  // true iff a Payout with that reference is processing and toSubunit(amount_kes) === amount; one indexed query, no Paystack call
export async function handleTransferEvent(event: string, data: { reference: string; transfer_code?: string; fee_charged?: number; reason?: string }): Promise<void>
  // success → settled, paid_at, fee_kes, transfer_code; failed/reversed → failed|reversed + failure_reason; driver notification either way
export async function reconcileProcessingTransfers(olderThanHours = 24): Promise<{ checked: number }>
```
- Disburse returns 402 `{ error: "Paystack balance too low", balanceKes, requiredKes }` on `InsufficientBalanceError`.
- Notifications (Task 3A):
  - `handleTransferEvent` sends success → `notifyPayoutUpdate({ stage: "settled" })` (D1), and failed or reversed → D2 plus `alertOpsFinance` (O5), only on a status change.
  - `approveTransfer` returning false makes the route call `alertOpsFinance({ title: "Blocked an unknown Paystack transfer (…)", email: true })` (O6) after responding 400. Use `after()` from `next/server` so the alert can't delay the response.
  - The driver-profile PATCH calls `notifyPayoutDetailsChanged` (D3) when any `payout_*` value actually changes.

- [ ] **Step 1:** Failing tests:
  - `transferReference(42, new Date("2026-11-01")) === "adm-payout-42-202611"`, and it is 16–50 characters.
  - `estimateTransferFeeKes("mpesa", 1500) === 20`, `("mpesa", 1501) === 40`, `("mpesa", 20001) === 60` and `("bank", 50001) === 140`.
  - `approveTransfer` returns false for an unknown reference, false for a matching reference with amount + 1, false for a `pending` (not yet processing) row, and true for an exact match.
  - Disburse with the balance short by KES 1 returns 402, and no row changes.
  - Disburse with 150 items calls `bulkTransfer` twice (100 + 50). Use fake timers.
  - `transfer.success` settles the row and notifies once. Delivered twice, it's still settled, with no second notification.
  - Retry on a `failed` row reuses the same reference.
  - A denied transfer approval responds 400 and schedules O6. A changed `payout_mpesa_msisdn` calls `notifyPayoutDetailsChanged` once; a PATCH with identical values doesn't call it.
  - Disburse without the `payouts` permission returns 403.
- [ ] **Step 2–4:** Run (fail), implement, run (pass). Commit: `feat(api): automated driver payouts through Paystack Transfers`.

### Task 12: Ops payouts UI

**Files:**
- Modify: `apps/ops/components/finances/payouts-tab.tsx`. Add a "New payout run" sheet with:
  - a month picker
  - a table of approved driver profiles with payout details (name, method, masked destination, amount input)
  - Save as pending
  - a list of rows by status, with a Disburse button for selected pending rows (visible only with the `payouts` permission)
  - a confirmation dialog (count, total, estimated fees, live Paystack balance, and the button "Send KES {total} to {n} drivers")
  - Retry on failed rows
- Modify: `apps/ops/lib/queries/finance.ts` (`PayoutRowDto` gains `method`, `destinationMasked`, `failureReason`, `provider`)
- Modify: the ops team/roles UI that lists `OPS_PERMISSIONS` labels (add "Payouts: send driver payouts")
- Docs: `docs/ops/OPS-ADMIN.md`

- [ ] **Step 1:** Implement. **Step 2:** `npm run typecheck -w ops && npm run lint -w ops`. Expected: clean.
- [ ] **Step 3:** Use `/run` to drive ops: create a run of two test drivers, disburse in test mode, and check both rows reach `settled` once webhooks land (or after triggering the cron route manually). Commit: `feat(ops): payout runs with one-press disbursement`.

### Task 13: Driver earnings screens on real payout data

**Files:**
- Create: `apps/api/app/v1/driver/payouts/route.ts` (GET; the caller's own `DriverProfile` payouts, newest first, plus `summary: { lastPayout, paidThisYearKes, pendingKes }`)
- Modify: `apps/driver-mobile/app/(tabs)/earnings.tsx`, `apps/driver-mobile/app/(tabs)/index.tsx`
- Modify: `apps/driver-web/components/overview/earnings-view.tsx`, `apps/driver-web/components/overview/dashboard-view.tsx`
- Modify: `apps/driver-mobile/lib/placeholder-data.ts` and `apps/driver-web/lib/placeholder-data.ts` (delete `EARNINGS_STATS` and `DAILY_EARNINGS`; trim finance entries from `RECENT_ACTIVITY` and leave non-finance entries for their own future work)
- Test: `apps/api/app/v1/driver/payouts/route.test.ts`
- Docs: `docs/driver/` app doc (earnings now real; which stats were removed and why); `docs/shared/FEATURE-INVENTORY.md` §1 driver rows

- [ ] **Step 1:** Failing route test: a driver sees only their own payouts, and the `summary` totals match the seeded rows.
- [ ] **Step 2:** Implement the route and the screens. The earnings screens show last payout, paid this year, pending, and a monthly history list or bar chart (reuse the existing chart components). Stats with no source (hours, km, per-day) are removed, not zeroed.
- [ ] **Step 3:** `npm test -w api -- driver/payouts`; `npm run typecheck -w driver-web -w driver-mobile`. Expected: PASS, clean.
- [ ] **Step 4:** `grep -rn "EARNINGS_STATS\|DAILY_EARNINGS" apps` returns nothing. Commit: `feat(driver): earnings screens show real payouts`.

---

## Phase 3 — Close-out

### Task 14: Remaining docs, seed, graph

**Files:**
- Modify: `docs/shared/ROADMAP.md`:
  - L61 payments row: Paystack
  - L84: Paystack writes `provider = 'paystack'`
  - L98 payouts row: Paystack Transfers, Daraja B2C only as fallback
  - L140 payments paragraph: rewrite to spec §2/§9
  - L144 and L157: rewrite
- Modify: `docs/shared/FEATURE-INVENTORY.md` (L107 billing row, L366 and L377 payment rows → built, L404 gap list)
- Modify: `apps/api/scripts/seed-demo-data.ts` (seed one demo `Payment` per demo top-up so the ops payments list isn't empty in dev; `is_demo` stays the guard. Never runs on prod.)
- Append: dated addendum to `docs/superpowers/specs/2026-11-07-paystack-payments-design.md` noting anything that shipped differently.

- [ ] **Step 1:** Make the edits. **Step 2:** `npm run seed:demo -w api` on dev only, then open ops Finances and customer Billing and confirm nothing reads placeholder data: `grep -rn "placeholder-data" apps/*/components/billing apps/ops/components/finances apps/driver-*/` must find no finance usage.
- [ ] **Step 3:** `graphify update .` Commit: `docs: Paystack replaces Pesapal across roadmap and inventory`.

### Go-live checklist (human)
1. Run the prod migration (Task 1) before merging.
2. Put live keys in Infisical prod. Set the live webhook URL and transfer approval URL in the Paystack dashboard.
3. Confirm Manual Payouts and OTP-off on live.
4. Make one live KES 10 payment and refund it. Make one live KES 10 transfer to an ops phone.
5. Watch the first nightly cron run in Vercel logs.
