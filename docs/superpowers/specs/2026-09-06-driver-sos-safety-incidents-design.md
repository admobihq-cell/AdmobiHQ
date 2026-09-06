# Driver SOS / safety incidents

**Date:** 2026-09-06
**Status:** Approved design, pre-implementation

## Problem

A driver on the road has no way to tell us something has gone wrong. If they
are in an accident, are harassed, have their vehicle or screen damaged, or
break down mid-shift, the only channel is the general support form — a
helpdesk queue with no urgency signal, no location, no photos, and nothing
that tells ops "someone needs help right now."

We need a one-tap SOS on both driver surfaces that files a structured
incident with location and photos, alerts ops loudly, and gives ops a
dedicated review queue on both of their surfaces.

## Scope

**In:** a new `SafetyIncident` subsystem — Prisma models, contracts, API
routes, and UI on all four apps (driver-mobile, driver-web, ops, ops-mobile).
Photo capture, a one-shot location snapshot plus foreground re-pings while an
incident is open, ops push + admin email alerting, acknowledgement SLA
tracking, and a two-way message thread between driver and ops.

**Out of scope for v1:**

- Ops creating an incident on a driver's behalf (a phone call comes in).
- Background/always-on location tracking, geofencing, or a breadcrumb trail
  of positions.
- Auto-escalation, paging rotas, or SMS/WhatsApp alerting. Push + email only.
- Any change to the existing `SupportCase` system. SOS is a sibling, not a
  replacement, and the support screens are untouched.
- Dispatching real help. We file an incident and coordinate; we are not an
  emergency service.

## Why a separate entity, not a `SupportCase` category

`SupportCase` already carries `driver_clerk_user_id`, a category, a priority,
a status lifecycle, ops assignment, and a message thread, so extending it was
the smaller diff. It was rejected for three reasons:

1. **Acknowledgement is the whole point.** An SOS is measured by how fast a
   human sees it. `SupportCase` has no ack concept, and adding an ack clock
   that is meaningless for 95% of rows is worse than a table where every row
   has one.
2. **Access model mismatch.** `SupportCase` is built around anonymous
   `access_token_hash` grants and an email-keyed `SupportIdentity`, because
   it serves logged-out visitors on the marketing site. An SOS is only ever
   filed by an authenticated driver. Reusing the case table means carrying
   token minting through a flow that never needs it.
3. **Operational separation.** An SOS must never be buried in a helpdesk
   inbox behind billing questions. A separate table gives ops its own nav
   entry, its own permission, and its own alerting without filtering
   discipline being the only thing keeping an accident visible.

The cost is duplicated thread/assignment plumbing. Accepted.

## Data model

Three new models in `apps/web/prisma/schema.prisma`. The Neon database is
shared with the self-hosted n8n instance, so these ship as **additive SQL**
(`CREATE TABLE`), not `prisma migrate` — same constraint the ops integrations
ledger shipped under.

### `SafetyIncident` / `safety_incidents`

| Column | Type | Notes |
|---|---|---|
| `id` | `Int @id @default(autoincrement())` | |
| `driver_clerk_user_id` | `String` | driver Clerk instance `sub` |
| `driver_name` | `String?` | snapshot from `DriverProfile` at create |
| `driver_phone` | `String?` | snapshot, so ops can call without a join |
| `type` | `String` | `SAFETY_INCIDENT_TYPES` |
| `severity` | `String @default("high")` | `SAFETY_SEVERITIES`; derived from `type` at create, ops can change |
| `status` | `String @default("new")` | `SAFETY_INCIDENT_STATUSES` |
| `description` | `String?` | free text from the driver |
| `reported_lat` | `Float?` | snapshot at submit |
| `reported_lng` | `Float?` | |
| `reported_accuracy_m` | `Int?` | null when location was unavailable |
| `last_lat` | `Float?` | overwritten by re-pings |
| `last_lng` | `Float?` | |
| `last_location_at` | `DateTime?` | |
| `acknowledged_at` | `DateTime?` | the SLA clock |
| `acknowledged_by_email` | `String?` | |
| `resolved_at` | `DateTime?` | |
| `resolved_by_email` | `String?` | |
| `resolution` | `String?` | ops closing note |
| `created_at` | `DateTime @default(now())` | |
| `updated_at` | `DateTime @updatedAt` | |

Indexes: `@@index([status, created_at])`, `@@index([driver_clerk_user_id, created_at])`.

Relations: `photos SafetyIncidentPhoto[]`, `updates SafetyIncidentUpdate[]`.

`driver_name` and `driver_phone` are snapshots on purpose. Ops needs a number
to call in the first thirty seconds; that must not depend on a
`DriverProfile` row existing, being approved, or still holding the same
number later.

### `SafetyIncidentPhoto` / `safety_incident_photos`

| Column | Type | Notes |
|---|---|---|
| `id` | `Int @id @default(autoincrement())` | |
| `incident_id` | `Int` | `onDelete: Cascade` |
| `cloudinary_public_id` | `String @unique` | `authenticated` delivery type |
| `content_type` | `String` | |
| `size_bytes` | `Int` | |
| `created_at` | `DateTime @default(now())` | |

Index: `@@index([incident_id])`.

### `SafetyIncidentUpdate` / `safety_incident_updates`

| Column | Type | Notes |
|---|---|---|
| `id` | `Int @id @default(autoincrement())` | |
| `incident_id` | `Int` | `onDelete: Cascade` |
| `author_type` | `String` | `"driver" \| "ops" \| "system"` |
| `author_email` | `String?` | |
| `author_clerk_id` | `String?` | |
| `body` | `String` | |
| `internal_note` | `Boolean @default(false)` | hidden from the driver |
| `created_at` | `DateTime @default(now())` | |

Index: `@@index([incident_id, created_at])`.

`author_type: "system"` records lifecycle events (acknowledged, resolved,
cancelled) in the same thread the humans write to, so the detail view is one
chronological list rather than a timeline plus a separate conversation.

## Lifecycle

```
new ──▶ acknowledged ──▶ in_progress ──▶ resolved
 │            │                │
 └────────────┴────────────────┴──────▶ cancelled   (driver only, false alarm)
```

- `new` — filed, nobody has looked. The red clock runs.
- `acknowledged` — an ops user has seen it. Stamps `acknowledged_at` and
  `acknowledged_by_email`, writes a `system` update, and sends the driver a
  `DriverNotification` so their existing bell shows "Ops has seen your
  report."
- `in_progress` — ops is actively coordinating.
- `resolved` — stamps `resolved_at`, `resolved_by_email`, requires a
  `resolution` note, notifies the driver.
- `cancelled` — driver-initiated only. Ops cannot cancel; ops resolves.

`ACK_TARGET_SECONDS = 300` is a constant in `packages/ops-contracts`. It
drives the red clock in the ops list only — there is no auto-escalation, no
paging, and nothing happens when it is exceeded except that the row looks
worse. Deliberate: an escalation path that nobody is rota'd for is theatre.

## Contracts (`packages/ops-contracts`)

New enums in `src/enums.ts`:

```ts
export const SAFETY_INCIDENT_TYPES = [
  "accident", "harassment", "theft", "vehicle_damage",
  "medical", "breakdown", "other",
] as const

export const SAFETY_SEVERITIES = ["critical", "high", "medium"] as const

/** The driver is never asked to rate their own emergency — severity is
 *  derived from the incident type at create, and ops adjusts if wrong. */
export const SEVERITY_BY_TYPE: Record<SafetyIncidentType, SafetySeverity> = {
  accident: "critical",
  medical: "critical",
  harassment: "critical",
  theft: "high",
  vehicle_damage: "medium",
  breakdown: "medium",
  other: "high",
}

export const SAFETY_INCIDENT_STATUSES = [
  "new", "acknowledged", "in_progress", "resolved", "cancelled",
] as const

export const ACK_TARGET_SECONDS = 300
```

Additions to existing enums:

- `OPS_PERMISSIONS` gains `"safety"`.
- `AUDIT_ENTITY_TYPES` gains `"safety_incident"`.
- `PLATFORM_FLAG_KEYS` gains `"sos"`.

New Zod schemas in `src/schemas.ts`: `safetyIncidentCreateSchema`,
`safetyIncidentDriverUpdateSchema` (cancel only),
`safetyIncidentOpsUpdateSchema` (status / severity / resolution),
`safetyIncidentLocationSchema`, `safetyIncidentMessageCreateSchema`.

New DTOs in `src/types.ts`: `SafetyIncidentDto`,
`SafetyIncidentDetailDto = SafetyIncidentDto & { updates, photos }`,
`SafetyIncidentUpdateDto`, `SafetyIncidentPhotoDto` (id + content_type +
created_at only — never the Cloudinary public id).

`packages/ops-api-client` gains a `safety` resource mirroring the existing
`support` one: `list`, `get`, `update`, `reply`, `photoFileUrl`.

## API routes (`apps/api`)

### Driver — `requireDriverAccess()`, every route ownership-checked on `driver_clerk_user_id`

| Route | Method | Notes |
|---|---|---|
| `/v1/driver/sos` | `POST` | create. Rate limit 3 / 5 min via `checkRateLimit`. Snapshots name/phone from `DriverProfile`. Fires alerts + audit. |
| `/v1/driver/sos` | `GET` | my incidents, newest first, `take: 50` |
| `/v1/driver/sos/[id]` | `GET` | detail + non-internal updates + photo ids |
| `/v1/driver/sos/[id]` | `PATCH` | cancel only — any other status transition is 403 |
| `/v1/driver/sos/[id]/messages` | `POST` | driver reply |
| `/v1/driver/sos/[id]/photos` | `POST` | multipart, one file per call |
| `/v1/driver/sos/[id]/location` | `POST` | re-ping, see below |

### Ops — `requireOpsPermissionAccess("safety")`

| Route | Method | Notes |
|---|---|---|
| `/v1/safety-incidents` | `GET` | paginated; filters `status`, `type`, `severity`; `listSafetyIncidents` in `lib/queries/entities.ts` follows `listSupportCases` |
| `/v1/safety-incidents/[id]` | `GET` | detail incl. internal notes |
| `/v1/safety-incidents/[id]` | `PATCH` | status / severity / resolution. Stamps ack and resolve fields, writes `system` updates, notifies the driver. |
| `/v1/safety-incidents/[id]/messages` | `POST` | ops reply, optional `internal_note` |
| `/v1/safety-incidents/[id]/photos/[photoId]/file` | `GET` | streams bytes |

### Photo storage

New `apps/api/lib/incident-photo-storage.ts`, a direct mirror of
`lib/driver-document-storage.ts`: Cloudinary `type: "authenticated"`,
`resource_type: "image"`, public id
`safety-incidents/<incidentId>/<uuid>`, `asset_folder` set explicitly for
Dynamic Folder Mode accounts. The signed URL is minted and fetched
server-side only and never reaches a client — callers see the DB-assigned
photo id and nothing else. Limits: max **4** photos per incident, **8MB**
each, `image/jpeg | image/png | image/webp`, matching `ALLOWED_DOCUMENT_TYPES`.

The 800px-wide `crop: limit` transform from `fetchDriverDocument` carries
over — a phone-camera photo of a damaged screen does not need to ship at full
resolution to an ops laptop.

## Location

### Snapshot at submit

`expo-location` `getCurrentPositionAsync({ accuracy: Balanced })` on mobile,
`navigator.geolocation.getCurrentPosition` on web, both with an **8 second
timeout**. Permission denied, unavailable, or timed out all submit the
incident anyway with null coordinates and a "location unavailable" line in
the ops detail view. **The report must never be blocked on a fix** — a driver
in a tunnel or with location off still needs to reach us.

### Re-ping while open

The Neon database is the platform's main compute cost driver (the shared n8n
instance already dominates CU-hrs), so the ping loop is deliberately cheap:

- Interval **120 seconds**.
- Runs only while status ∈ {`new`, `acknowledged`, `in_progress`} **and** the
  app is foregrounded — an `AppState` listener on mobile, page visibility on
  web. No `expo-task-manager`, no background task, no always-on location
  permission, nothing extra to justify in a store review.
- The server writes **one `UPDATE` of three columns** (`last_lat`,
  `last_lng`, `last_location_at`). There is no ping-history table: ops sees
  the current pin move, not a breadcrumb trail.
- `POST /v1/driver/sos/[id]/location` returns **204 and writes nothing** if
  the incident is `resolved`/`cancelled`, or if `created_at` is more than
  **6 hours** ago. The age cap self-terminates a client that never saw the
  resolve — a phone left in a drawer cannot ping forever.

That is roughly 30 small updates per hour per open incident. The route
carries a `ponytail:` comment naming the ceiling: if open-incident volume
ever makes this material, the fix is a 5-minute interval or a coalescing
write, not a new table.

## Driver surfaces

### driver-mobile (primary)

Entry points, both gated on the `sos` platform flag:

- A red SOS button on the dashboard tab (`app/(tabs)/index.tsx`).
- A nav-drawer entry (`components/app/nav-drawer.tsx`).

Deliberately **not** a global floating button on every screen — pocket-taps
and accidental fires would train ops to ignore the queue.

`app/sos/index.tsx` — the submit flow, one screen:

1. **Emergency services first.** A `tel:999` button at the top with plain
   copy: *"For police, ambulance or fire, call 999. AdmobiHQ is not an
   emergency service."* This sits above our own flow because a driver in a
   real accident should not be reading our form.
2. Incident-type grid, seven tiles, icons from the existing
   `components/icons.tsx`.
3. Optional description field.
4. Photos — `expo-image-picker` (already a dependency), up to 4, thumbnails
   with remove.
5. **Send SOS**. Location is captured here, not on screen entry, so we do not
   prompt for permission until the driver has committed.

There is no severity picker. A driver who has just been hit by a matatu
should not be classifying the incident — severity comes from `SEVERITY_BY_TYPE`
and ops adjusts it.

**Submit ordering.** `POST /v1/driver/sos` fires first with type,
description, and location; the client navigates straight to the tracking
screen and uploads photos there, one call each, against the returned
incident id. Ops is therefore alerted the moment the driver taps Send —
photos stream in behind it and appear in the ops detail view as they land.
Waiting on 4 image uploads before alerting anyone would be the wrong
trade in an emergency, and a failed upload must never lose the incident.

`app/sos/[id].tsx` — the tracking screen: status timeline, "Ops acknowledged
2 min ago", message thread with ops, photo thumbnails, add-photo, and
**Cancel incident** for false alarms. The ping loop lives here and stops when
the screen unmounts or the status goes terminal.

### driver-web

A red **SOS** button in the shell header (`components/shell`), always visible
— not buried under `/settings` the way support is. Same flow at `app/sos`,
tracking at `app/sos/[id]`.

Photos use `<input type="file" accept="image/*" capture="environment">` —
native camera capture on mobile browsers, no dropzone dependency.

## Ops surfaces

### ops (web)

New nav item in `components/ops-shell.tsx`, above Support, permission
`safety`. Existing member roles will not have it until it is granted under
Team → Roles; org admins are unaffected.

`app/(dashboard)/sos/sos-view.tsx` — list, built on the same `DataTable` +
`PageHero` + `TablePagination` + `StatusBadge` stack as
`support/support-view.tsx`:

| Column | Notes |
|---|---|
| Age / ack clock | time since `created_at`; red past `ACK_TARGET_SECONDS` while unacked |
| Driver | name + `tel:` phone link |
| Type | icon + label |
| Severity | badge |
| Status | badge |
| Location | pin icon → Google Maps link, or "unavailable" |
| Photos | count |

Behaviour: `refetchInterval` **15s** while any row is `new` or
`acknowledged`, **60s** otherwise. Unacknowledged `new` rows pin to the top
regardless of the active sort, with a red banner count above the table.

`app/(dashboard)/sos/[id]/` — detail: driver card with call and WhatsApp
links, a map centred on `last_lat/lng` (falling back to `reported_lat/lng`)
reusing the existing ops MapLibre setup and `packages/geo`, photo gallery
served through the authenticated file route, status controls (Acknowledge /
In progress / Resolve-with-note), and the update thread with an internal-note
toggle.

If embedding the map inside the detail view proves fiddly, v1 ships
coordinates plus a Google Maps deep link and the embedded map follows — the
map is not on the critical path for responding.

A new source in `lib/use-ops-notifications.ts` alongside the support source,
so incidents surface in the existing ops bell.

### ops-mobile

`app/(ops)/sos/index.tsx` and `[id].tsx`, reusing `EntityList`, `ListRow`,
`FilterChips`, `PageHero`, and `ApiErrorBanner` exactly as the existing
`(ops)/support` screens do, with the same `useInfiniteQuery` pagination
shape. Nav-drawer entry on the same `safety` permission.

## Alerting

**Push to all ops devices.** `lib/push/ops-alerts.ts` gains a `"safety"`
member in `OpsAlertType`, `TYPE_LABELS`, and `ROUTE_SEGMENT`, plus optional
`title` / `body` / `channelId` / `color` overrides on `OpsStaffAlertInput`.
An SOS sends title `🚨 SOS — Accident`, body `David M. · tap to respond`,
`priority: "high"`, `channelId: "safety"`, red colour, deep-linking to
`/(ops)/sos/<id>`. Extending the existing function is ~10 lines against a
parallel implementation that would have to re-do token lookup, receipt
recording, and invalid-token pruning.

ops-mobile registers a high-importance `"safety"` Android notification
channel in `lib/push-notifications.ts`. Without it Android silently
downgrades the alert and the sound never plays.

**Admin email.** Existing `sendAdminEmail` plus a new
`lib/email/templates/SafetyIncidentAlert.tsx` modelled on `AdminAlert`:
driver name and phone, type, severity, description, a maps link, and a direct
link into the ops console.

**Driver notifications.** Acknowledge and resolve each write a
`DriverNotification` row, so the driver's existing notification bell and push
registration carry the update with no new plumbing.

**Audit.** `auditFromDriverUser` on create, `auditFromOpsUser` on every ops
status change, entity type `safety_incident`.

Alerting is fire-and-forget throughout (`void notify...`), matching the
support create route. A push or email failure must never fail the incident
write.

## Rollout

The driver-facing entry points are gated on a `sos` `PlatformFlag`, so API,
ops screens, and driver screens can all ship dark and be switched on from ops
Settings once ops is ready to watch the queue. The flag gates **entry points
only** — the API routes stay live so an in-flight incident cannot be orphaned
by someone toggling the flag off.

## Testing

Vitest (`packages/vitest-config`), on the logic that has a real failure mode:

- Driver `GET`/`PATCH`/`POST` on an incident belonging to another driver → 403.
- `PATCH` from a driver attempting any status other than `cancelled` → 403.
- Location ping on a `resolved` incident → 204, no write.
- Location ping on an incident older than 6h → 204, no write.
- Fifth photo upload → 400.
- Ops routes without the `safety` permission → 403.

One Playwright e2e over the full loop: driver-web submits an SOS → ops-web
list shows it unacknowledged → ops acknowledges → driver-web tracking page
shows the acknowledgement.

## Documentation

New `docs/shared/SAFETY-SOS.md` covering the cross-app flow, the lifecycle,
and the location/cost decisions. Sections added to `docs/driver/DRIVER-APP.md`,
`docs/ops/OPS-ADMIN.md`, `docs/ops/MOBILE-OPS.md`, and `docs/api/API.md`.

## Phasing

1. Schema + contracts + `ops-api-client` + all API routes + photo storage +
   alerting + audit + flag.
2. driver-mobile: entry points, submit flow, tracking screen, ping loop.
3. ops: SOS inbox, detail view, nav, notification bell source.
4. ops-mobile: list, detail, push channel, deep link.
5. driver-web: header button, submit flow, tracking page.
6. Docs and tests.

Phases 3 and 5 are independent of each other once phase 1 lands. Phase 2
should precede phase 3 only so that ops has real rows to look at.
