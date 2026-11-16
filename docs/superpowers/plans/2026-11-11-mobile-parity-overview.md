# Mobile parity: overview and gap inventory (2026-11-11)

The three Expo apps should do what their web twins do today. Same functionality, native implementation: layouts, gestures and components can differ, the capability may not. This document is the spec the four plans implement. Read it before any of them.

| Plan | File | Depends on |
|---|---|---|
| A. Shared mobile foundations | [2026-11-11-mobile-parity-a-foundations.md](./2026-11-11-mobile-parity-a-foundations.md) | — |
| B. ops-mobile ← ops | [2026-11-11-mobile-parity-b-ops.md](./2026-11-11-mobile-parity-b-ops.md) | A |
| C. customer-mobile ← customer-web | [2026-11-11-mobile-parity-c-customer.md](./2026-11-11-mobile-parity-c-customer.md) | A |
| D. driver-mobile ← driver-web | [2026-11-11-mobile-parity-d-driver.md](./2026-11-11-mobile-parity-d-driver.md) | A |

**Order: A, then B, C, D.** Ops first because ops-mobile's Finances screen shows invented numbers to staff today (a hardcoded `TRANSACTIONS` array in `apps/ops-mobile/app/(ops)/finances.tsx`), which is worse than a missing screen. Customer second (reports and billing are what advertisers pay for). Driver last (most of its new web screens show sample data until telemetry exists). B, C and D are independent of each other once A lands.

## Parity rule (applies to every task)

1. **Same capability, same data, same permissions.** A screen shows the same figures from the same endpoint, hides the same things for the same missing permission, and offers the same actions.
2. **Web-only mechanics get the native equivalent:** browser download → OS share sheet; `window.print()` → share a PDF; hover tooltip → tap to reveal; wide table → list rows with the key columns, detail on tap; URL query state (`?tab=&range=`) → screen state (deep-linkable through expo-router params where web links to it).
3. **Logic is shared, not re-written.** Pure logic a web app owns (formatters, takeaways, period maths, sample data) moves into `@workspace/ops-contracts` with vitest tests, and both apps import it. Database reads the ops web server owns move into `@workspace/ops-queries` (Plan B) so the API can serve them.
4. **Honesty rules carry over.** A figure with no data behind it is a dash, never an invented number. Sample figures carry a "Sample" tag (driver). Money is hidden without the money permission, by the API as well as the screen.

## Gap inventory

What each web app has that its mobile twin lacks, as of `feat/paystack-payments` @ 040ae3e0. "Have" lists what already reaches parity and needs no work.

### ops-mobile ← ops (Plan B)

Have: dashboard (stats), activity, advertiser orgs, announcements (list/compose/delete), campaigns review (single), driver applications review (single), leads/fleet/drivers/waitlist/media-kit CRUD, SOS review, support, team + roles, platform flags (in Profile), content overview, map.

| Missing | Web source | Blocker |
|---|---|---|
| **Finances**, real: Overview (Paystack balance, needs attention, margin), Ledger (+ record transaction), Wallets, Payouts (run, save, disburse, retry), Tool costs; Refund | `app/(dashboard)/finances`, `components/finances/*`, `lib/queries/finance.ts` | Overview/ledger/wallets/payouts/attention/record-options are read by the ops server straight from Postgres: **no API endpoint exists** |
| Unseen-payments badge on Finances; Ledger opening stamps them seen | `app/(dashboard)/layout.tsx`, `markPaymentsSeen()` | same: no endpoint |
| Dashboards: Campaigns (pipeline/delivery/inventory), Fleet, Advertisers, Support | `app/(dashboard)/dashboards/*`, `lib/queries/*-analytics.ts` | same: no endpoint |
| Notifications attention queue (header bell) | `app/(dashboard)/notifications`, `lib/queries/action-queue.ts` | same; mobile's `notifications.tsx` is only a push-style preview |
| Users (customers / admins) | `app/(dashboard)/users` | none (`GET /v1/users`) |
| Bulk review (campaigns, driver applications) | list pages' selection bar | none (`bulkReview` in the client) |
| List exports (CSV / PDF) | `lib/table-export.ts` | none (`toCsv`, `POST /v1/ops/documents/export`) |
| SOS photos, call / WhatsApp / Maps links | `sos/[id]` | none (`photoFileUrl` proxy) |
| Campaign review **Funded** / **Not funded** with held amount | campaign detail | none |
| Announcements: merge tags, live preview, 65/178 counts, detail view with delivery bar, Resend | `announcements/*` | none (`renderAnnouncementTemplate` in contracts) |
| Settings → Integrations ledger | `settings/(prefs)/integrations` | ops server actions over Prisma: **no API endpoint** |
| Map: simulated demo fleet (vehicles, campaigns tab, needs attention) | `components/maps/demo-fleet/*` | sim lives in `apps/ops` |

### customer-mobile ← customer-web (Plan C)

Have: campaigns list/detail/wizard (with budget estimator, Paystack pay-at-submit), calendar, proof-of-play and statement PDFs, map, merged inbox + push, team/roles/activity/account/invitations, support, wallet (balance, top-up).

| Missing | Web source |
|---|---|
| Overview parity: KPI strip from finance + reports, spend/impressions/plays trend vs previous period, **Needs attention** (funding alert + unhealthy campaigns), active campaign progress, upcoming flights | `components/overview/*` |
| Campaigns: "Day 6 of 14" flight wording + progress line, delivery % / health, Funded pill, detail **Flight progress** card with Full report link, Created by | `components/campaigns/flight.ts`, campaign pages |
| **Reports**: Overview / Delivery / Audience / Spend / Campaigns tabs, range + filters (campaign, market, format, time of day), Measurement badge + "How we estimate", takeaways, CSV exports | `components/reports/*`, `lib/analytics-client.ts` |
| **Campaign report** screen + PDF | `reports/campaign-report-view.tsx` |
| **Finance & Billing** (replaces Wallet): funding statement, upcoming charges, where the money went, transactions (filters, sort, paging, CSV), invoices (+PDF), statements (+PDF), refund request, KES amount input with quick amounts, payment receipt | `components/billing/*` |
| **Media Manager**: grid/list, filter/sort, folders, stars, rename/move/delete, upload; wizard picks a creative from the library | `app/(shell)/media`, `lib/media-client.ts`, `lib/use-media.ts` |
| Billing details (invoice email + KRA PIN) on Team | team settings |
| Tour replay; Deliveries (flag-gated placeholder) | `settings/tour`, `deliveries/*` |

### driver-mobile ← driver-web (Plan D)

Have: profile setup wizard, payouts list, earnings (payout hero), routes map, SOS (FAB + flow), support, settings, notifications, deliveries (flag-gated).

| Missing | Web source |
|---|---|
| **Home dashboard**: range toolbar, payout AlertStrip, screen-on hero + KPIs (ads shown, distance, days worked, hours a day), screen time by day chart, Latest payout card (stage bar, masked destination), Top areas, Best times to drive, Updates | `components/overview/dashboard-view.tsx`, `latest-payout-card.tsx`, `lib/sample-data.ts` |
| **Earnings**: KPI strip, payouts by month (stacked), payout history with All / Paid / On its way / Problems filters + CSV | `components/overview/earnings-view.tsx` |
| **Reports**: This/Last week, This/Last month; hours KPIs, Your hours card, Pay card, Day by day table; CSV + PDF | `components/reports/reports-view.tsx` |
| Routes rail ranked by screen-on hours (Sample) | `components/maps/driver-routes-view.tsx` |
| Settings split: profile, account, preferences, tour | `components/settings/*` |

## Decisions (made here so no task re-opens them)

- **`@workspace/ops-queries` (new package)** holds the SQL the ops web server runs today for finance, the four dashboards and the action queue. Functions take a `Db` (`{ query }`, which a `pg` Pool satisfies) as the first argument. Ops web keeps its `unstable_cache` wrappers and its behaviour; the API gets `/v1/ops/*` read endpoints over the same functions. Copying the SQL into the API instead is ruled out: `apps/api/lib/queries/stats.ts` is such a copy and has already drifted from `apps/ops/lib/queries/stats.ts` (one filters by range, the other by `deleted_at`). That drift is out of scope here; note it, don't fix it in passing.
- **`@workspace/mobile-charts` (new package, Plan A)** holds theme-agnostic chart and dashboard primitives for all three apps. Colours come in through a `ChartPalette` prop; each app maps its own theme to it. `packages/mobile-ui` is an empty leftover folder: delete it in Plan A.
- **No new native modules except one.** Everything ships as an OTA update except the driver Reports PDF, which needs `expo-print` (a native module): that step is isolated (Plan D, Task 5) and needs a new EAS build. Ask before adding it.
- **Integrations CRUD on mobile** goes through new admin-only API endpoints that run the same validation as the ops server actions (Plan B, Task 10). The ops web server actions stay as they are.
- **Demo fleet map** is the lowest-value item (simulated data) and is the last task of Plan B. It's skippable without affecting anything else.

## Global constraints (every plan, every task)

- Expo SDK and libraries already installed; no new dependency without saying why in the commit. Allowed already-installed tools: `react-native-svg` 15.12.1, `@tanstack/react-query` 5, `expo-file-system`, `expo-sharing` (customer, ops), `expo-web-browser` (customer), `react-native-reanimated` 4. Adding `expo-sharing` / `expo-file-system` to driver-mobile is allowed (they are Expo SDK packages, but they still need a native build: say so in the commit).
- **Persisted query cache:** every mobile `queryFn` must return JSON-safe data (no `Date`, no functions): see `docs/driver/DRIVER-APP.md` § Persisted query cache. Bump `QUERY_CACHE_BUSTER` in the app's `lib/query-client.ts` whenever a cached shape changes.
- Money is formatted with `formatKes` from `@workspace/ops-contracts`; Nairobi days with `nairobiDay`; ranges with `DATE_RANGE_KEYS` / `resolveReportRange`.
- Copy follows the web wording exactly where the web has it (button labels, empty states, the takeaway sentences). Plain words for drivers (`DESIGN.md` § driver).
- Every new screen has a loading skeleton that matches its layout, an error state with Try again, and an empty state.
- Downloads (CSV, PDF) are fetched with the bearer token and checked before sharing: PDFs must start with `%PDF` (customer-mobile's `useDownloadPdf()` is the pattern to copy).
- Verification per mobile task: `npm run typecheck -w <app>` and `npm run lint -w <app>` clean, plus the manual check the task names, run on a dev build against **staging** (`npm run env:pull:staging -w <app>`).
- DB-backed API tests (`npm test -w api`) read `DATABASE_URL` from `apps/web/.env.local`: confirm it points at the **dev** Neon branch before running them (see memory note about staging pointing at prod on 2026-11-09).
- Docs: each plan ends by updating its app's doc (`docs/ops/MOBILE-OPS.md`, `docs/customer/APP-MOBILE.md`, `docs/driver/DRIVER-APP.md`) and `docs/api/API.md` for new endpoints. Bruno: every new API route gets a request in `bruno/business-api/...` in the same task (see `bruno/README.md` § Keeping it current).
- Commits: no Co-Authored-By trailer (CLAUDE.md).

## Execution

Recommended: run Plan A in this session (it sets interfaces everything else uses), then execute B, C, D with `/model sonnet` + `/advisor opus`, asking for an advisor check before finishing any money task (B3, B4, C7).
