# Customer web app (`apps/customer-web`)

Advertiser product at **`app.admobihq.com`**. Mobile twin: [APP-MOBILE.md](./APP-MOBILE.md). Auth: [AUTH.md](../shared/AUTH.md).

**Deployment:** [DEPLOYMENT.md](../shared/DEPLOYMENT.md) · **Local dev:** [DEV-SETUP.md](../shared/DEV-SETUP.md)

## URLs

| Environment | URL |
|-------------|-----|
| Production | `https://app.admobihq.com` |
| Staging | `https://app.staging.admobihq.com` |
| Local dev | `http://localhost:3002` |
| Business API | `https://api.admobihq.com` (prod), `http://localhost:3003` (local) |

## Current scope

Sidebar app shell. What is real vs placeholder:

| Route | Status |
|-------|--------|
| `/` Overview | **API-backed.** A KPI strip (live campaigns from `/v1/customer/campaigns`; available funds and spend from `/finance/summary`; est. impressions and delivery from `/reports/overview`), a Spend / Impressions / Plays trend with the previous period dashed beneath, a **Needs attention** list (the org-level funding alert first, then campaigns whose health isn't on track), active campaign progress cards, upcoming flights, and recent activity from the merged notification inbox. Each block follows the viewer's permissions: without `billing:read` the funds and spend figures and the Spend tab are absent, and without `reports:read` the impressions, delivery and health rows are. The range is in the URL (`?range=`). A figure with no data behind it shows a dash, never an invented number |
| `/campaigns`, `/campaigns/[id]` | **API-backed** — list/detail against `/v1/customer/campaigns`; status + review-reason banner; **Proof of play** PDF download on approved, dated campaigns. The list has a **Cards / Table** layout toggle (persisted per browser under `admobi.campaigns.view`); the table adds a Created-by column once the org has more than one member. Filters show counts. Flights read "Day 6 of 14" / "Starts in 3 days" (or "14-day flight requested" before approval; `components/campaigns/flight.ts`, Nairobi calendar days), and approved cards draw a progress line (`FlightTrack`). Cards show the review note on a brief sent back, and a third figure by stage: delivery % (with health if not on track) once plays are scheduled, else Funded / Not funded, else a draft's last edit. Viewers with `reports:read` get a Delivered column in the table; delivery comes from `/reports/campaigns?range=all`, the same cached query the detail page reads. The detail page's stat cards are Budget (funded date), Creative (image/video mix) and Flight; approved, dated campaigns add a **Flight progress** card with plays delivered, delivery rate, est. impressions, spend and a Full report link; the record lists submitted and approved dates |
| `/media` | **API-backed** Media Manager against `/v1/customer/media` — upload, search, a Filter & sort menu (All files / Starred / Images / Videos / Used / Unused, sorted by newest, name or size), and a grid or list view held in `?view=list`. Org-shared folders open in place (`?folder=<id>`, and uploads land in the open folder). Stars are per person. Rename, Move to folder and delete sit in each file's menu. While loading, tiles show the LED panel skeleton (`.led-skeleton`). Files are org-wide and reusable; a file in use by a campaign can't be deleted. Video previews load on click |
| `/campaigns/new` | **Full-page** four-step wizard (Brief → Flight & budget → Creative → Review; the Creative step uploads a new file or picks one from the Media Manager), not a side sheet; resume via `?id=`; the budget step prices the flight off the shared rate card. The Review button reads **Pay KES {due} and submit** when the available balance (from the finance summary, if the viewer has `billing:read`) doesn't cover the budget, or **Submit (KES {budget} from your balance)** when it does; a `402` from submit switches it to the pay label. The campaign page shows a **Funded** / **Not funded** pill |
| `/calendar` | **API-backed** FullCalendar — drag only while editable (`draft` / `changes_requested`); submitted/approved refuse the gesture; active-budget total + statement PDF download |
| `/notifications` | Merged inbox: ops announcements + campaign lifecycle rows from `/v1/customer/notifications` |
| `/map` | mapcn/MapLibre with `@workspace/geo` Nairobi fixtures |
| `/deliveries`, `/deliveries/[id]` | Placeholder booking UI, **only when** the `deliveries` platform flag is on |
| `/reports` | Real data from `/v1/customer/reports/*`, gated on `reports:read`. Tab, date range and filters (campaign, market, format, time of day) live in the URL. A **Measurement** badge in the toolbar shows the lowest measurement level in view (booked, logged, modelled or calibrated) and opens a plain-language "How we estimate" panel. Impressions are always estimates and show their low-to-high range; reach shows only when one campaign is selected. Money (cost per 1,000, spend, budget) is hidden without `billing:read`, by the API as well as the page. **Overview** tab: headline impressions, delivery summary, pacing, what's working, campaign health ledger. Charts across Overview, Reports, a campaign report and Billing open with a one-line plain-language takeaway (`ChartCard takeaway`, helpers in `components/reports/takeaways.ts`), e.g. "Your ad was seen most in Westlands in the evening" or "Campaign A took 62% of your spend"; KPI change pills read "vs last period". |
| `/billing` (sidebar **Finance & Billing**) | Real data from `/v1/customer/finance/*`, gated on `billing:read` (without it: "Ask your account owner for billing access.", and no request is made). Overview tab: opens with a **funding statement**: the status (Healthy / Running low / Short of funds) and one sentence answering "am I covered, and until when?" ("You're covered until about 14 Dec", "Your funds run out around…", or "Your active budgets need KES X more than you have"), with **Top up** and **Request refund** beside it and balance, committed and spent (with the period delta) underneath. Then **Upcoming charges** (planned total, next charge, the next three scheduled campaigns), where the money went, and three **Shortcuts** (budget statement PDF, transactions CSV, billing help), then money in vs out and spend by campaign. The header **Top up** button shows on the other tabs only. Tabs and the date range share one row under the title; they live in the URL (`?tab=&range=` or `&from=&to=`). **Top up** (needs `billing:write`) takes an amount (whole KES 100–1,000,000) and opens Paystack hosted checkout (M-Pesa or card); bank transfers are still recorded by ops. Both money dialogs use `KesAmountInput` (`components/billing/kes-amount-input.tsx`): a `KES`-prefixed field that groups digits as you type and ignores commas, spaces and letters (top-up takes whole shillings; refund allows two decimals). The top-up dialog offers quick amounts ("Covers the shortfall" when available is negative, else "Covers the next charge" when it's more than available, then 5,000/10,000/25,000/50,000), shows available now and after the top-up, and names the problem inline when the amount is out of range. `/billing?topup=<amount>` opens it prefilled (the param is then dropped from the URL); a failed top-up's **Try again** uses it. **Request refund** (needs `billing:write`, shown when available > 0) opens a `billing` support case for up to the available amount (an amount over it is called out inline); ops refunds it to the original M-Pesa number or card. Paystack returns the payer to `/billing/payment-return?reference=`, which polls the payment every 3 s for up to 5 minutes and shows a receipt printer (the shared `ReceiptPrinter` from `@workspace/ui`) working on "Confirming payment" with the amount on its screen, then prints the receipt once settled (date, reference, M-Pesa/card, invoice number, total) and offers **View invoice** and **Back to campaign**/**Go to billing** or "Payment didn't go through" (Try again). Money paid back to the payer shows as "Refund to payer" and counts as money out. Orgs with no ledger rows see "Your funding details appear after your first top-up" rather than an alert. The **Invoices** tab lists Paystack receipts together with the quotes and invoices ops writes by hand (`/v1/customer/finance/documents`), newest first. Hand-written documents appear only once ops marks them sent (drafts are never shown), carry an Unpaid / Overdue (red), Part-paid (amber), Paid (green) or Quote / Accepted / Declined / Void pill, and download as a PDF on click. The Open and Overdue totals add the remaining balance of manual invoices. Replaces the old on-device Wallet. `/settings/billing` redirects here. |
| `/settings/support`, `/settings/support/new`, `/settings/support/[id]` | Support cases via the business API. Raising a case is its own **full page** at `/settings/support/new` — not a sheet — so it survives a reload and can be linked to directly |
| `/settings/account`, `/settings/team`, `/settings/team/roles`, `/settings/activity`, `/settings/notifications`, `/settings/tour` | Working UI — Team has Members / Roles tabs (permission matrix), **Billing details** (invoice email + KRA PIN, `billing:read` / `billing:write`), and **admin access requests** (members ask with a reason; the owner or an existing Admin approves or declines with a note, granting the "Admin" role — an org can have any number of Admins). Reviewed requests stay visible via a small note icon on the requester's row, not just while pending |
| `/invitations/[token]` | Public accept-invitation landing — shows who invited you and what accepting would replace, then **Accept** or **Decline**. Never auto-accepts. Offers **Create an account** first for signed-out visitors, since most invitees have never used Admobi |
| `/auth/login`, `/auth/signup`, … | Clerk (email code + Google), always on |

### Org permissions in the UI

`GET /v1/customer/org` returns the caller's `isOwner` and `permissions[]`. Read it through [lib/use-org.ts](../../apps/customer-web/lib/use-org.ts) (`useOrg` / `useOrgPermissions`) with the shared `orgCan()` helper rather than inferring capability from a failed request — a network blip must not read as "demoted". What this gates today:

**Owner vs Admin.** `isOwner` (displayed as "Owner") is exactly one member per org — it bypasses every permission check and is the only one who can delete the org, edit/create/delete roles, or transfer ownership. "Admin" is an ordinary, invitable starter role (`ADVERTISER_STARTER_ROLES.Admin`) holding every other permission (team, org settings, billing, campaign submission); an org can have as many Admins as it wants, either invited directly or promoted via an admin access request.

- **Campaign wizard steps stay labelled.** The stepper is pinned under the flow bar (`FlowChrome` is a fixed `h-14`, the stepper sits at `top-14`). The shared `Stepper` in `@workspace/ui` hides the per-step labels below `sm`, so on a phone it spells the current step out underneath ("Step 2 of 4 · Flight & budget") — driver-web's profile stepper gets the same.
- **Brief picks several markets and objectives.** Both are multi-select chips (aria-pressed on web); at least one market is required. They're sent as `", "`-joined lists, first = primary (see `docs/api/API.md`). The budget estimator quotes several markets at the highest zone rate and says so (`marketRateNote`); detail views, ops and ops-mobile show every selection with friendly labels (`describeCampaignObjectives`). Reports' spend-by-objective counts spend under the primary objective only.
- **Creative step has one box per panel.** A "Both panels" campaign shows a box for the taxi top (3:1) and one for the bike box (1:1), each with its own upload and Media Manager buttons, its own spec line and a "Needs artwork / N added" status. Uploads are checked against *that box's* spec, so a 1:1 file dropped in the 3:1 box is refused with the reason. There is no stored "panel" on a creative: it is read from the file's shape (`panelForCreative` in `@workspace/ops-contracts` — 3:1 and 1:1 can't both pass the 2% aspect gate). Files that fit none of the campaign's panels (e.g. bike art left after narrowing the format to taxi-top) are listed under "Doesn't fit this campaign" for removal. The 6-file cap is shared across boxes. *Skip to review* stays available (drafts don't need art), but *Submit* is disabled until `missingPanels(format, creatives)` is empty — the same check the API's submit route enforces.
- **Campaign wizard** hides *Submit for review* without `campaigns:submit` and explains why, instead of letting a Member fill in the whole flow and eat a 403 on the last click.
- **Settings nav** hides Activity without `activity:read`; the Team tab strip hides Roles without `team:manage` (and disappears entirely when only one tab is left).
- **Team settings** shows non-admins a read-only org card (name, member count, their role) rather than an error page.

Hiding is a UX affordance — the server check stays authoritative. Any mutation that can change the caller's own role must invalidate the `["customer-org"]` query key.

Campaign create/submit, creative upload (PNG/JPG/GIF/MP4 via Cloudinary private delivery), and the merged notification inbox all hit `/v1/customer/*` when auth is on. Creative thumbnails load through the authenticated file proxy (blob URL), never a Cloudinary URL.

**Funding (pay at submission).** A campaign must be funded to be submitted. Submitting funds it from the available balance in the same transaction; if the balance is short the API answers `402` with `dueKes` and the advertiser pays that amount through Paystack (`checkout`), after which the server funds and submits it with no second click. Once funded, the **budget is locked** (`PATCH` with a different `budget_kes` is `409`); dates, market, format and creative stay editable. `changes_requested` keeps the campaign funded. A rejection clears `funded_at` and the unspent budget returns to available credit (the advertiser gets a "back in your balance" notice). Each night the cron writes straight-line `screen_time` spend for approved, funded campaigns from the approval day on; budget for days before approval becomes credit when the flight ends.

The wizard's budget step is `CampaignBudgetEstimator` — not the marketing
page's simulator re-skinned. What is shared is the **mechanism**: the rate
card and `calculateCampaignEstimate()` live in `@workspace/ops-contracts`
(`pricing.ts`), pure TypeScript with no React or DOM, so `apps/web`'s pricing
page, this wizard, and the Expo app all price against one set of numbers.
Only the layout is per-surface.

The estimator is campaign-shaped because the wizard already knows the brief:

- **Market decides the zone** (`zoneForMarket()`), so nobody re-picks
  "Premium estates" after choosing Kilimani in step one.
- **Format decides the model.** A `taxi_top` campaign is priced per play; a
  `delivery_bike` campaign is priced per side, per bike, per day, because a
  bike enclosure is static and a booked side is exclusive for the flight —
  quoting bikes off the per-play rate would be wrong, not just imprecise. A
  `both` campaign is the sum of the two, since it books both panels.
- **Flight dates decide the length** (`flightDaysBetween()`), so there is no
  second days control to disagree with them.

What is left is what the wizard genuinely can't know: screens, slot length,
plays per day, bikes, sides. The apply button writes the estimate into the
budget field.

The calendar's "Active campaign budget" counts approved campaigns whose flight
is `live` or `scheduled`, matching `isActive()` in
`apps/api/lib/campaigns/campaign-statement.ts` so the figure on screen equals the one in
the downloaded statement. Both PDF downloads go through `useDownloadPdf()` —
the API is a separate authenticated origin, so the bytes are fetched with the
bearer token and handed to the browser as a blob, never linked to directly.

- `GET /api/health` on this app for deploy smoke tests (separate from `api.admobihq.com/v1/health`)
- Builds & APKs: [MOBILE-BUILDS.md](../shared/MOBILE-BUILDS.md)

### Loading skeletons

Every page here is a thin server component wrapping a client component that
fetches through react-query, so the server render finishes instantly and
`loading.tsx` is on screen for barely a frame — the wait people actually see is
the client one. A route's `loading.tsx` and its view's `isPending` branch must
therefore render the **same** skeleton component (`components/skeletons/*`), or
the page shows two differently-shaped skeletons back to back and shifts twice.

The dashboard pages (Overview, Billing, Reports, a campaign report) follow this with
[`components/skeletons/dashboard-skeletons.tsx`](../../apps/customer-web/components/skeletons/dashboard-skeletons.tsx),
one skeleton per tab built from the shared primitives in `@workspace/ui`
(`dashboard/dashboard-skeletons.tsx`). Each mirrors its tab's real card grid, so
change a tab's layout and its skeleton together. Ledger tabs show a table
skeleton on first load only; the queries use `keepPreviousData`, so paging or
filtering keeps the table (and the search box's focus) on screen.

`/campaigns/new` additionally needs its own `loading.tsx`: the wizard is a
`fixed inset-0` overlay, so inheriting `campaigns/loading.tsx` would flash the
campaign *list* skeleton inside the app shell before the overlay takes over.
`NewCampaignChrome` / `NewCampaignSkeleton` are shared by the route loader and
the screen's own pending branch.

### Stale-deploy reload

A tab left open across a deploy still references the previous build's content-hashed `_next/static` chunks. Those now 404, and Vercel's HTML fallback shows up as a "non-JavaScript MIME type" error or a failed dynamic `import()`. [`lib/stale-deploy-reload.ts`](../../apps/customer-web/lib/stale-deploy-reload.ts) catches both cases and reloads the page **once per tab session**, so a genuinely broken deploy still surfaces as an error on the second load instead of looping. It is wired twice in the root layout:

- `StaleDeployBlockingScript`: an inline `<script>` in `<head>`, placed before any module script, so it can catch a chunk that fails before React hydrates.
- `StaleDeployReload`: a client component that handles chunk failures after hydration.

Only `_next/static` failures trigger the reload. Analytics, ad-blocker, and image failures are ignored.

## Secrets (Infisical)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_APP_URL` | Recommended | `http://localhost:3002` (dev), `https://app.admobihq.com` (prod) |
| `NEXT_PUBLIC_WEB_URL` | Optional | Link back to marketing site |
| `NEXT_PUBLIC_OPS_URL` | Optional | Cross-link to ops console |
| `NEXT_PUBLIC_API_URL` | Yes (for support, announcements, flags) | Business API origin |
| `NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY`, `CUSTOMER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY` | Required | Customer Clerk instance — see [AUTH.md](../shared/AUTH.md) §4 |

No database vars on this app — Prisma lives in `apps/api` / `apps/web`. Auth is the one exception, see [AUTH.md](../shared/AUTH.md).

### Pull locally

```bash
npm run env:pull -w customer-web
npm run env:check -w customer-web
npm run dev:customer-web
```

Or start with all core apps: `npm run dev`.

## Vercel

Separate Vercel project (third customer-facing app; fourth in the monorepo):

| Setting | Value |
|---------|--------|
| Root Directory | `apps/customer-web` |
| Include files outside root | **Enabled** |
| Production Branch | `master` |
| Build | `cd ../.. && npm run build -w customer-web` if default fails |

Sync **only app env vars** from Infisical — not the full web secret set. Include customer Clerk keys (`NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY`, `CUSTOMER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY`).

Domains: `app.admobihq.com` (prod), `app.staging.admobihq.com` (`staging` branch).
