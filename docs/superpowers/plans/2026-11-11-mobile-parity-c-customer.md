# Plan C: customer-mobile parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** customer-mobile does what customer-web does: the overview, campaign progress, reports, campaign report, Finance & Billing, the Media Manager, and the remaining settings.

**Architecture:** No new API work: every endpoint exists (`/v1/customer/reports/*`, `/finance/*`, `/payments/*`, `/media/*`). The pure helpers customer-web keeps in `components/{reports,campaigns,billing}/*.ts` move into `@workspace/ops-contracts` with tests, so both apps word things identically. customer-mobile gets API clients and hooks matching customer-web's `lib/analytics-client.ts`, `lib/use-analytics.ts`, `lib/media-client.ts`, `lib/use-payments.ts`, and screens built from Plan A primitives.

**Tech Stack:** Expo / expo-router, TanStack Query (persisted), `@workspace/mobile-charts`, `expo-file-system` + `expo-sharing` (installed), `expo-image-picker` (installed), `expo-web-browser` (installed).

**Spec:** [2026-11-11-mobile-parity-overview.md](./2026-11-11-mobile-parity-overview.md) (customer-mobile gap table)

## Global Constraints

- Everything in the overview's Global Constraints section applies. Plan A must be merged first.
- **Permissions:** read through `useOrgPermissions()` + `orgCan()` (`apps/customer-mobile/lib/use-org.ts`), never inferred from a failed request. Without `billing:read`: no finance request is made, money figures show a dash or are absent, the Spend tab is hidden. Without `reports:read`: no report request, impressions / delivery / health are absent. Without `media:read`: no Media entry.
- Wording is customer-web's, including the takeaway sentences, "Ask your account owner for billing access.", the funding headlines from `fundingCopy`, funding statuses Healthy / Running low / Short of funds, quick amounts ("Covers the shortfall", "Covers the next charge", 5,000 / 10,000 / 25,000 / 50,000).
- Impressions always show their low-to-high range; reach only with one campaign selected; a `null` total is a dash, never 0 (API.md § Reports).
- The Wallet screen (`app/(tabs)/settings/billing.tsx`) is replaced by Finance & Billing; `useWallet()` stays for the Overview hero.

## Review Focus

- **Org with no ledger rows** (`funding.level: "untracked"`): Billing must say "Top up to start running campaigns", never a "Short of funds" alert. Pinned in Task 1 by the `fundingCopy` untracked test.
- **Viewer without `billing:read` on Reports**: the Spend tab is hidden and no `/reports/spend` request fires (it would be 403). Checked in Task 4 manually with a Member role on staging.
- **Payment browser closed before Paystack finishes**: polling continues and the receipt appears when settled; after 2 minutes still pending, the screen says it's still confirming and offers to check again, never "failed". Task 6.
- **Deleting a media file in use**: the 409 names the campaigns (`issues.campaigns`) and the screen lists them. Task 7.
- **Flight boundaries**: today = start day reads "Day 1 of N"; the day after the end reads "Ended yesterday". Pinned in Task 1.

---

### Task 1: Move customer-web's pure helpers into `@workspace/ops-contracts`

**Files:**
- Move: `apps/customer-web/components/reports/takeaways.ts` → `packages/ops-contracts/src/report-takeaways.ts`; `components/reports/format.ts` → `src/report-format.ts`; `components/campaigns/flight.ts` → `src/campaign-flight.ts`; `components/billing/format.ts` → `src/billing-format.ts` (each re-typed against `StatusTone` from `@workspace/ops-contracts` instead of `@workspace/ui`)
- Move: the private `fundingCopy` and `runOutDate` from `apps/customer-web/components/billing/billing-panels.tsx` into `packages/ops-contracts/src/billing-format.ts` as exported `fundingCopy(summary: FinanceSummaryDto, now: Date = new Date()): { headline: string; detail: string }` (`runOutDate` takes `now` so tests are stable). Funding levels are the existing `FundingLevel` (`untracked | healthy | low | short`, `health.ts`); don't add new ones
- Modify: every customer-web import of the moved files; `packages/ops-contracts/src/index.ts`
- Test: `packages/ops-contracts/src/{report-takeaways,campaign-flight,billing-format}.test.ts`

**Interfaces:**
- Produces (names unchanged from the web files): `pct, shortDay, leader, peak, low, sum, average, topCell, versus`; `HEALTH_LABEL, HEALTH_TONE, PHASE_LABEL, NO_DELIVERY_MESSAGE, NO_MATCH_MESSAGE, compactOrDash, rangeText, percentOrDash, rateTone, pacingBars`; `FORMAT_LABELS, Flight, flightOf, shortDate, shortTimestamp, flightRange, flightLabel`; `KIND_LABELS, INVOICE_STATUS, formatDate, signedKes, fundingCopy`.

- [ ] **Step 1: Write the failing tests**

```ts
expect(flightLabel(flightOf("2026-11-10", "2026-11-23", "2026-11-15"))).toBe("Day 6 of 14")
expect(flightLabel(flightOf("2026-11-10", "2026-11-23", "2026-11-10"))).toBe("Day 1 of 14")
expect(flightLabel(flightOf("2026-11-10", "2026-11-23", "2026-11-07"))).toBe("Starts in 3 days")
expect(flightLabel(flightOf("2026-11-10", "2026-11-23", "2026-11-09"))).toBe("Starts tomorrow")
expect(flightLabel(flightOf("2026-11-10", "2026-11-23", "2026-11-24"))).toBe("Ended yesterday")
expect(flightLabel(flightOf(null, "2026-11-23"))).toBe("Not scheduled")
expect(leader([])).toBeUndefined()
expect(leader([{ name: "A", value: 1 }, { name: "B", value: 3 }])).toEqual({ name: "B", value: 3, share: 0.75 })
expect(topCell([{ row: "CBD", column: "Evening", value: null }])).toBeUndefined()
expect(versus(101, 100)).toBe("about the same as the period before")
expect(versus(150, 100)).toBe("up 50% on the period before")
expect(versus(5, 0)).toBeUndefined()
const now = new Date("2026-11-11T09:00:00Z")
expect(fundingCopy(summary({ level: "untracked" }), now).headline).toBe("Top up to start running campaigns")
expect(fundingCopy(summary({ level: "short", availableKes: -400 }), now).headline).toBe(`Your active budgets need ${formatKes(400)} more than you have`)
expect(fundingCopy(summary({ level: "healthy", availableKes: 5000, runwayDays: null }), now).detail).toBe("There is no recent spending to project a run-out date from.")
expect(fundingCopy(summary({ level: "low", availableKes: 5000, runwayDays: 3 }), now).headline).toBe("Your funds run out around 14 Nov")
expect(fundingCopy(summary({ level: "healthy", availableKes: 5000, runwayDays: 33 }), now).headline).toBe("You're covered until about 14 Dec")
```
(`summary()` builds a minimal `FinanceSummaryDto` fixture with the given `funding` fields and `availableKes`.)

- [ ] **Step 2: Run** `npm test -w @workspace/ops-contracts`. Expected: FAIL (modules missing).
- [ ] **Step 3: Move the files and `fundingCopy`, update customer-web imports (`billing-panels.tsx` imports `fundingCopy`).**
- [ ] **Step 4: Run** `npm test -w @workspace/ops-contracts && npm run typecheck -w customer-web && npm run build -w customer-web`. Expected: PASS; customer-web Billing and Reports render as before on `localhost:3002`.
- [ ] **Step 5: Commit** `git commit -m "refactor: share customer report, flight, billing and funding wording via ops-contracts"`

### Task 2: API clients and hooks

**Files:**
- Create: `apps/customer-mobile/lib/analytics-client.ts`, `lib/use-analytics.ts`, `lib/media-client.ts`, `lib/use-media.ts`; Modify: `lib/payments.ts` (add `requestRefund`)
- Modify: `lib/query-client.ts` (bump `QUERY_CACHE_BUSTER`)

**Interfaces:**
- Produces, mirroring customer-web's names and signatures (same query keys `ANALYTICS_QUERY_KEY`, `MEDIA_QUERY_KEY`, `MEDIA_FOLDERS_QUERY_KEY`): `useFinanceSummary(range)`, `useTransactions(params)`, `useInvoices()`, `useStatements()`, `useReportOverview(params)`, `useReportDelivery(params)`, `useReportAudience(params)`, `useReportSpend(params)`, `useReportCampaigns(params)`, `useCampaignReport(id, params)`; `listMedia`, `uploadMedia(uri, mime, folderId?)`, `renameMedia`, `moveMedia`, `setMediaStar`, `deleteMedia`, `listMediaFolders`, `createMediaFolder`, `renameMediaFolder`, `deleteMediaFolder`; `useRequestRefund()`; and `useDownloadFile(kind: "pdf" | "csv")` generalising the existing `useDownloadPdf()` (CSV is checked for not starting with `{`).
- Every hook takes `enabled` from the permission it needs.

- [ ] **Step 1: Implement** against the existing `apps/customer-mobile/lib/api-client.ts` (bearer token).
- [ ] **Step 2: Verify** `npm run typecheck -w customer-mobile && npm run lint -w customer-mobile`.
- [ ] **Step 3: Commit** `git commit -m "feat(customer-mobile): reports, finance, media and refund clients"`

### Task 3: Overview and campaign progress

**Files:** Modify `apps/customer-mobile/app/(tabs)/index.tsx`, `app/(tabs)/campaigns/index.tsx`, `app/(tabs)/campaigns/[id].tsx`; create `components/overview/{kpi-section,trend-card,needs-attention,active-campaigns,upcoming-flights}.tsx`, `components/campaigns/flight-track.tsx`.

- [ ] **Step 1: Overview** like customer-web `components/overview/*`: `RangeToolbar`; KPI strip (live campaigns; available funds and spend with `billing:read`; est. impressions and delivery with `reports:read`); Spend / Impressions / Plays `TrendChart` with the previous period dashed; Needs attention (funding alert first, then campaigns whose health isn't on track); active campaign `ProgressCard`s; upcoming flights; recent activity (keep the existing inbox block). Remove the doc's "no impressions, delivery-rate or spend tiles" limitation: those endpoints exist now.
- [ ] **Step 2: Campaigns list:** `flightLabel` wording, `FlightTrack` progress line on approved cards, third figure by stage (delivery % with health when not on track, else Funded / Not funded, else a draft's last edit), Created by when the org has more than one member, filter chips with counts. Delivery from `useReportCampaigns({ range: "all" })` (same cached query the detail reads).
- [ ] **Step 3: Campaign detail:** Funded pill; stat cards Budget (funded date), Creative mix, Flight; **Flight progress** card on approved, dated campaigns (plays delivered, delivery rate, est. impressions, spend) with **Full report** opening Task 5's screen; submitted / approved dates.
- [ ] **Step 4: Verify** typecheck + lint; manual on staging with an Owner and a Member: figures match `app.staging.admobihq.com/` for the same range; the Member sees no money.
- [ ] **Step 5: Commit** `git commit -m "feat(customer-mobile): overview KPIs, trends, needs attention and flight progress"`

### Task 4: Reports

**Files:** Create `app/(tabs)/reports/{_layout,index}.tsx` (add a Reports tab, or a Settings → Reports row if the tab bar is full: follow customer-web's nav order), `components/reports/{report-filters,measurement-badge,how-we-estimate-sheet,overview-tab,delivery-tab,audience-tab,spend-tab,campaigns-tab,whats-working,health-ledger}.tsx`.

- [ ] **Step 1: Build the five tabs** with filters (campaign, market, format, time of day) in a bottom sheet, the Measurement badge opening "How we estimate" (copy from customer-web's sheet), takeaways from `report-takeaways`, impressions ranges. Heatmaps use `Heatmap`; market × daypart takeaway uses `topCell` exactly as web's campaign report does.
- [ ] **Step 2: CSV exports:** Delivery daily log (`export=csv`) and Campaigns table through `useDownloadFile("csv")` and the share sheet.
- [ ] **Step 3: Verify** typecheck + lint; manual: every tab's headline numbers match the web for the same range and filters; a Member without `billing:read` has no Spend tab and Network shows no `/reports/spend` call.
- [ ] **Step 4: Commit** `git commit -m "feat(customer-mobile): reports with filters, takeaways and CSV export"`

### Task 5: Campaign report

**Files:** Create `app/(tabs)/reports/campaign/[id].tsx`, `components/reports/campaign-report.tsx`.

- [ ] **Step 1: Build** the same sections as `components/reports/campaign-report-view.tsx` (delivery pacing, market × time of day with its takeaway, creatives, spend with `billing:read`), plus **Download PDF** (`/reports/campaigns/[id]/pdf`) through the share sheet.
- [ ] **Step 2: Verify** typecheck + lint; manual: the PDF opens and matches the web's.
- [ ] **Step 3: Commit** `git commit -m "feat(customer-mobile): campaign report and PDF"`

### Task 6: Finance & Billing (replaces Wallet)

**Files:** Replace `app/(tabs)/settings/billing.tsx` with `app/(tabs)/billing/{_layout,index,payment-return}.tsx` (Settings row and Overview hero link here); create `components/billing/{funding-statement,upcoming-charges,where-money-went,transactions-tab,invoices-tab,statements-tab,kes-amount-input,top-up-sheet,refund-sheet,receipt}.tsx`.

- [ ] **Step 1: Overview tab:** funding statement from `fundingCopy` with **Top up** and **Request refund** (when available > 0) beside it; balance, committed, spent with delta; Upcoming charges (planned total, next charge, next three campaigns); where the money went; shortcuts (statement PDF, transactions CSV, billing help); money in vs out (`StackedBars`); spend by campaign.
- [ ] **Step 2: Transactions** (filters by kind, search, sort, paging via `onEndReached`, CSV), **Invoices** (+ PDF), **Statements** (+ month PDF).
- [ ] **Step 3: `KesAmountInput`:** `KES` prefix, groups digits as typed, ignores commas, spaces and letters; whole shillings for top-up (100–1,000,000), two decimals for refund (≤ available, "over available" called out inline). Top-up sheet with the quick amounts and "available now / after top-up"; refund sheet posts `refund-request`.
- [ ] **Step 4: Payment return:** after checkout closes, poll `GET /payments/:reference` every 3 s for up to 5 minutes (the web's limit; raise mobile's current 2) with a "Confirming payment" state, then the receipt (date, reference, M-Pesa/card, invoice number, total) with **View invoice** and **Back to campaign** / **Go to billing**, or "Payment didn't go through" with Try again.
- [ ] **Step 5: Billing details** (invoice email + KRA PIN) on Team, `billing:read` to see, `billing:write` to edit, via `PATCH /v1/customer/org`.
- [ ] **Step 6: Verify** typecheck + lint; manual on staging with the Paystack test card: top up KES 100, see the receipt and the ledger row; request a KES 1 refund and see the support case. Ask for an advisor check before finishing.
- [ ] **Step 7: Commit** `git commit -m "feat(customer-mobile): Finance & Billing replaces Wallet"`

### Task 7: Media Manager

**Files:** Create `app/(tabs)/media/{_layout,index}.tsx` (`media:read`), `components/media/{media-grid,media-row,media-filter-sheet,folder-row,media-actions-sheet,upload-button}.tsx`; Modify `components/campaigns/creative-picker.tsx` (two sources: **Upload new** as today, **From library** opening a picker over `listMedia` and attaching with JSON `{ mediaAssetId, slot }`).

- [ ] **Step 1: Build** grid / list toggle, Filter & sort (All files / Starred / Images / Videos / Used / Unused; newest / name / size), folders that open in place (uploads land in the open folder), per-person stars, rename / move / delete in each file's actions sheet, thumbnails through the authenticated file proxy, video previews only on tap. Delete answering 409 lists the campaigns using the file.
- [ ] **Step 2: Wizard picks from the library;** a spec mismatch (400 `issues.specs`) is shown inline as on web.
- [ ] **Step 3: Verify** typecheck + lint; manual: upload a PNG into a folder, star it, attach it to a draft campaign from the library, try deleting it (blocked, names the campaign).
- [ ] **Step 4: Commit** `git commit -m "feat(customer-mobile): Media Manager and pick creatives from the library"`

### Task 8: Remaining settings and Deliveries

**Files:** Create `app/(tabs)/settings/tour.tsx` (replays onboarding, mirrors `settings/tour`); Deliveries screens behind the `deliveries` flag (`lib/flags.ts` like driver-mobile's), mirroring `customer-web/lib/deliveries.ts` placeholder content and tagging sample rows.

- [ ] **Step 1: Implement; verify** typecheck + lint; manual: flipping the flag in ops shows/hides Deliveries after the app returns to the foreground.
- [ ] **Step 2: Commit** `git commit -m "feat(customer-mobile): tour replay and flag-gated deliveries"`

### Task 9: Docs

- [ ] Rewrite `docs/customer/APP-MOBILE.md` § Overview / Wallet / Campaigns to describe the new screens (drop the "no impressions or spend tiles" line and the "Refund requests are made on the web" line), add Reports, Billing, Media sections. Commit `docs: customer-mobile parity`.
