# Dashboards & Charts — Design

**Date:** 2026-11-01, rewritten 2026-11-02 after studying the live reference
**Status:** Awaiting review
**Scope:** `apps/customer-web`, `apps/ops`, `apps/api`, `apps/web/prisma`, `packages/ui`, `packages/ops-contracts`
**Visual reference:** [studio-admin](https://studio-admin.arhamkhnz.com/dashboard/analytics-v1) ([source](https://github.com/arhamkhnz/next-shadcn-admin-dashboard)). It is also shadcn + Recharts, so its patterns port directly. The demo is back up. This version comes from screenshots of 8 dashboards, the page content of Default, Logistics, Infrastructure and Invoice, and its component source.

Related: [Audience index plan and measurement roadmap](../plans/2026-09-24-audience-index-phase-1.md), [issue #215 (DOOH measurement)](https://github.com/admobihq-cell/AdmobiHQ/issues/215), [Media Library plan](../plans/2026-10-01-media-library.md).

---

## 1. Intent

The first version of this spec listed the right charts but described thin pages: a row of KPIs, a few charts, one table. The reference feels full because each card answers a question and then says what to do about it. A number sits with its comparison, a chart sits with its summary tiles, and a table says who needs to act.

The goal is dashboards with that density, in that design:

- **Advertisers** see where their money went, what they got for it, and what needs attention, in enough detail to justify the spend to their own boss.
- **Ops** sees where money, campaigns and accounts are at risk, and who should act next.
- **Reports** carries the impressions plan: today it shows what is booked, and as measurement ships the same pages get more exact without being rebuilt.

Most of the numbers don't exist yet: no payments, no payouts, no delivery data. So dashboards are built now against **real tables and real queries**, filled with **seeded demo rows on the dev database only**. When Pesapal and telemetry arrive they write to the same tables, and no dashboard code changes.

## 2. Decisions

| Decision | Choice | Why |
|---|---|---|
| Design language | The reference's analytics-v1 style, on Admobi's tokens (§3) | The user's call. |
| Colour | Neutrals do most of the work; terracotta `--chart-1` is the one accent | Keeps the reference's calm look without losing the brand. Builder's call, easy to reverse in tokens. |
| Advertiser wallet | Becomes **Finance & Billing** at `/billing`, four tabs. `/settings/billing` redirects | The user's call. It is more than a wallet now, and it no longer belongs under Settings. |
| Advertiser reports | Five tabs plus a per-campaign report (§7.3, §7.4) | The user's call: "very detailed". |
| Measurement | Every delivery number carries its source, shown on screen (§5) | Lets the impressions roadmap land without dashboard changes, and never overstates what is known. |
| Sample data | Seeded rows, not hardcoded constants or a badge | The user's call. Exercises the real query path. |
| Where the seed runs | Dev Neon only, which serves local and staging | One run covers both. Prod stays empty. |
| Prod behaviour | Tables exist but are empty; every chart shows an honest empty state | A made-up number is worse than a missing one. |
| Existing fake data | Removed from web: ops `/finances` and the advertiser wallet stop using `placeholder-data.ts` | Otherwise real advertisers keep seeing invented balances. |
| Manual ledger entry | Ops can record a top-up, spend, refund or adjustment, audited (§8.2) | Nothing else writes the ledger on prod. Without this, "your account manager can add funds" would be false. |
| Money in Reports | Spend and cost fields are `null` unless the caller holds `billing:read` | Members hold `reports:read` but not `billing:read`. The first version would have shown them spend. |
| Money in ops | Balances, spend, revenue and payouts need `finances`, wherever they appear | Same pattern as safety data on the support dashboard. Without it, Advertisers and Fleet would show money to roles that can't open Finance. |
| What writes spend | Dashboards read `spend` rows and assume no rule. Ops records them by hand for now; the seed imitates a daily burn across the flight | The billing rule isn't decided (§11). Every figure here works under any rule. **Builder's call, to confirm.** |
| Funding signals | Hidden until an org has its first ledger row | Prod orgs start at 0 with real budgets, and ROADMAP §3 has corporates on manual invoice. Telling them they're short would be an invented alarm. |
| Invoices and the ledger | Independent in this build: issuing or paying an invoice writes no ledger row | Stops a double count. A later billing build decides how they connect. **Builder's call, to confirm.** |
| "Owner" in ops ledgers | The advertiser's org owner | Already in the data. An Admobi account manager needs a new column and assignment UI (§11). |
| Date range | Presets plus custom range, built with two native date inputs | The reference has it. `react-day-picker` is not installed and isn't needed. |
| Exports | CSV on every table, PDF for statements, invoices and campaign reports | The advertiser's real job here is reporting upward. Moved into scope. |
| Chart library | Recharts via `@workspace/ui` `chart.tsx`; no new dependency | Installed, and the same as the reference. `tabs.tsx` is added from the installed `radix-ui`. |
| Ops data access | `getPgPool()` + `unstable_cache` (300s) in `apps/ops/lib/queries/` | Existing pattern. |
| Advertiser data access | `/v1/customer/*` routes + TanStack Query, org-scoped by `auth.access.orgId` | Existing pattern; the API is the tenant boundary. |
| Load per tab | Each tab has its own endpoint and loads when opened | Neon compute is a known cost driver. |

## 3. Design language

### 3.1 What makes the reference work

1. **Numbers are never alone.** Every figure has a comparison and a note: `72.4%` / `closed won / monthly target`.
2. **Cards contain small tiles.** A chart card opens with three summary tiles, then the chart.
3. **Cards end in a decision.** Status chips, levers, a next step.
4. **Flat and hairline.** One-pixel borders, `shadow-xs` at most, no gradients, lots of white.
5. **Neutrals carry the page.** Colour appears for status and for one accent.
6. **Tables are the destination.** Rich two-line cells, status pills, a summary strip on top, filter tabs, pagination.

### 3.2 Anatomy, from the template's source

| Element | Spec |
|---|---|
| Page grid | `grid gap-4`; main/side split `xl:grid-cols-3` with the main column `xl:col-span-2` |
| Card | Existing `Card` with `shadow-xs`; `CardTitle` + `CardDescription` always, the description states the time window or meaning |
| Hero figure | Label `text-sm font-medium text-muted-foreground`; value `text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums` |
| Card KPI | Label `text-sm text-muted-foreground`; value `text-2xl leading-tight font-semibold tabular-nums`; note `text-xs text-muted-foreground` |
| KPI strip | One card divided into cells with `divide-x`, not separate cards. Stacks to 2 columns on tablet, 1 on phone |
| Metric tile | `bg-muted/35 rounded-md border px-3 py-2.5`: `text-xs` label, `text-lg font-semibold tabular-nums` value, `text-xs` note |
| Lever tile | `bg-muted/20 rounded-md border px-2.5 py-2` |
| Owner strip | `bg-muted/20 rounded-md border px-3 py-2`, inline facts on the left, one small button on the right |
| Insight note | `bg-muted/10 rounded-md border border-dashed px-3 py-2.5 text-xs`. Plain-language conclusion from the data |
| Delta pill | Good: `bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300`. Bad: `bg-destructive/10 text-destructive`. Neutral: `secondary` badge. Always with an arrow icon, never colour alone |
| Toolbar | Left: view select, `Filters` with a count badge, `Showing: …` text. Right: date range, Export |
| Tab bar | Muted pill segmented control, as on the template's Analytics page. Real tabs on every multi-view dashboard |
| Chart grid | `CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.25}`; axes without lines or ticks |
| Bars | `barSize={14}`, `radius={[5,5,0,0]}`, `fillOpacity={0.22}`, stroke at 0.35 opacity |
| Target line | `ReferenceLine strokeWidth={2} strokeDasharray="6 5"` in `--muted-foreground` |
| Sparkline | `h-10 rounded-md border`, area `fillOpacity={0.14}`, no axes |
| Table row | Two-line first cell (name + muted id or subtitle), pills for status, right-aligned tabular numbers, `Viewing 10 out of 34` with pagination below |

A delta's colour follows its meaning, not its sign. More spend is neutral for an advertiser. More missed spots is bad. `DeltaPill` takes `good: "up" | "down" | "neutral"`.

### 3.3 Patterns taken from each dashboard

| Pattern | Reference | Our use |
|---|---|---|
| Hero with sparkline + summary strip | Analytics V1 | Top of Reports Overview, ops Overview, ops Finance |
| Chart with summary tiles and target line | Analytics V1, Forecast vs Target | **Delivery pacing** in Reports; ops revenue against target later |
| Status chips, levers, owner strip, dashed note | Analytics V1, Coverage Triage | **Funding** card on Finance & Billing; ops campaign triage |
| Action queue | Analytics V1, Manager Action Queue | **Needs attention** on advertiser Overview; ops action queues |
| Ledger: summary strip + rich table | Analytics V1, Revenue Risk Ledger | **Campaign health** in Reports; **Accounts at risk** in ops |
| Fused KPI strip with deltas | Analytics | KPI rows on Reports tabs |
| Segmented share bar with legend rows | Finance, Finance V1 | **Where your money went** |
| Upcoming list with total | Finance, Upcoming Bills | **Upcoming charges** |
| Donut with centre total | Finance, Account Allocation | Spend by campaign |
| Mirror bars above and below zero | Finance V1, Cash Flow | **Money in vs out** |
| Shortcuts grid | Finance | Finance & Billing actions |
| Alert strip with one button | Finance, Credit score | Low funding, rejected creative |
| Tabs with a period comparison line | Analytics, Traffic Quality | Trend charts, dashed line for previous period |
| Rank bars on a hatched track with a delta column | E-commerce, Traffic Sources | Markets, top advertisers |
| Segmented gauge | E-commerce, Inventory | **Delivery rate**, funds used |
| Filter tabs on a table | E-commerce, Recent Orders | All transaction and campaign tables |
| Tick health bar | CRM, Health column | Delivery rate in table rows |
| Hatched bars with a side summary | CRM, Qualified Lead Flow | Monthly charts |
| Progress cards with footer | Productivity, Projects | **Active campaigns** |
| Grouped table with filter bar | Infrastructure | Ops wallets by org (later: screens) |
| List + detail panel | Logistics | Campaign quick view in a `Sheet` |
| Live tile wall with alert bar | Patient Monitoring | Later: live fleet monitor (§11) |

### 3.4 What we don't copy

- **Dual axes.** The template's Forecast chart hides a second y-axis, which makes a dot look like it means something it doesn't. Ours uses one axis, `% of schedule`. Same look.
- **Fake precision.** No "Risk Ladder 81". Health is a level with a stated reason, and the tick bar shows a real percentage.
- **Decoration without data.** No card ships unless a query can fill it: no credit card visual, quick transfer, or review carousel.
- **Line + bars at unrelated scales** (E-commerce Sales Overview). Two measures get two charts.

## 4. Data model

Six additive tables, each with `is_demo Boolean @default(false)`.

**`WalletTransaction`** (`wallet_transactions`): append-only org ledger. `org_id?` and `campaign_id?` (both `SetNull`, so finance history outlives a deleted org or campaign), `kind` (`top_up | spend | refund | adjustment`), signed `amount_kes` (credit +, debit −), `spend_category?` (`screen_time | production | service_fee | tax`), `provider` (`manual | pesapal | seed`), `reference?` unique, `description`, `occurred_at`, `created_by?`. Corrections are new `adjustment` rows, never edits.

**`CampaignDailyStat`** (`campaign_daily_stats`): one row per campaign, day, market, daypart and format.

| Field | Meaning |
|---|---|
| `day`, `market`, `daypart`, `format` | Grain. Dayparts as in the audience plan: `morning`, `midday`, `evening`, `night`, Kenya time |
| `plays_scheduled`, `plays_delivered`, `plays_missed`, `plays_over` | Playback layer. Missed and over-delivered are required by #215 |
| `vehicle_hours`, `distance_km`, `active_vehicles` | Fleet effort |
| `impressions_low`, `impressions_likely`, `impressions_high` | Nullable. Null means not estimated, not zero |
| `source` | `schedule | logged | modelled | calibrated` (§5) |
| `model_version` | Nullable. Which impression model wrote the row, so recalibration can't silently change history |

Unique on `(campaign_id, day, market, daypart, format)`. Cascades with the campaign. A moving vehicle can play in several markets, so `market` here is where it played, which can differ from `campaigns.market`.

**`CampaignCreativeDailyStat`** (`campaign_creative_daily_stats`): `campaign_id`, `media_asset_id?` (`SetNull`), `creative_name` snapshot, `day`, `plays_delivered`, `impressions_likely?`. Separate because a creative split at the daypart grain would multiply rows for little value.

**`CampaignReachStat`** (`campaign_reach_stats`): `campaign_id`, `as_of`, `reach_low/likely/high`, `source`, `model_version`. Unique on `(campaign_id, as_of)`. **Reach is not additive**: the same person can see two days or two campaigns, so it is stored as campaign-to-date and is never summed.

**`Payout`** (`payouts`): the model named in [ROADMAP.md](../../shared/ROADMAP.md) §3. `driver_id?` (`SetNull`), `amount_kes`, `status` (`pending | settled | failed`), `mpesa_ref?`, `period_month`, `paid_at?`.

**`Invoice`** (`invoices`): `org_id?` (`SetNull`), `campaign_id?` (`SetNull`), unique `number`, `period_start`, `period_end`, `subtotal_kes`, `tax_kes`, `total_kes`, `status` (`issued | paid | overdue | void`), `issued_on`, `due_on`, `paid_at?`, `lines Json` (an immutable snapshot, which is what an invoice should be), `tax_invoice_ref?` (the eTIMS number, later). Only the seed writes this for now. Ops issuing is §11.

Monthly statements are derived from the ledger, not stored. Balance is `SUM(amount_kes)` for the org and is never stored. `CampaignDailyStat` does not replace the `campaign_placements` table reserved in [DATA-LAYER.md](../../shared/DATA-LAYER.md): that is dispatch state, this is delivery aggregates. `Campaign` has no plays or screen count, so `plays_scheduled` can only come from whatever writes these rows.

**Builder's call, to confirm:** the four `spend_category` values are a proposal for how an advertiser's money splits. The pricing docs and `pricing.ts` don't define fees or tax, so this needs a commercial answer, not a closer read. The column is a plain string like the other status fields, so changing it later is a data update, not a migration. Whatever the split, `tax` rows are never revenue.

## 5. Measurement ladder

This is how the impressions plan ([roadmap](../plans/2026-09-24-audience-index-phase-1.md), #215) meets Reports. Each step fills more of the same tables, and `source` records which step produced a row.

| Level | `source` | What ships it | What Reports can show | Label on screen |
|---|---|---|---|---|
| 0. Booked | none | Today, on prod | Budgets, flights, days delivered by the calendar, status | **Booked schedule** |
| 1. Area index | none | Audience index Phase 1 | Adds a 0–100 foot-traffic score per market and daypart | **Modelled index** |
| 2. Logged | `logged` | Step 2: GPS pings + play log | Plays scheduled, delivered, missed, over; hours; km; real market | **Logged plays** |
| 3. Estimated | `modelled` | Step 3: impressions per play | Low / likely / high impressions; reach; frequency; cost per 1,000 | **Modelled estimate** |
| 4. Calibrated | `calibrated` | Steps 1b and 6: manual counts, telco density | Same fields, tighter range | **Calibrated estimate** |
| Outcomes | new table | QR, promo codes, short links; later brand lift | Scans, visits, uplift | §11 |

Rules:

- The API returns `measurementLevel` on every report, the lowest level across the rows in view. `MeasurementBadge` shows it in the toolbar with a link to "How we estimate".
- **Delivery sections never fall back to a guess.** With no stats rows, they show "Delivery numbers appear here once your campaigns are reporting." The Booked content stays, so a prod report is useful from day one.
- Impressions always read "Est." and show the range: `Est. 1.2M` / `0.9M – 1.6M`.
- Reach and frequency only appear for one campaign at a time, as campaign-to-date. With several in view the tile shows `—` and explains that reach can't be added across campaigns.
- Frequency is impressions ÷ reach. Cost per 1,000 is spend excluding `tax` rows ÷ likely impressions × 1,000. Both are `null` when the divisor is 0.
- Spend is held per campaign, not per market or daypart, so cost per 1,000 shows `—` when one of those filters is on.
- The proof-of-play PDF keeps claiming only what its rows support. It adds plays and impressions by market when stats exist at level 2 or above, and otherwise keeps today's footnote.

The site's "every play is logged" copy is still ahead of reality (#215). Reports will now show that gap to any logged-in advertiser, so soften it before launch.

The three layers from the Moving Walls article map to tabs: Exposure → Overview and Delivery, Audience → Audience, Performance → Outcomes (later).

## 6. Seed

`npm run seed:demo -w api` (optional `--org <id>`) wipes every demo row and writes a fresh set, so re-running never double-counts.

- **Prod guard, fail closed:** the script refuses to run unless the `DATABASE_URL` host starts with an allowlisted dev prefix or is localhost. There is deliberately no `:prod` script.
- **Deterministic:** a fixed PRNG seed gives the same numbers on every run.
- **Targets existing orgs**, so a real login on local or staging sees data. Each active org gets 4 to 6 demo campaigns, 180 days of stats, wallet history that reconciles, monthly invoices and reach rows.
- **Shows every state:** one healthy campaign, one under-delivering, one short of funds, one with rejected creative, one ending soon, one completed. A short "levels" spread (some campaigns `logged`, some `modelled`, some `calibrated`) proves the badge works.
- **Ops-only rows:** demo CRM drivers, payouts, driver profiles, support cases and safety incidents, recognisably marked so the reset removes them and nothing else. Writes go straight to the DB, so no email or push fires.
- Keep total rows under about 50,000 on the shared Neon branch.

## 7. Advertiser dashboards

Every dashboard uses the §10 toolbar. A Member sees plain access messages, never an error.

### 7.1 Overview (`/`)

Modelled on Productivity and Default: a calm home that points to what matters.

```
Greeting + date                                        [range] [New campaign]
┌ KPI strip ──────────────────────────────────────────────────────────────┐
│ Live campaigns │ Available funds* │ Spent* │ Est. impressions │ Delivery │
└─────────────────────────────────────────────────────────────────────────┘
┌ Spend and delivery ─────────────────┐ ┌ Needs attention ─────────────────┐
│ tabs: Spend* | Impressions | Plays  │ │ Rejected creative · Replace      │
│ trend, dashed previous period       │ │ Short KES 40,000 · Top up        │
│                                     │ │ Ends in 3 days · Extend          │
└─────────────────────────────────────┘ └──────────────────────────────────┘
Active campaigns: 3 progress cards (flight %, delivery, ends on)
Upcoming flights list                    Recent activity
```

`*` needs `billing:read`. Needs attention lists the org-level funding alert first (§9.3, `billing:read` only), then campaigns from `campaignHealth`. All clear shows "Nothing needs your attention."

### 7.2 Finance & Billing (`/billing`, `billing:read`)

Sidebar label **Finance & Billing**. Replaces the Wallet page.

**Overview tab**

```
┌ 2×2 KPI block ───────────────────┐ ┌ Where your money went ──────────────┐
│ Balance        │ Available       │ │ segmented share bar                 │
│ Spent          │ Committed       │ │ Screen time · Production · Fees ·   │
│ (each: delta + note)             │ │ Tax, each with KES and %            │
└──────────────────────────────────┘ ├ Alert strip: funds short · Top up ──┤
┌ Money in vs out ───────[Monthly▾]┐ ┌ Spend by campaign ──────────────────┐
│ mirror bars, Top-ups / Spend     │ │ donut, centre total, legend rows    │
└──────────────────────────────────┘ └─────────────────────────────────────┘
┌ Funding ─────────┐ ┌ Upcoming charges ─┐ ┌ Shortcuts ────────────────────┐
│ [Healthy] 42 days│ │ KES 180,000 next  │ │ Top up · Statement · Invoices │
│ tiles + note     │ │ 30 days, list     │ │ Export · Support              │
└──────────────────┘ └───────────────────┘ └───────────────────────────────┘
```

- **Balance** is all-time and ignores the range. **Available** is balance minus committed. **Committed** is what's left on live and scheduled budgets, using the same `isActive` definition as the budget statement PDF, floored at 0 per campaign.
- **Funding** follows Coverage Triage: status chip, then tiles for Runway (available ÷ 30-day average daily spend), Committed, and Next charge, then an insight note such as "At this pace, funds run out around 14 Dec."
- With no ledger rows, Available, Runway, the Funding card and the alert strip are replaced by "Your funding details appear after your first top-up."
- **Upcoming charges** lists scheduled campaigns' remaining budget by start date. It is planned spend, not a bill, and the card says so.
- **Top up** opens a notice: "Online payments are coming soon. Your account manager can add funds to your wallet today."

**Transactions tab.** Summary strip (Top-ups, Spend, Refunds, Net), filter tabs (All, Top-ups, Spend, Refunds, Adjustments), search, sort, paging at 25 rows, CSV. Columns: Date, Description + reference, Campaign, Category, Amount, Balance after. A row opens a `Sheet` with full detail.

**Invoices tab.** Summary strip (Open, Overdue, Paid this year). Columns: Number, Period, Campaign, Amount, Tax, Due, Status, PDF. A row opens a preview in the layout of the template's Invoice page, with the org's billing email and KRA PIN. Every PDF says it is not a tax invoice until eTIMS ships. Missing billing details show an alert strip linking to organization settings.

**Statements tab.** One row per month from the ledger: Opening, Top-ups, Spend, Refunds, Closing, PDF. Closing must equal the next month's opening. Keeps the existing budget statement download.

The hide-balance toggle, local top-up, auto-reload and on-device balance are deleted.

### 7.3 Reports (`/reports`, `reports:read`)

Toolbar adds the **Measurement badge** and filters for campaign, market, format and daypart. Money fields follow §2. Export gives CSV of the open tab, or a PDF when one campaign is selected.

**Overview tab**

```
┌ Hero ─────────────────┐ ┌ Delivery summary (vs previous period) ──────────┐
│ Est. impressions      │ │ Plays delivered │ Delivery rate │ Reach │ Cost  │
│ 1.2M  +9.4%  +103K    │ │                                         per 1k* │
│ Range 0.9M–1.6M       │ │                                                 │
│ sparkline             │ │                                                 │
└───────────────────────┘ └─────────────────────────────────────────────────┘
┌ Delivery pacing ──────────────────────┐ ┌ What's working ─────────────────┐
│ tiles: Delivered / Remaining / Rate   │ │ tiles: Top market, Top daypart, │
│ bars as % of schedule, 100% line      │ │ Top creative                    │
│                                       │ │ Focus rows + dashed note        │
├ Campaign health ledger ───────────────┴─────────────────────────────────────┤
│ strip: At risk, Watch, Ending soon, Unspent budget*                         │
│ Campaign | Status | Flight | Delivery tick bar | Est. impr. | Next action   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Delivery tab** (the online proof of play). KPI strip: Scheduled, Delivered, Missed, Over-delivered, Vehicle hours, Distance. Scheduled vs delivered trend. Delivery gauge. Missed spots by daypart. Active vehicles trend. Creative rotation table (creative, plays, share, est. impressions). Daily log table, the same rows as the PDF, plus plays when logged.

**Audience tab.** Market × daypart heatmap, the headline of the tab. Rank bars by market with deltas. Weekday × daypart heatmap. Daypart share bar. Reach and frequency card with a plain reading ("broad, light coverage" or "a small group saw this often", from #215). Market map: the six H3 market cell sets on `map.tsx`, shaded by impressions on a single hue. Location notes: CBD reads as professionals, malls as purchase-moment; plain text per market, not data.

**Spend tab** (`billing:read`, otherwise the access message). Tiles: Spend, Cost per 1,000, Budget used, Unspent. Cost per 1,000 trend. Spend by campaign, by objective, by format. Budget burn against flight elapsed per campaign, which shows who is ahead or behind. Link to Finance & Billing.

**Campaigns tab.** Filter tabs (All, Live, Scheduled, Completed, Needs attention), search, sort, CSV. Columns: Campaign + market, Status, Flight, Budget*, Spent*, Delivery, Est. impressions, Cost per 1,000*. A row opens the campaign report. A small `Sheet` quick view gives the Logistics-style summary.

### 7.4 Campaign report (`/reports/campaigns/[id]`, `reports:read`)

The page an advertiser forwards to their boss. Linked from Reports and from campaign detail.

Header: name, status, health chip, flight, format, market, **Download report (PDF)**, **Proof of play (PDF)**. Flight progress bar with Elapsed and Delivered. Then: KPI strip (Est. impressions, Reach, Frequency, Plays, Delivery rate, Cost per 1,000*), pacing chart, market × daypart heatmap, market map, creative rotation, daily log, budget summary*. Another org's campaign returns 404, as `getOwnedCampaign` does.

### 7.5 Copy for empty states

| Situation | Message |
|---|---|
| No delivery rows | Delivery numbers appear here once your campaigns are reporting. |
| No ledger rows | Your transactions appear here after your first top-up. |
| No invoices | Invoices appear here once your account manager issues one. |
| Filter matches nothing | Nothing matches these filters. |
| No access | Ask your account owner for billing access. |

## 8. Ops dashboards

New sidebar group **Dashboards**, above Operations. Overview and Finances move into it and keep their URLs. Each has the hero and summary row, tiles, then a ledger.

### 8.1 Overview (`/overview`, no permission)

Rebuilt on the kit, same data as today, plus: hero (booked this range), summary strip, and an **Action queue** gathering counts from the other dashboards the viewer can see (reviews waiting, campaigns at risk, open urgent cases, payouts pending), each linking through.

### 8.2 Finance (`/finances`, `finances`)

Tabs: **Overview · Ledger · Wallets · Payouts · Tool costs**

| Tab | Content |
|---|---|
| Overview | Hero (Revenue) + strip (Money in, Driver payouts, Tool costs, Net margin, Wallet funds held). Money in vs out mirror bars. Revenue by category. Revenue by market. Margin insight note. |
| Ledger | Transactions table with filter tabs, CSV and **Record transaction** |
| Wallets | Table per org: balance, committed, available, runway, last top-up, status. Groups: short of funds, healthy, inactive |
| Payouts | Payouts by status gauge, by month, table with filter tabs |
| Tool costs | Link and run-rate summary from the integrations ledger |

**Record transaction** replaces the coming-soon dialog for top-ups. Fields: org, kind, amount, campaign, category, reference, reason. It writes `provider = manual`, an audit event and `created_by`. It rejects zero amounts, and rejects a duplicate reference. Other coming-soon dialogs stay.

Tool costs is a run-rate, since `integrations` has no history. Net margin is revenue minus payouts minus tool costs scaled to the range. Funds held is money owed to advertisers, not revenue, so it stays visually apart. Revenue equals spend rows net of refunds, excluding `tax` rows.

### 8.3 Campaigns (`/dashboards/campaigns`, `campaigns`)

Tabs: **Pipeline · Delivery · Inventory mix**

- **Pipeline:** hero (Booked budget) + strip (Live, In review, Approval rate, Avg review time). Status funnel. Submitted vs approved trend. **Review queue** in the Manager Action Queue style: oldest first, with waiting time and reviewer action.
- **Delivery:** Campaign health ledger across all orgs, ops version, with account and org owner. Delivery by market. Network delivery rate gauge. Missed spots by daypart.
- **Inventory mix:** budget by format, market × daypart heatmap, impressions by market, ending soon table.

### 8.4 Advertisers (`/dashboards/advertisers`, same guard as `/advertiser-orgs`)

New, modelled on CRM and Revenue Risk Ledger. KPI row: Active orgs, New, Live spenders, Avg spend per org, Top-5 share of revenue. New orgs trend. Top advertisers as rank bars. Concentration share bar. **Accounts at risk** ledger: strip (Short of funds, Dormant 60d+, Rejected repeatedly, Spend down), then Account + owner, Blocker, Last campaign, Balance, Spend trend, Next action. Reasons come from rules (§9.3), never a score. Without `finances` the viewer sees counts and campaign activity only: Avg spend, Top-5 share, top advertisers by spend, Balance, Spend trend and the Short of funds count don't load.

### 8.5 Fleet (`/dashboards/fleet`, `drivers`)

Hero (Active drivers) + strip (Pending applications, Approval rate, Avg active vehicles, Vehicle hours, Payouts pending). Application funnel. Drivers by city. Active vehicles trend. Payouts by month. Top drivers. **Fleet attention** queue: applications waiting oldest, failed payouts. Payout figures, charts and rows load only when the viewer also holds `finances`.

### 8.6 Support & safety (`/dashboards/support`, `support`)

Hero (Open cases) + strip (Urgent open, Opened in range, Open incidents, Critical incidents). Cases trend. By category. Incidents by type and severity, which only load when the viewer also holds `safety`. Oldest open cases ledger. No response-time KPI: `support_cases` has no first-response or resolved timestamp, and `updated_at` would lie.

## 9. Components

### 9.1 Kit in `packages/ui/src/components/charts/`

Charts: `TrendChart` (area or line, optional dashed previous series, optional low/high band), `MirrorBars`, `PacingBars` (bars + `ReferenceLine`), `DonutChart`, `ShareBar`, `RankBars` (hatched track + delta column), `FunnelBars`, `Heatmap` (generic x × y, CSS grid, not Recharts), `SegmentGauge`, `TickBar`, `Sparkline`.

Blocks in `packages/ui/src/components/dashboard/`: `KpiStrip`, `HeroMetric`, `MetricTile`, `LeverTile`, `OwnerStrip`, `InsightNote`, `DeltaPill`, `StatusPill`, `AlertStrip`, `ChartCard` (title, description, action slot, empty state, chart/table toggle), `LedgerCard` (summary strip + table + filter tabs + pagination), `ActionQueue`, `ProgressCard`, `DashboardToolbar`, `DashboardTabs`.

New primitive: `tabs.tsx`, from the installed `radix-ui`.

### 9.2 Chart rules

From the dataviz method: one y-axis, thin marks with 2px lines, legend for 2+ series, a tooltip on every chart, table view for accessibility, colour follows the entity and never its rank, at most 5 categories then "Other", text in text tokens, status colours reserved for status with a label. `--chart-1…5` go through the palette validator in light and dark, and only a failing token is adjusted. Hatching is an SVG `<pattern>` referencing tokens, so it works in both themes and in forced colours.

### 9.3 Rules, not scores

`campaignHealth(input)` and `accountHealth(input)` are pure functions in `packages/ops-contracts` returning `{ level, reason, nextAction }`. First match wins:

| Rule | Level | Next action |
|---|---|---|
| Rejected or changes requested | Action needed | Open the review reason |
| Starts within 7 days with no creative | At risk | Add creative |
| Delivery below 80%, 3+ days into flight | At risk | Contact your account manager |
| Delivery 80–95% | Watch | Monitor |
| Ends within 7 days | Watch | Extend or plan the next flight |
| Otherwise | On track | None |

Thresholds are named constants, and are the builder's starting point. With no delivery rows the delivery rules are skipped, so a campaign is never called under-delivering on missing data.

**Funding is an org-level state, not a campaign rule.** `fundingStatus(input)` is a separate pure function returning `untracked` (no ledger rows), `healthy`, `low` (runway under 14 days) or `short` (available below 0). Inside `campaignHealth` it would mark every campaign in the org and hide real delivery problems.

`accountHealth` first match: repeated rejection, `short` funding (only with `finances`), no campaign in 60 days, spend down over 50% against the previous period (only with `finances`), otherwise healthy.

## 10. Filters, ranges and exports

- **Range:** 7D, 30D, 90D, All and Custom. Custom uses two native date inputs in a `Popover`, capped at 366 days, Nairobi calendar days. URL params are `range`, or `from` + `to`. Existing `DATE_RANGE_KEYS` stays unchanged.
- **Comparison:** the same-length period immediately before. `All` has no comparison, so its delta is hidden rather than 0.
- **State lives in the URL** (`?tab=delivery&range=30d&market=CBD`), so a view can be shared and the back button works.
- **Filters** apply to the open tab, with a `Showing: CBD · Evening` line and a clear action.
- **CSV:** `toCsv` moves from `apps/ops/lib/format.ts` to `@workspace/ops-contracts/format`, and ops keeps re-exporting it. File names use `exportFileName`.
- **PDF:** `renderPdf` and the existing template style. New: campaign report, monthly statement, invoice.

## 11. Future features

Grouped by what unlocks them, and left out of this build. "Needs" is the real blocker.

### Finance & Billing

| Feature | Needs |
|---|---|
| Pesapal top-ups, real auto-reload, saved payment methods | Pesapal integration |
| Automatic spend rows on approval or daily burn | A billing rule from the pricing model |
| Connect invoices to the ledger, plus a per-org wallet or invoiced mode | The same billing rule |
| KRA eTIMS tax invoices, ops issuing and voiding | eTIMS integration |
| Low-balance and invoice emails | Resend templates; rules exist already |
| Budget caps per campaign, spend approvals above a limit | `billing:write` flows |
| Purchase orders and credit terms for larger accounts | Finance policy |
| Client sub-wallets for agencies | Org model change |
| Refund requests, promo credits | Workflow; ledger kinds exist |

### Reports and measurement

| Feature | Needs |
|---|---|
| Foot-traffic score next to each market and daypart | Audience index Phase 1 |
| Real delivery, missed spots, hours, km | Roadmap step 2 |
| Real impressions, reach, frequency | Roadmap step 3, with a modelled reach curve added (#215) |
| Calibrated ranges, CPM pricing | Steps 1b and 6 |
| **Outcomes tab:** QR scans, promo codes, short links per creative | A tracking-link table; cheap, could start early |
| Footfall and web uplift against a baseline | Partner or mobility data |
| Brand lift, exposed vs control | Telco data + surveys |
| Hex-level heatmap and routes on the map | Pings aggregated per H3 cell |
| Creative A/B comparison | Creative stats + rotation control |
| Benchmarks: your cost per 1,000 vs network average | Enough live campaigns to stay anonymous |
| Scheduled email reports, shareable read-only link, branded PDF | Cron + signed links |
| Saved views, side-by-side campaign compare | User preferences table |
| Pre-booking forecast in the wizard | Calibrated model |
| Anomaly alerts ("delivery fell 30% today") | Step 2 + notifications |
| Live "where is my ad now" | Telemetry; the map exists |
| Data API or Google Sheets export | API keys for orgs |

### Ops

| Feature | Needs |
|---|---|
| **Live fleet monitor:** Patient Monitoring-style tile wall with alert bar | Step 2 |
| **Network health:** Infrastructure-style screen table (online, brightness, last seen) | Player telemetry |
| **Inventory and sell-through:** sold vs available per market and daypart | Capacity model, `campaign_placements` |
| **Dispatch board:** Logistics-style list + detail per vehicle | `campaign_placements` |
| Margin per market and per campaign | Payouts tied to campaigns |
| Revenue target and forecast, Forecast vs Target for real | Monthly targets table |
| Sales pipeline from leads, cohort retention | Lead stage history |
| Delivery fraud checks: GPS spoofing, screen-off | Step 2 |
| Programmatic revenue dashboard | SSP deal (#215) |
| Named Admobi account manager per org, with "my accounts" views | New column + assignment UI |
| Weekly ops digest | Cron + email |
| Command palette across dashboards | `cmdk`, optional |

### Everywhere

Mobile ports of Finance & Billing and Reports on the same endpoints, dashboard customisation, realtime updates.

## 12. Non-goals

- `apps/customer-mobile`, `apps/ops-mobile` and driver apps. Their wallet and finance screens keep local placeholder data, and mobile's own `/settings/billing` route is unaffected.
- Pesapal, online top-ups, payout execution, telemetry ingestion, tax invoices.
- Building the audience index or any measurement step. This build only prepares the tables and the UI.
- Copying template pages with no Admobi job, such as Academy, Kanban or e-commerce.

**Anti-goal:** demo rows reaching prod, an invented figure on any production screen, or an estimate shown without its label.

## 13. Media page

Built separately: the Media Manager is on `feat/media-library` with its own plan and rollout. Nothing here changes it, except that campaign creative stats reference `media_assets`, so this work should branch after that merges.
