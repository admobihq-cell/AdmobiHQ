# Live Updates and Toasts (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Advertiser web and ops web update in place when something changes server-side, and say so with a BoardUI-style toast with an optional soft sound.

**Architecture:** API writers call `publishLive(channels, event)`, which runs Upstash Redis `PUBLISH` and carries topic and ids only. Two SSE routes (`/v1/customer/live`, `/v1/ops/live`) subscribe the caller to their channels through `@upstash/redis`'s streaming `subscribe()` and forward events. Each app's `useLiveEvents` hook reads the stream with `fetch` (EventSource can't send the bearer token), invalidates the TanStack Query keys the screen already uses, and raises a toast worded from the refetched data. For advertisers, the notification row is the event: every customer notification insert already goes through three helpers, so publishing there covers campaign decisions, payments and org events in one place.

**Tech Stack:** `@upstash/redis` 1.38 (already installed; `subscribe()` verified 2026-11-21 with a ~0.9 s round trip), Next.js route handlers streaming on the Node runtime, sonner 1.7, Web Audio API, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-21-search-realtime-charts-design.md` (sections "2. Live updates" and "3. Toasts and sound").

## Global Constraints

- Branch `feat/search-live-charts`. Stage by path; never stage `apps/*/android/**`. No Co-Authored-By trailer and no "Generated with Claude Code" line.
- Never wake Neon from the live path. No polling, no DB connection held by a stream. The stream route does one auth lookup (cached) and then only talks to Upstash.
- Events carry `{ topic, id?, type?, actor? }` only: never names, amounts or text. Clients re-fetch through the existing permission-checked endpoints.
- `publishLive` never throws and never fails the write it follows (fire-and-forget, errors logged).
- With Upstash env missing, the stream routes return 204 and the client hook stays idle (today's behaviour).
- Stream: `export const maxDuration = 300`; the server closes at 280 s; a heartbeat comment every 25 s; the client reconnects with backoff (1 s, 2 s, 5 s, 10 s, capped at 30 s), stops while the tab has been hidden for more than 5 minutes, and resumes on visibility.
- Sound plays only for toasts, only after the page has had a user gesture, and only if not muted. Mute is per device in localStorage key `admobi-live-sound-muted` (try/catch).
- No toast for the viewer's own action (event `actor === viewer`); the data still refreshes.
- Vitest: run from `C:/Users/...` with an uppercase drive letter. Run `graphify update .` after code changes. Document in `docs/` in the same change.
- Reduced motion: toasts appear without a spring and the countdown bar is static.

## Review Focus

1. **Stream dropped by a proxy, laptop sleep or deploy:** the client reconnects and refetches once on reconnect, so nothing missed during the gap stays stale. Test in Task 1 (backoff schedule) and Task 5 (invalidate-on-reconnect).
2. **A burst of events** (bulk review approving 20 campaigns): at most 3 toasts and one coalesced refetch per query key, with no toast storm. Test in Task 5.
3. **A member without `billing:read`:** never receives billing toasts, because billing rows are only inserted for billing readers and are published to user channels. Test in Task 2.
4. **Two tabs open:** each gets the event, and sound plays in only one. Done with a `BroadcastChannel("admobi-live-sound")` claim, verified by hand in Task 7.
5. **A token that expires mid-stream:** the stream ends at 280 s at the latest, and the reconnect fetches a fresh token through `getToken()`. Covered by the 280 s close plus the Task 1 reconnect logic.

---

### Task 1: Live event contract and SSE parser

**Files:**
- Create: `packages/ops-contracts/src/live.ts`, `packages/ops-contracts/src/live.test.ts`
- Modify: `packages/ops-contracts/src/index.ts`

**Interfaces — Produces:**

```ts
export const LIVE_TOPICS = ["notification", "campaign", "payment", "billing-document", "review-queue", "support", "sos", "application"] as const
export type LiveTopic = (typeof LIVE_TOPICS)[number]
export type LiveEvent = { topic: LiveTopic; id?: number; type?: string; actor?: string }
export function isLiveEvent(value: unknown): value is LiveEvent
/** Splits an SSE text buffer into complete `data:` payloads; `rest` is the unfinished tail. Comment lines (": ping") are skipped. Invalid JSON and non-LiveEvent payloads are dropped. */
export function parseSseChunk(buffer: string): { events: LiveEvent[]; rest: string }
/** Reconnect delay in ms for attempt n (0-based): 1000, 2000, 5000, 10000, then 30000. */
export function reconnectDelay(attempt: number): number
```

- [ ] **Step 1: Write the failing tests:** `parseSseChunk` on two complete events plus a partial third returns 2 events and the partial as `rest`; a `": ping\n\n"` comment yields nothing; `data: {"topic":"bogus"}` is dropped; CRLF line endings parse. `reconnectDelay([0,1,2,3,4,9])` equals `[1000,2000,5000,10000,30000,30000]`.
- [ ] **Step 2:** Run `npx vitest run src/live.test.ts` in `packages/ops-contracts`. Expect FAIL (module missing).
- [ ] **Step 3:** Implement. Events are separated by a blank line; join multiple `data:` lines with `\n` before `JSON.parse`.
- [ ] **Step 4:** Re-run and expect PASS, then run `npx tsc --noEmit`.
- [ ] **Step 5:** Commit `feat(contracts): live event type and SSE parser`.

---

### Task 2: Publishing from the API

**Files:**
- Create: `apps/api/lib/realtime.ts`, `apps/api/lib/realtime.test.ts`
- Modify: `apps/api/lib/advertiser/advertiser-notify.ts` (`fanOutCustomerCampaignNotice`, `notifyCustomerUsers`), `apps/api/lib/payments/money-notify.ts` (`inboxOnly`), `apps/api/lib/campaigns/submit-campaign.ts`, `apps/api/app/v1/payments/paystack/webhook/route.ts` (success branch), `apps/api/app/v1/public/support/route.ts`, `apps/api/app/v1/driver/sos/route.ts`, `apps/api/app/v1/driver/profile/submit/route.ts`, `apps/api/app/v1/ops/billing-documents/[id]/status/route.ts` (on `sent`), `apps/api/app/v1/ops/billing-documents/[id]/payments/route.ts`
- Test: extend `apps/api/app/v1/ops/billing-documents/[id]/actions.test.ts`

**Interfaces:**
- Consumes: `LiveEvent` (Task 1).
- Produces:

```ts
export const liveChannel = { user: (clerkUserId: string) => `user:${clerkUserId}`, org: (orgId: number) => `org:${orgId}`, ops: "ops" } as const
/** Fire-and-forget Upstash PUBLISH to each channel. No-op without UPSTASH_REDIS_REST_URL/TOKEN. Never throws. */
export function publishLive(channels: string[], event: LiveEvent): Promise<void>
```

  Call sites (each passes ids only):

| Site | Channels | Event |
|---|---|---|
| every `customerNotification.createMany` in the 3 helpers | `user:<recipient>` for each recipient | `{ topic: "notification", type: input.type, actor? }` |
| `fanOutCustomerCampaignNotice` gets an optional `actorUserId`; `submit-campaign` passes the submitter | — | sets `actor` |
| `submit-campaign` | `ops` | `{ topic: "review-queue", id: campaignId }` |
| Paystack webhook, payment applied | `org:<orgId>`, `ops` | `{ topic: "payment", id: paymentId }` |
| `public/support` create | `ops` | `{ topic: "support", id }` |
| `driver/sos` create | `ops` | `{ topic: "sos", id }` |
| `driver/profile/submit` | `ops` | `{ topic: "application", id: profileId }` |
| billing document → `sent` | `org:<orgId>` + a new inbox row for billing readers via `notifyCustomerUsers` (type `billing_document_sent`, title "New invoice INV/…" or "New quote QT/…", href `/billing?tab=invoices`) | `{ topic: "billing-document", id }` |
| billing document payment recorded | same, type `billing_document_payment`, title "Payment recorded on INV/…" | `{ topic: "billing-document", id }` |

- [ ] **Step 1: Write the failing tests:**
  - `realtime.test.ts`: with the env unset, `publishLive(["x"], { topic: "sos" })` resolves without calling fetch. With the env set and a mocked `Redis.publish` that rejects, it resolves (never throws) and logs once.
  - `actions.test.ts`: `"sending a document notifies the org's billing readers"`. After `status → sent`, a `customer_notifications` row with type `billing_document_sent` exists for a member holding `billing:read`, and none for a member without it.
- [ ] **Step 2:** Run `npx vitest run lib/realtime.test.ts "app/v1/ops/billing-documents"` in `apps/api`. Expect FAIL.
- [ ] **Step 3:** Implement `realtime.ts` with one lazily created `Redis` client (same env as `lib/rate-limit.ts`), using `Promise.allSettled` over channels. Wire every call site with `void publishLive(...)` after the DB write commits.
- [ ] **Step 4:** Re-run those tests plus the whole `app/v1/campaigns`, `app/v1/payments` and `lib/payments` folders (regression). Expect PASS.
- [ ] **Step 5:** Commit `feat(api): publish live events on notifications, payments, documents and ops queues`.

---

### Task 3: SSE stream routes

**Files:**
- Create: `apps/api/lib/live-stream.ts`, `apps/api/app/v1/customer/live/route.ts`, `apps/api/app/v1/ops/live/route.ts`, `apps/api/app/v1/customer/live/route.test.ts`
- Modify: `apps/api/lib/route-catalog.ts` (two notes)

**Interfaces:**
- Consumes: `liveChannel` (Task 2); `requireCustomerAccess()` (→ `userId`, `orgId`); `requireOpsAccess()`.
- Produces: `liveStreamResponse(req: Request, channels: string[]): Response`. The response has `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform` and `X-Accel-Buffering: no`. It writes `: connected\n\n` first, then `data: <json>\n\n` per message and `: ping\n\n` every 25 s, closes at 280 s, and unsubscribes on `req.signal` abort or close. Without Upstash env it returns `new Response(null, { status: 204 })`.
  - Customer channels: `user:<userId>` and `org:<orgId>`. Ops channels: `ops`.
  - Both routes set `export const maxDuration = 300` and `export const dynamic = "force-dynamic"`.
- [ ] **Step 1: Write the failing tests** (mock `requireCustomerAccess`):
  - `"returns 204 without Upstash"`: delete the env vars, then `GET` → 204.
  - `"streams a published event"` with `describe.skipIf(!process.env.UPSTASH_REDIS_REST_URL)`: open the stream, call `publishLive([liveChannel.org(orgId)], { topic: "payment", id: 1 })` after the `: connected` chunk, then read until a `data:` line. `parseSseChunk` yields `{ topic: "payment", id: 1 }`. Abort the request at the end.
- [ ] **Step 2:** Run in `apps/api`. Expect FAIL.
- [ ] **Step 3:** Implement on a `ReadableStream` and `redis.subscribe(channels)` (`subscriber.on("message", …)`).
- [ ] **Step 4:** Re-run, plus `lib/route-catalog.test.ts`. Expect PASS.
- [ ] **Step 5:** Commit `feat(api): SSE live streams for advertisers and ops`.

---

### Task 4: Toast, sound and the live hook in `packages/ui`

**Files:**
- Create: `packages/ui/src/lib/sounds.ts`, `packages/ui/src/components/live-toast.tsx`, `packages/ui/src/lib/live-events.ts`

**Interfaces:**
- Consumes: `LiveEvent`, `parseSseChunk`, `reconnectDelay` (Task 1).
- Produces:

```ts
// sounds.ts
export type SoundName = "chime" | "ping" | "low"
export function playSound(name: SoundName): void   // Web Audio, ~180 ms, soft sine/triangle; no-op if muted, no gesture yet, or another tab holds the BroadcastChannel claim
export function useSoundMuted(): [muted: boolean, setMuted: (v: boolean) => void]
// live-toast.tsx
export function liveToast(t: { title: string; body?: string; tone?: "info" | "success" | "warning"; icon?: LucideIcon; at?: string; action?: { label: string; href: string }; sound?: SoundName }): void
// live-events.ts
export function useLiveEvents(opts: { url: string | null; getToken: () => Promise<string | null>; onEvent: (e: LiveEvent) => void; onReconnect?: () => void }): void
```

  Toast look (BoardUI notification): a `rounded-xl border bg-popover shadow-lg` card, 360 px wide. Tone icon tile on the left (success lime, warning amber, info sky, using existing tokens), title `text-sm font-medium`, body `text-xs text-muted-foreground` clamped to 2 lines, relative time ("now") top right, optional action as an outline `size="sm"` button that navigates. A 2 px countdown bar along the bottom runs over 6 s (warning tone: 12 s), pauses on hover via `animation-play-state`, and is static under reduced motion. Built on `toast.custom(..., { duration })`, so sonner keeps stacking, swipe and focus handling. SOS (warning) toasts stay until dismissed (`duration: Infinity`).

- [ ] **Step 1:** Implement all three.
- [ ] **Step 2:** Run `npx tsc --noEmit` and `npx eslint src/lib src/components/live-toast.tsx` in `packages/ui`. Expect clean.
- [ ] **Step 3:** Commit `feat(ui): live toast, UI sounds and live events hook`.

---

### Task 5: Advertiser web wiring

**Files:**
- Create: `apps/customer-web/components/shell/live-updates.tsx`, `apps/customer-web/lib/live-routing.ts`, `apps/customer-web/lib/live-routing.test.ts` (if customer-web has no vitest config, put `live-routing.ts` and its test in `packages/ops-contracts/src/live-routing.ts` instead and ledger the ruling)
- Modify: `apps/customer-web/components/shell/app-shell.tsx` (mount `<LiveUpdates />`), `apps/customer-web/components/settings/notifications-settings-view.tsx` (a "Play a sound with live alerts" switch wired to `useSoundMuted`)

**Interfaces:**
- Produces: `keysForEvent(e: LiveEvent): string[][]`, a pure mapping to query-key prefixes:
  - `notification` → `["customer-notifications"]`, plus `["customer-campaigns"]` and `["customer-campaign"]` when `type` starts with `campaign_`, plus `["customer-analytics"]` when `type` starts with `payment_`, `refund_`, `billing_document_` or `top_up`.
  - `payment` → `["customer-analytics"]`, `["customer-payment"]`.
  - `billing-document` → `["customer-analytics", "billing-documents"]`, `["customer-analytics", "invoices"]`.
  - `campaign` → `["customer-campaigns"]`, `["customer-campaign", id]`.
- Behaviour of `LiveUpdates`:
  - Coalesces invalidations for 300 ms, so a burst of events triggers one refetch per key.
  - On `onReconnect`, invalidates `["customer-notifications"]` and `["customer-analytics"]`.
  - On `notification` events whose `actor !== userId`: after the refetch, it toasts the unread notification rows created after the stream connected and not yet toasted (tracked as a `Set` of ids). At most 3 per burst; above that, one summary toast ("5 new updates", action "Open inbox" → `/notifications`).
  - Toast tone: `campaign_approved` and `payment_*` are success with `ping`; `campaign_rejected` and `campaign_changes_requested` are warning with `low`; everything else is info with `chime`. The action is "View" → the row's `href`.
- [ ] **Step 1: Write the failing test:** `keysForEvent` cases for every topic above, including `{ topic: "notification", type: "campaign_approved" }` → includes `["customer-campaigns"]`, and `{ topic: "notification", type: "invite_declined" }` → only `["customer-notifications"]`.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement `live-routing.ts`, `LiveUpdates` (url = `${apiPublicUrl()}/v1/customer/live`), the mount and the settings switch.
- [ ] **Step 4:** Run the test, `tsc` and `eslint` for customer-web. Expect PASS and clean.
- [ ] **Step 5:** Commit `feat(customer-web): live updates with toasts and a sound toggle`.

---

### Task 6: Ops web wiring

**Files:**
- Create: `apps/ops/components/shell/ops-live-updates.tsx`
- Modify: `apps/ops/components/shell/ops-shell.tsx` (mount it), `apps/ops/app/(dashboard)/notifications/` page header (sound switch via `useSoundMuted`)

**Interfaces:**
- Consumes: `useLiveEvents`, `liveToast`, `useOpsClient` (for the token and base URL as `useOpsNotifications` already gets them), the `ops-notifications` query keys in `apps/ops/lib/use-ops-notifications.ts`.
- Produces: `OpsLiveUpdates({ role, permissions })`:

| topic | invalidate | toast (only if the role can see it) |
|---|---|---|
| `sos` | `["ops-notifications","safety"]`, `["ops-sos"]` | warning, `low`, sticky: "SOS reported", action "Respond" → `/sos/<id>` (needs `safety`) |
| `review-queue` | `["ops-campaigns"]` | info, `chime`: "Campaign submitted for review", action "Review" → `/campaigns/<id>` (needs `campaigns`) |
| `payment` | — | success, `ping`: "Payment received", action "Ledger" → `/finances?tab=ledger` (needs `finances`) |
| `support` | `["ops-notifications","support"]`, `["ops-support"]` | info, `chime`: "New support case", action "Open" → `/support/<id>` (needs `support`) |
| `application` | `["ops-notifications","applications"]`, `["ops-driver-applications"]` | info, `chime`: "New driver application", action "Review" → `/driver-applications/<id>` (needs `driver_applications`) |

  Every event also calls `router.refresh()`, debounced to 1 s, so the server-rendered sidebar `pendingCounts` update. Toasts don't fire for events the role can't see, but their invalidations still run, which is harmless because hidden queries are disabled.
- [ ] **Step 1:** Implement and mount it.
- [ ] **Step 2:** Run `tsc` and `eslint` for ops. Expect clean.
- [ ] **Step 3:** Commit `feat(ops): live queue updates with toasts`.

---

### Task 7: End-to-end check, docs, graph

**Files:**
- Modify: `docs/api/API.md` (live streams: channels, event shape, 204 fallback, 280 s close), `docs/customer/APP.md` (live updates + sound toggle), `docs/ops/OPS-ADMIN.md` (live toasts table), `docs/shared/ARCHITECTURE.md` (one paragraph: Upstash pub/sub carries ids only; why not polling, which keeps Neon awake).

- [ ] **Step 1:** Run the Task 3 streaming test against the real Upstash and expect PASS. Then, with `npm run dev` running and signed in:
  - Approve a campaign in ops; within about 2 s the advertiser tab updates the status and toasts with a sound.
  - Submit a campaign as an advertiser; the ops tab toasts and the sidebar count goes up.
  - With two advertiser tabs open, only one plays the sound.
  - Toggle mute and confirm silence.
  - Kill the API for 10 s and restart it; the tab reconnects without a page reload.
- [ ] **Step 2:** Write the docs.
- [ ] **Step 3:** Run `npm test -w api -w @workspace/ops-contracts` and expect PASS (`lib/billing/pdf-props.test.ts` is order-flaky and predates this branch; note it if it fails). Then run `graphify update .`.
- [ ] **Step 4:** Commit `docs: live updates and toasts`.

## Decided while planning (from the spec)

- **Ops "unseen-payments badge":** ops has no payments badge today, and the bell is an attention queue built from 8 sources. Phase 2 ships the payment toast plus ledger refresh. A badge would mean a new notification source, so it waits for an ask.
- **Toast wording comes from notification rows** (advertiser) and from static copy plus ids (ops). No extra endpoint is needed.
