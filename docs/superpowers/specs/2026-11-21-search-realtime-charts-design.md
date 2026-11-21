# Command palette search, live updates with toasts, and dashboard charts — design

Date: 2026-11-21 · Status: draft for approval

## Intent

Make the three web apps (ops, customer-web, driver-web) feel like one fast, live product:

1. **Find anything from anywhere.** A ⌘K command palette in every navbar that finds pages, actions and
   real records (support case numbers, invoice and quote numbers, campaign IDs, payout and payment
   references, people, orgs) scoped to what the viewer may see.
2. **See changes as they happen.** The advertiser and ops web apps update in place when something
   changes server-side, and say so with a BoardUI-style toast (optionally with a soft sound).
3. **Better charts on every dashboard.** Restyle the shared chart kit to the BoardUI look (screenshots
   in the request: Home, Marketing, Finance templates) and use more of Recharts where our data supports it.

Mobile apps are out of scope for now (search, live and charts come later on mobile).

## Goals

- One palette component, three app-specific sources. Opens with ⌘K / Ctrl+K and a search button in the
  header. Results grouped: Recent, Pages, Actions, then record groups.
- Exact ID recognition: `#42` / `42` → case, campaign, SOS incident, payout with that id; `INV/2026/0001`,
  `QT/2026/0001` (any separator, case-insensitive) → billing document; `adm-payout-…` → payout;
  Paystack payment/refund references → payment; invoice `number` → invoice.
- Live events (advertiser web + ops web), per the agreed table:

  | Event | Advertiser web | Ops web |
  |---|---|---|
  | Campaign approved / rejected / changes requested | status updates in place + toast w/ sound | — |
  | Advertiser submits a campaign | — | review-queue count + toast |
  | Paystack payment settles | balance + Billing refresh + "Payment received" toast | unseen-payments badge |
  | Quote/invoice sent, or payment recorded against one | Invoices list refresh + toast | — |
  | Any new notification row | bell count + inbox | bell count + inbox |

- Toasts: icon/avatar, title, timestamp, one short line, optional actions ("View campaign"), countdown bar,
  stacked in a corner with a spring. Sound only for toasts, never background refreshes. Mute toggle in
  each app's notification settings.
- Chart kit restyle reaches all 19 chart-using screens at once; new chart types placed per the table below.

## Non-goals

- No search service (Algolia/Typesense) — tables are tiny (<~1.1k rows each); Postgres `ILIKE` is enough.
- No business data over the live connection. Events carry a topic and ids only.
- No live updates for driver web in this round (palette and charts yes).
- No mobile work.

## Anti-goals (failure even if it "works")

- Anything that keeps the Neon compute awake: no polling under 300 s, no long-held DB connections
  (LISTEN/NOTIFY). Neon free plan bills wake time (see neon notes; support poll was raised to 60 s for this).
- A second component system in `packages/ui` (BoardUI's react-aria-components + Remix Icon).
- Search leaking across orgs or past ops permissions.
- Sound on every refresh, or toasts for the viewer's own actions.

## Constraints

- Stack: Next.js 16 App Router, React 19, Clerk, TanStack Query, Radix + lucide + shadcn in `packages/ui`,
  Recharts 3.8 already in `packages/ui`, sonner 1.7 already wrapped in `packages/ui/src/components/sonner.tsx`.
- Ops app reads Postgres directly (`apps/ops/lib/queries/*`, `getPgPool`) after `getOpsAccess()` permission checks.
  Customer/driver web call the API (`apps/api/app/v1/{customer,driver}/*`) with Clerk tokens;
  permission helpers in `apps/api/lib/api-utils.ts` (`requireCustomerPermissionAccess`, driver equivalent).
- Upstash Redis REST is already provisioned for the API (`UPSTASH_REDIS_REST_URL/TOKEN`, `apps/api/lib/rate-limit.ts`).
- Vercel functions: 300 s max duration, Fluid Compute, streaming works on Node runtime.
- Docs rule (CLAUDE.md): new behaviour gets documented in `docs/{api,customer,driver,ops,shared}` in the same change.

## Approaches considered

**Live transport**
- **A. Upstash Redis pub/sub + SSE route on the API (chosen).** Writers call `publishChange()`; an API route
  subscribes to Upstash over REST and streams events to the browser; the client reconnects every ~280 s.
  No new vendor or dependency, never touches Neon. Cost: some function wall time per open tab.
- B. Ably — browser connects directly, no function time, but a new account and a connection cap. Fallback if
  Upstash's REST subscribe proves unreliable (verified in the first plan task).
- C. Faster polling — rejected, pins Neon awake.

**Palette**
- **A. cmdk (shadcn `Command`) restyled to BoardUI (chosen).** Fits Radix/lucide; one small dependency.
- B. `npx boardui add command-palette` — pulls in react-aria-components + Remix Icon; two component systems.

**Search backend**
- **One endpoint per actor with ID parsing + `ILIKE`, ≤5 hits per group (chosen).**
- Search service or `pg_trgm` index — unnecessary at this data size.

## Design

### 1. Command palette

`packages/ui/src/components/command-palette.tsx` — shared shell on cmdk + Radix Dialog:
- Trigger: header button (search icon, "Search…", `⌘K` kbd; icon-only on narrow screens), plus global ⌘K/Ctrl+K.
- Panel: blur-in (scale 0.98→1, opacity, backdrop blur), search row, scrolling grouped list, footer with
  `↑↓ navigate · ↵ open · esc close` hints. Items: icon, label, description, right-aligned kbd/badge.
  Highlight uses the dropdown-hover token treatment; reduced-motion respected.
- Props: `pages`, `actions` (static, already permission-filtered), `search(q) → Promise<SearchGroup[]>`,
  `onSelect`. Client filtering for pages/actions; remote groups with `shouldFilter={false}` and 200 ms debounce,
  request only when `q.length ≥ 2` or `q` looks like an ID. Recent picks (last 8) in localStorage, try/catch.
- Shared result shape in `@workspace/ops-contracts`: `SearchHit { group, id, title, subtitle?, href, badge? }`.

**Sources per actor**

| Actor | Pages & actions (client) | Records (server) |
|---|---|---|
| Ops | every nav item the role can see, settings tabs, finance tabs; actions: new payout run, record transaction, new invoice/quote, new announcement, toggle theme | campaigns (id, name, org), advertiser orgs, drivers, driver applications, leads, fleet partners, support cases (#id, subject, contact), SOS incidents, billing documents (number, client), invoices, payments/refunds (reference), payouts (id, reference), waitlist, media-kit requests, team/users — each group gated by its permission |
| Customer | nav items (flag-filtered), settings pages, billing tabs, report tabs; actions: new campaign, top up, upload media, contact support | own org's campaigns (#id, name), billing documents + invoices (number), payments (reference), wallet transactions (reference), support cases (#id, subject), media assets (name), team members — gated by the existing `campaigns:read` / billing / team permissions |
| Driver | nav items, settings pages; actions: report SOS, contact support, view latest payout | own payouts (id, reference, month), own support cases, own SOS incidents, own documents, notifications (title) |

Endpoints: ops — `GET /v1/ops/search` in the API, via `@workspace/ops-api-client` (moved from an ops-app
route while planning: reuses the API's DB test harness, CORS and rate limiting, and ops-mobile can reuse it); customer —
`GET /v1/customer/search?q=`; driver — `GET /v1/driver/search?q=`. Each registered in `route-catalog.ts`
and rate-limited with the existing limiter.

### 2. Live updates

- `apps/api/lib/realtime.ts`: `publishChange(channel, { topic, id?, action? })` → Upstash `PUBLISH`.
  Fire-and-forget, errors logged, never fails the write. Channels: `org:<orgId>`, `ops`.
- Call sites: campaign review routes (single + bulk) → `org:<id>` `campaign`; campaign submit → `ops`
  `review-queue`; Paystack webhook success → `org:<id>` `payment` and `ops` `payment`; billing document
  send / record payment → `org:<id>` `billing-document`; every notification-row insert → `org:<id>`
  `notification`; ops attention sources (support case created, SOS, driver application) → `ops` with their topic.
- Stream route `GET /v1/realtime/stream`: Clerk-authenticated; resolves the caller's channel (advertiser →
  `org:<orgId>`; ops staff → `ops`); opens Upstash REST `SUBSCRIBE` as SSE and forwards events; ends at ~280 s;
  heartbeat comment every 25 s. Client reads it with `fetch` + stream reader (EventSource can't send the
  bearer token) — no dependency.
- Ops web runs on a different origin than the API: CORS via existing `apps/api/lib/cors.ts`.
- Client hook `useLiveEvents(handlers)` in each app: reconnect with backoff, pause when tab hidden > 5 min,
  map topic → `queryClient.invalidateQueries(...)` for the keys that screen already uses, and to a toast.
  Toast wording comes from the refetched record (e.g. the campaign's name and new status), so the event
  stays ids-only. Events caused by the viewer's own request are skipped (request id echoed in the event).
- If Upstash env is missing the stream returns 204 and the hook stays idle — today's behaviour.

### 3. Toasts and sound

- `packages/ui/src/components/live-toast.tsx`: `liveToast({ icon|avatar, title, body, at, actions, tone })` on
  sonner's `toast.custom`; countdown bar (CSS animation, pauses on hover), spring stack via sonner's
  stacking, bottom-right desktop / top on mobile.
- `packages/ui/src/lib/sounds.ts`: three short Web Audio tones (chime = info, ping = success/payment,
  low = warning). No audio files, no licence. Plays only from `liveToast`, only after a user gesture has
  occurred on the page, and only if not muted.
- Mute toggle: in customer `settings/(prefs)/notifications` and ops notification settings; stored per device
  in localStorage (try/catch). Bencho Pro sounds can be swapped in later by replacing `sounds.ts`.

### 4. Charts

**Kit restyle (`packages/ui/src/components/charts/*`, `dashboard/*`)** — reaches all screens:
- Bars: rounded caps on a faint track (`--chart-track`); `RankBars` keeps hatch only for empty/estimate.
- Areas: vertical gradient fill (`<linearGradient>` per series) instead of flat opacity.
- Hover: active bar/slice lifts (darker "-active" shade), siblings dim to ~40%, cursor band, kit tooltip.
- `HeroMetric`/`KpiStrip`: count-up via existing `use-animated-number`.
- `ChartCard`: optional `periods` switch (Weekly / Monthly / Yearly) in the header, wired to the
  existing range plumbing where the dashboard already supports ranges.
- Tokens added to `globals.css` in light and dark: `--chart-track`, `--chart-cursor`, `--chart-N-active`.

**New kit components and where they go**

| Component (Recharts) | Placement | Data |
|---|---|---|
| `SankeyChart` (Sankey) | Ops Finances overview cash flow: top-ups → revenue / held → payouts, fees, tools, margin. Customer Billing: top-ups → campaigns → spend categories | new: `financeFlows(range)` in `apps/ops/lib/queries/finance.ts`; customer flows added to `FinanceSummaryDto` |
| `ComboChart` (ComposedChart, dual axis) | Customer Reports spend tab: spend bars + CPM line. Ops campaigns dashboard: spend vs impressions | exists |
| `RibbonFunnel` (custom SVG on Recharts layout) | Ops Fleet: leads → applied → approved → active. Ops Campaigns: submitted → approved → live | mostly exists (fleet/campaign analytics) |
| `RadialGauge` (RadialBarChart) | Budget pacing (customer), support first-response target (ops), payout success rate (ops payouts) | exists |
| `TreemapChart` (Treemap) | Ops Advertisers: revenue by advertiser; ops Finances: revenue by market (replaces RankBars there) | exists |
| `TrendChart stacked` gradient | Customer delivery by format; ops support cases by channel | exists |
| `ActivityGrid` (Heatmap variant, contributions style) | Driver days on the road (dashboard); ops daily SOS + support load (support dashboard) | new small queries |
| `TrendChart brush` (Brush) | Long trends (≥60 days) on every trend chart | none |

Every new chart keeps `ChartCard`'s empty state and accessible table fallback.

## Delivery order

Three phases, each its own plan, PR-sized, independently shippable:
1. Command palette + search (all three apps).
2. Live updates + toasts + sounds (advertiser + ops web).
3. Chart kit restyle, then new charts dashboard by dashboard.

Each phase updates `docs/` (ops, customer, driver, api, shared) in the same change.

## Left to the builder

- Exact SQL per search group and per new chart query; match existing query file conventions.
- Which query keys each live topic invalidates (read from each screen's hooks).
- Icon choice per search group and toast; exact animation timings within the reduced-motion rules.
- First task of phase 2: verify Upstash REST `SUBSCRIBE` streaming from a Vercel Node function; if it fails,
  switch to Ably (approach B) before building on it.
