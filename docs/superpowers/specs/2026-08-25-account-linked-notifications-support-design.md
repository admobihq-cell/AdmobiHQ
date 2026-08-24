# Account-linked notifications & support, with web announcements

## Problem

Authentication (Clerk, three separate instances: ops / driver / customer) is now mandatory in
`driver-mobile` and `customer-mobile` (`AuthGate` forces sign-in before any screen renders), but
notifications and support never followed:

- `CustomerPushToken` / `DriverPushToken` only ever store `anonymous_device_id`. There is no
  `clerk_user_id` anywhere on the notification path.
- `AnnouncementBroadcast` sends one identical title/body to every token targeting an app — no
  merge fields, no per-recipient identity.
- `/v1/public/announcements?app=X` (what the mobile notifications screen reads) returns "the last
  30 broadcasts ever sent to this app," unauthenticated and unscoped by recipient. A user who
  installs today sees broadcasts sent before they ever had the app.
- `SupportCase` already has a nullable `customer_id → Customer` FK, explicitly commented as a
  dormant scaffold for real customer auth — never populated. Drivers have no equivalent link at
  all.
- Announcements can only target `customer-mobile` / `driver-mobile`. There is no way to reach
  `customer-web` or `driver-web` users. `driver-web` separately has its own per-account
  notification system (`DriverNotification` + `NotificationBell`) for application-lifecycle
  events only (submitted/approved/rejected/changes_requested) — proof this per-recipient pattern
  already works in production, just not wired to ops announcements. `customer-web` has no
  notification UI at all.

## Goals

1. Tie push tokens and support cases to the signed-in Clerk account (both mobile apps, symmetrically).
2. Let ops write one announcement with a `{{first_name}}` merge field, personalized per recipient
   at send time.
3. Extend announcements to `customer-web` and `driver-web`, with ops choosing any combination of
   the four target apps.
4. A recipient only ever sees announcements sent while they were an eligible recipient — never
   history from before they joined.
5. Signed-in support cases auto-fill from the account and are looked up by account, not by
   re-proving an email via identity token.

## Non-goals (explicitly out of scope this round)

- Real per-user/segment targeting (picking specific users or cohorts) — merge-field
  personalization into one broadcast per app-selection only.
- Browser push notifications (service worker + VAPID + permission prompts) for the web apps — web
  delivery is an authenticated in-app inbox (bell), matching `driver-web`'s existing pattern, not
  OS-level push.
- A separate, longer message field for web-only sends — the existing 65/178-char push-banner
  limits stay shared across all four target apps for this pass.
- Backfilling `AnnouncementDelivery` rows for broadcasts sent before this ships.

## Design

### 1. Data model (`apps/web/prisma/schema.prisma`)

- Add `clerk_user_id String?` (indexed) to `CustomerPushToken` and `DriverPushToken`, mirroring
  the existing `OpsPushToken`. Keep `anonymous_device_id` — not removed, still the fallback for
  any pre-auth window and as a dedup/cleanup key.
- Add `driver_clerk_user_id String?` (indexed) directly on `SupportCase`. No FK relation — this
  matches the existing convention in this schema of storing raw Clerk IDs as plain strings
  (`assigned_to_clerk_id`, `sent_by_clerk_id`, `SupportMessage.author_clerk_id`) rather than
  forcing a join table. `customer_id` (existing FK to `Customer`) is the equivalent for the
  customer side and just needs populating.
- New `AnnouncementDelivery` model: one row per (broadcast, recipient), written at send time.

  ```prisma
  model AnnouncementDelivery {
    id            Int       @id @default(autoincrement())
    broadcast_id  Int
    broadcast     AnnouncementBroadcast @relation(fields: [broadcast_id], references: [id], onDelete: Cascade)
    clerk_user_id String
    app           String    // one of ANNOUNCEMENT_TARGET_APPS
    title         String    // already personalized (merge field rendered)
    body          String
    image_url     String?
    category      String
    read_at       DateTime?
    created_at    DateTime  @default(now())

    @@index([clerk_user_id, app, created_at])
    @@index([broadcast_id])
    @@map("announcement_deliveries")
  }
  ```

  This becomes the single source of truth for "what has this account received," on both mobile
  and web, replacing the raw `target_apps`-filtered query. It also gives ops real per-recipient
  delivery/read visibility, which today only exists in aggregate (`delivered_count`,
  `invalid_count`) on `AnnouncementBroadcast`.

### 2. Push token registration becomes authenticated

Both mobile apps already force sign-in before any screen renders, so a Clerk session token is
always available by the time `registerCustomerPushToken()` / its driver twin runs.

- Client: send `Authorization: Bearer <token>` (from Clerk's `getToken()`) alongside the existing
  `anonymousDeviceId`.
- Server: new `requireCustomerUser()` in `apps/api/lib/customer-auth.ts`, mirroring the existing
  `requireDriverUser()` in `apps/api/lib/driver-auth.ts` (verify against
  `CUSTOMER_CLERK_SECRET_KEY` via `@clerk/backend`'s `verifyToken`). `apps/api/app/v1/push-tokens`
  (the ops one) is the exact template already in the codebase: verify → `access.userId` → upsert
  with `clerk_user_id`.
- `apps/api/app/v1/public/push-tokens/route.ts` and its driver equivalent switch from "public,
  unauthenticated" to "authenticated, but degrade gracefully": if no/invalid bearer token is
  present, still upsert with `anonymous_device_id` only (don't break push registration for an
  edge case where auth hasn't finished loading yet) — but always attach `clerk_user_id` when a
  valid token is present.

### 3. Personalization at send time

`buildMessage()` in `apps/api/lib/push/broadcast-announcement.ts` currently renders the same
title/body for every token. This changes to render per-recipient:

- `collectTargetTokens()` also returns each token's `clerk_user_id` (now available per #2).
- One batched Clerk lookup per audience (`clerkClient.users.getUserList({ userId: [...] })`) using
  the *right* Clerk instance per audience (customer vs driver) to fetch `firstName`.
- `buildMessage(row, name)` replaces `{{first_name}}` in the ops-authored title/body. Recipients
  with no linked `clerk_user_id` (not yet migrated, or a stray anonymous token) fall back to the
  unpersonalized template — nobody is dropped from the send because of this.
- The same rendered title/body is what gets written into that recipient's `AnnouncementDelivery`
  row (see #4) — push and inbox always show identical, already-personalized text.

### 4. Recipient resolution now covers four target apps, two different delivery mechanisms

`broadcastAnnouncement()` resolves recipients per target app and, for every recipient, writes an
`AnnouncementDelivery` row. Only the two mobile targets also get an Expo push:

| Target app | Recipient source | Delivery |
|---|---|---|
| `customer-mobile` | `CustomerPushToken` rows (grouped by `clerk_user_id`) | Expo push + delivery row |
| `driver-mobile` | `DriverPushToken` rows (grouped by `clerk_user_id`) | Expo push + delivery row |
| `customer-web` | All `Customer` rows with `clerk_user_id` set | delivery row only |
| `driver-web` | All `DriverProfile` rows with `clerk_user_id` set | delivery row only |

A user who's both signed into `driver-mobile` and `driver-web` is deduped by `clerk_user_id` +
`app` — if a broadcast targets both `driver-mobile` and `driver-web`, they get one delivery row
per app (mobile push + mobile inbox row, plus a separate web inbox row), never a duplicate within
the same app. Within a single mobile target app, a recipient with multiple devices/tokens still
gets exactly one `AnnouncementDelivery` row (grouped by `clerk_user_id`) but one Expo push per
device — the inbox is per-account, the push is per-device.

`ANNOUNCEMENT_TARGET_APPS` (`packages/ops-contracts/src/enums.ts`) grows from
`["customer-mobile", "driver-mobile"]` to add `"customer-web"` and `"driver-web"`. The ops
composer's target-app checkboxes (`announcement-form-dialog.tsx`) are already driven off this
list, so this is additive, not a UI redesign.

### 5. Reading the inbox: mobile and web both move to "my deliveries"

- Mobile: `useLiveAnnouncements()` (`driver-mobile`/`customer-mobile`) swaps
  `getJson("/v1/public/announcements?app=X")` for an authenticated
  `getJson("/v1/customer/announcements")` / `/v1/driver/announcements`, returning only that
  account's `AnnouncementDelivery` rows. This is what makes "only see what was sent since I
  joined" fall out automatically — a delivery row only exists if you were a resolved recipient at
  send time. `notifications.tsx`'s local AsyncStorage read-state
  (`notification-read-state.ts`) is retired in favor of a real `PATCH .../read` against
  `read_at`, same shape as `driver-web`'s existing `markDriverNotificationsRead`.
- `driver-web`: `NotificationBell` already merges from one source
  (`/v1/driver/notifications` → `DriverNotification` rows for lifecycle events). It's extended to
  also fetch `AnnouncementDelivery` rows for `app: "driver-web"` and merge them into the same
  dropdown list (id-prefixed the same way mobile already disambiguates announcement vs. other
  items — `announcement-${id}` vs the lifecycle row's own id).
- `customer-web`: gets a new `NotificationBell`, built directly on `driver-web`'s (there's nothing
  to merge with yet — it only shows `AnnouncementDelivery` rows for `app: "customer-web"`).

### 6. Support auto-links and auto-fills

- Support form (mobile + web) reads Clerk session state (already how `customer-web`'s existing
  form works; mobile support screens gain the same). When signed in: name/email prefill from
  Clerk, and the created `SupportCase` is stamped with `customer_id` (customer) or
  `driver_clerk_user_id` (driver) — both resolved server-side from the verified bearer token, not
  trusted from the client body.
- "My Cases" for a signed-in user becomes `where: { customer_id }` / `where: {
  driver_clerk_user_id }` — no email or identity token needed. The existing email + identity-token
  flow (`SupportIdentity`, `mintIdentityTokenIfAbsent`) stays exactly as-is as the fallback for
  anyone who opens a case anonymously (not signed in, or pre-migration).

## Error handling / edge cases

- Push registration with an expired/invalid bearer token: falls back to anonymous-only
  registration rather than failing the request — notifications must keep working even if a token
  refresh is mid-flight.
- Clerk batch name lookup fails or partially fails at send time: recipients missing a name get the
  unpersonalized template, not a broadcast failure. This mirrors the existing pattern where a
  single audience group's send failure is caught and logged without aborting the other group's
  send.
- A recipient deletes their account / gets deleted from Clerk after a delivery row exists: the row
  and its `read_at` state simply becomes orphaned, same lifecycle as any other Clerk-id-keyed row
  in this schema today (e.g. `OpsRoleAssignment`) — no special handling needed.
- `AnnouncementDelivery` writes are per-audience-group best-effort, same as the existing
  `recordPushTickets` / invalid-token cleanup loops in `broadcastAnnouncement()` — one group's
  write failure is logged and doesn't block the others.

## Testing

- Unit: `buildMessage()` merge-field rendering (with/without a resolved name), recipient
  resolution per target app (mobile push-token grouping vs. web account listing), dedup by
  `clerk_user_id` + `app`.
- Integration: `broadcastAnnouncement()` against a seeded mix of customer/driver push tokens and
  web accounts, asserting the right `AnnouncementDelivery` rows land with the right `app` and
  personalized text, and that mobile targets additionally produce `PushTicket` rows.
- API: `/v1/customer/announcements`, `/v1/driver/announcements`, and the extended
  `/v1/driver/notifications` return only the calling account's deliveries, and `PATCH .../read`
  updates `read_at` for that account only.
- Manual: send a broadcast targeting all four apps to a seeded test account signed into
  `customer-mobile` and `customer-web` simultaneously; confirm identical personalized text shows
  in both, confirm a second test account created *after* the send never sees it.
