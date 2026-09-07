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
| `/` Overview | **API-backed** — live / in-review / needs-you counts and committed budget derived from `/v1/customer/campaigns`; recent activity is the merged notification inbox. No impressions, delivery-rate or spend tiles: nothing serves those yet |
| `/campaigns`, `/campaigns/[id]` | **API-backed** — list/detail against `/v1/customer/campaigns`; status + review-reason banner; **Proof of play** PDF download on approved, dated campaigns |
| `/campaigns/new` | **Full-page** four-step wizard (Brief → Flight & budget → Creative → Review), not a side sheet; resume via `?id=`; the budget step prices the flight off the shared rate card |
| `/calendar` | **API-backed** FullCalendar — drag only while editable (`draft` / `changes_requested`); submitted/approved refuse the gesture; active-budget total + statement PDF download |
| `/notifications` | Merged inbox: ops announcements + campaign lifecycle rows from `/v1/customer/notifications` |
| `/map` | mapcn/MapLibre with `@workspace/geo` Nairobi fixtures |
| `/deliveries`, `/deliveries/[id]` | Placeholder booking UI, **only when** the `deliveries` platform flag is on |
| `/reports` | **Coming soon** |
| `/settings/billing` | Wallet/billing view (no payment gateway) |
| `/settings/support`, `/settings/support/[id]` | Support cases via the business API |
| `/settings/account`, `/settings/notifications`, `/settings/tour` | Working UI |
| `/auth/login`, `/auth/signup`, … | Clerk (email code + Google), gated by `NEXT_PUBLIC_AUTH_ENABLED` |

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
`apps/api/lib/campaign-statement.ts` so the figure on screen equals the one in
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

## Secrets (Infisical)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_APP_URL` | Recommended | `http://localhost:3002` (dev), `https://app.admobihq.com` (prod) |
| `NEXT_PUBLIC_WEB_URL` | Optional | Link back to marketing site |
| `NEXT_PUBLIC_OPS_URL` | Optional | Cross-link to ops console |
| `NEXT_PUBLIC_API_URL` | Yes (for support, announcements, flags) | Business API origin |
| `NEXT_PUBLIC_AUTH_ENABLED` | Local-only, not in Infisical | Gates whether Clerk mounts at all — see [AUTH.md](../shared/AUTH.md) §4 |
| `NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY`, `CUSTOMER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY` | Required when auth is enabled | Customer Clerk instance — see [AUTH.md](../shared/AUTH.md) §4 |

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

Sync **only app env vars** from Infisical — not the full web secret set. Include customer Clerk keys when `NEXT_PUBLIC_AUTH_ENABLED=true`.

Domains: `app.admobihq.com` (prod), `app.staging.admobihq.com` (`staging` branch).
