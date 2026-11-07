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
| `/campaigns`, `/campaigns/[id]` | **API-backed** — list/detail against `/v1/customer/campaigns`; status + review-reason banner; **Proof of play** PDF download on approved, dated campaigns. The list has a **Cards / Table** layout toggle (persisted per browser under `admobi.campaigns.view`); the table adds a Created-by column once the org has more than one member |
| `/media` | **API-backed** Media Manager against `/v1/customer/media` — upload, search, a Filter & sort menu (All files / Starred / Images / Videos / Used / Unused, sorted by newest, name or size), and a grid or list view held in `?view=list`. Org-shared folders open in place (`?folder=<id>`, and uploads land in the open folder). Stars are per person. Rename, Move to folder and delete sit in each file's menu. While loading, tiles show the LED panel skeleton (`.led-skeleton`). Files are org-wide and reusable; a file in use by a campaign can't be deleted. Video previews load on click |
| `/campaigns/new` | **Full-page** four-step wizard (Brief → Flight & budget → Creative → Review; the Creative step uploads a new file or picks one from the Media Manager), not a side sheet; resume via `?id=`; the budget step prices the flight off the shared rate card |
| `/calendar` | **API-backed** FullCalendar — drag only while editable (`draft` / `changes_requested`); submitted/approved refuse the gesture; active-budget total + statement PDF download |
| `/notifications` | Merged inbox: ops announcements + campaign lifecycle rows from `/v1/customer/notifications` |
| `/map` | mapcn/MapLibre with `@workspace/geo` Nairobi fixtures |
| `/deliveries`, `/deliveries/[id]` | Placeholder booking UI, **only when** the `deliveries` platform flag is on |
| `/reports` | Real data from `/v1/customer/reports/*`, gated on `reports:read`. Tab, date range and filters (campaign, market, format, time of day) live in the URL. A **Measurement** badge in the toolbar shows the lowest measurement level in view (booked, logged, modelled or calibrated) and opens a plain-language "How we estimate" panel. Impressions are always estimates and show their low-to-high range; reach shows only when one campaign is selected. Money (cost per 1,000, spend, budget) is hidden without `billing:read`, by the API as well as the page. **Overview** tab: headline impressions, delivery summary, pacing, what's working, campaign health ledger. |
| `/billing` (sidebar **Finance & Billing**) | Real data from `/v1/customer/finance/*`, gated on `billing:read` (without it: "Ask your account owner for billing access.", and no request is made). Overview tab: balance (all-time), available, spent, committed, where the money went, money in vs out, spend by campaign, then a closing row of **Wallet** (runway, committed, next charge, funding status), **Upcoming charges** (planned total and the next three scheduled campaigns) and a **Top up** card above an icon-grid of **Shortcuts**. Tabs and the date range share one row under the title; they live in the URL (`?tab=&range=` or `&from=&to=`). **Top up** only opens a notice, since online payments are not live; funds are added by the account manager. Orgs with no ledger rows see "Your funding details appear after your first top-up" rather than an alert. Replaces the old on-device Wallet. `/settings/billing` redirects here. |
| `/settings/support`, `/settings/support/new`, `/settings/support/[id]` | Support cases via the business API. Raising a case is its own **full page** at `/settings/support/new` — not a sheet — so it survives a reload and can be linked to directly |
| `/settings/account`, `/settings/team`, `/settings/team/roles`, `/settings/activity`, `/settings/notifications`, `/settings/tour` | Working UI — Team has Members / Roles tabs (permission matrix), **Billing details** (invoice email + KRA PIN, `billing:read` / `billing:write`), and **admin access requests** (members ask with a reason; the owner or an existing Admin approves or declines with a note, granting the "Admin" role — an org can have any number of Admins). Reviewed requests stay visible via a small note icon on the requester's row, not just while pending |
| `/invitations/[token]` | Public accept-invitation landing — shows who invited you and what accepting would replace, then **Accept** or **Decline**. Never auto-accepts. Offers **Create an account** first for signed-out visitors, since most invitees have never used Admobi |
| `/auth/login`, `/auth/signup`, … | Clerk (email code + Google), always on |

### Org permissions in the UI

`GET /v1/customer/org` returns the caller's `isOwner` and `permissions[]`. Read it through [lib/use-org.ts](../../apps/customer-web/lib/use-org.ts) (`useOrg` / `useOrgPermissions`) with the shared `orgCan()` helper rather than inferring capability from a failed request — a network blip must not read as "demoted". What this gates today:

**Owner vs Admin.** `isOwner` (displayed as "Owner") is exactly one member per org — it bypasses every permission check and is the only one who can delete the org, edit/create/delete roles, or transfer ownership. "Admin" is an ordinary, invitable starter role (`ADVERTISER_STARTER_ROLES.Admin`) holding every other permission (team, org settings, billing, campaign submission); an org can have as many Admins as it wants, either invited directly or promoted via an admin access request.

- **Campaign wizard** hides *Submit for review* without `campaigns:submit` and explains why, instead of letting a Member fill in the whole flow and eat a 403 on the last click.
- **Settings nav** hides Activity without `activity:read`; the Team tab strip hides Roles without `team:manage` (and disappears entirely when only one tab is left).
- **Team settings** shows non-admins a read-only org card (name, member count, their role) rather than an error page.

Hiding is a UX affordance — the server check stays authoritative. Any mutation that can change the caller's own role must invalidate the `["customer-org"]` query key.

Campaign create/submit, creative upload (PNG/JPG/GIF/MP4 via Cloudinary private delivery), and the merged notification inbox all hit `/v1/customer/*` when auth is on. Creative thumbnails load through the authenticated file proxy (blob URL), never a Cloudinary URL.

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
