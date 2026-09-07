# Driver SOS / safety incidents

A one-tap SOS on both driver surfaces that files a structured safety incident
with photos and location, alerts ops loudly, and gives ops a dedicated review
queue on both of their surfaces.

Design record: `docs/superpowers/specs/2026-09-06-driver-sos-safety-incidents-design.md`.

## Why it is not a support case

`SupportCase` already has a driver id, a category, a priority, a status
lifecycle, ops assignment, and a message thread, so extending it would have
been the smaller diff. It was rejected for three reasons:

1. **Acknowledgement is the whole point.** An SOS is measured by how fast a
   human sees it (`acknowledged_at`). Adding an ack clock that is meaningless
   for 95% of support rows is worse than a table where every row has one.
2. **Access model mismatch.** `SupportCase` is built around anonymous
   `access_token_hash` grants and an email-keyed `SupportIdentity`, because it
   serves logged-out visitors on the marketing site. An SOS is only ever filed
   by an authenticated driver.
3. **Operational separation.** An SOS must never sit in a helpdesk inbox behind
   billing questions. Its own table means its own nav entry, permission, and
   alerting — filtering discipline is not the only thing keeping an accident
   visible.

## Lifecycle

```
new ──▶ acknowledged ──▶ in_progress ──▶ resolved
 │            │                │
 └────────────┴────────────────┴──────▶ cancelled   (driver only, false alarm)
```

- **new** — filed, nobody has looked. The red clock runs.
- **acknowledged** — an ops user has seen it. Stamps `acknowledged_at` and
  `acknowledged_by_email` (first acknowledgement only — re-acknowledging never
  restarts the clock), writes a `system` update, and writes a
  `DriverNotification` so the driver's existing bell shows it.
- **in_progress** — ops is actively coordinating.
- **resolved** — stamps `resolved_at`, `resolved_by_email`, and **requires** a
  `resolution` note; the API returns 400 without one. Notifies the driver.
- **cancelled** — driver-initiated only. Ops cannot cancel (the API returns
  400); ops resolves.

`ACK_TARGET_SECONDS = 300` in `@workspace/ops-contracts` drives the red clock
in the ops list. There is deliberately **no auto-escalation**: an escalation
path nobody is rota'd for is theatre.

Severity is **derived from the incident type** at create
(`SEVERITY_BY_TYPE`), never asked of the driver — someone who has just been hit
should not be classifying their own emergency. Ops can change it.

## Surfaces

| App | Entry | Screens |
|---|---|---|
| driver-mobile | Global FAB mounted in `app/_layout.tsx` + nav-drawer entry | `app/sos/index.tsx`, `app/sos/[id].tsx` |
| driver-web | Global FAB mounted in `components/shell/app-shell.tsx` | `app/(shell)/sos`, `app/(shell)/sos/[id]` |
| ops | `SOS` nav item, above Support | `app/(dashboard)/sos`, `app/(dashboard)/sos/[id]` |
| ops-mobile | `SOS` drawer entry, above Support | `app/(ops)/sos/index.tsx`, `[id].tsx` |

Both driver FABs are mounted **once per app**, not per screen, so a screen
added later gets it for free. They are hidden on auth, onboarding,
profile-setup, and the SOS screens themselves.

**The FAB only navigates — it never files an incident.** That is what makes an
always-present control safe: nothing reaches the ops queue until the driver
picks a type and submits, so a pocket-tap costs a dismissed screen rather than
a false alarm someone has to stand down.

Both driver surfaces put a `tel:999` button *above* our own form, with copy
stating Admobi is not an emergency service.

## Location

**Snapshot at submit.** `expo-location` on mobile, `navigator.geolocation` on
web, both with an **8 second timeout**. Permission denied, unavailable, or
timed out all file the incident anyway with null coordinates, and ops sees
"location unavailable". **The report is never blocked on a fix.**

**Re-ping while open.** Neon is this platform's main compute cost driver, so
the loop is deliberately cheap:

- Interval **120 seconds**.
- Only while the status is non-terminal **and** the app/tab is foregrounded
  (`AppState` on mobile, `document.visibilityState` on web). No
  `expo-task-manager`, no background task, no always-on location permission.
- The server writes **one UPDATE of three columns** (`last_lat`, `last_lng`,
  `last_location_at`). There is **no ping-history table** — ops sees the
  current pin move, not a breadcrumb trail. Do not start appending; if a trail
  is ever needed it gets its own table.
- `POST /v1/driver/sos/[id]/location` returns **204 and writes nothing** if the
  incident is terminal, or if `created_at` is more than **6 hours** ago. The
  age cap self-terminates a client that never saw the resolve — a phone left in
  a drawer cannot ping forever. The check runs *before* body parsing, so a
  stale ping costs one indexed read.

## Photos

Up to **4** per incident, **8MB** each, `image/jpeg | image/png | image/webp`.
Stored through `apps/api/lib/incident-photo-storage.ts`, a thin wrapper over
the shared `apps/api/lib/private-media.ts` helper — Cloudinary `authenticated`
delivery type, signed URLs minted and fetched server-side only. Clients only
ever see the DB-assigned photo id; the `cloudinary_public_id` never leaves the
API.

**Photos upload *after* the incident is created**, from the tracking screen.
Ops is alerted the moment the driver taps Send — waiting on four image uploads
before alerting anyone would be the wrong trade in an emergency, and a failed
upload must never lose the report.

## Alerting

| Channel | How |
|---|---|
| Push to all ops devices | `notifyOpsStaffAlert({ type: "safety", … })` with title/body/channel/colour overrides. `channelId: "safety"`, red, high priority. |
| Admin email | `sendAdminEmail` + `lib/email/templates/SafetyIncidentAlert.tsx` — tappable phone number, maps link, direct ops link. |
| Driver, on ack and resolve | A `DriverNotification` row, read by the driver's existing notification bell. |

ops-mobile registers a **MAX-importance `"safety"` Android channel** in
`lib/push-notifications.ts`. Without a registered channel Android silently
routes the push to the default one and the heads-up banner never appears — the
alert looks delivered in the Expo receipt and is invisible on the device.

`bypassDnd` is deliberately **not** set: it needs `ACCESS_NOTIFICATION_POLICY`
in the Android manifest (which ops-mobile does not declare), so it would force
a native rebuild for a flag that also requires the user to grant Do Not Disturb
access by hand.

All alerting is fire-and-forget. A push or email failure never fails the
incident write.

## Permission and rollout

- Ops permission key: **`safety`**. Org admins have it implicitly; members need
  it granted under Team → Roles. The additive SQL grants it to the seeded
  Member role automatically.
- **No platform flag.** SOS was briefly built behind an `sos` flag and that
  was removed: a driver's route to reporting an accident must not depend on a
  toggle someone can forget to turn on, or that gets switched off during an
  unrelated incident. The FAB is live on both driver surfaces the moment the
  build ships, which means **the API must be deployed before the driver
  clients are** — see Deploying below.
- Audit entity type: **`safety_incident`**, written on create and on every ops
  status change. Location pings write **no** audit event — one every two
  minutes would drown the activity trail.

## Deploying

Schema ships as additive SQL, **never `prisma migrate`** (the Neon DB is shared
with self-hosted n8n):

```bash
npm run db:safety-incidents -w web        # dev
npm run db:safety-incidents:prod -w web   # production
```

The script is idempotent — every statement is `IF NOT EXISTS` or guarded — so a
second run is a no-op. **Run it before the API deploys**, or every SOS route
500s on a missing table.

Then deploy in order: **api first**, then ops, driver-web, and the two mobile
OTA updates (`NEXT_PUBLIC_API_URL` is inlined at build time — see
`docs/shared/FEATURE-INVENTORY.md`).

**This order is now load-bearing.** With no platform flag there is nothing
holding the driver-facing button back: the moment a driver client ships, every
driver sees a live SOS button. If the API is not already deployed with the
`/v1/driver/sos/*` routes and the tables created, the button opens a form whose
Send fails — the worst possible outcome for this particular feature. Ship the
SQL and the API, verify a real submit, and only then ship the driver clients.

**Mobile is OTA-only — no native rebuild.** `expo-location` and
`expo-image-picker` are already configured with permission strings in both
apps' `app.json`, Android already declares `ACCESS_FINE_LOCATION` /
`ACCESS_COARSE_LOCATION`, and the new notification channel is created by a
runtime call. Pass `--environment preview` to `eas update`.

## Deliberately not built

- Driver **push** on acknowledge/resolve — notification *rows* are written, so
  the bell already updates. Adding push once `lib/push/user-push.ts` is
  audience-generic is a small follow-up.
- Ops-initiated incidents (a driver phones in).
- Background location, geofencing, breadcrumb trails.
- Auto-escalation, paging rotas, SMS/WhatsApp alerting.
- An embedded map in the ops detail view — it ships coordinates plus a Google
  Maps deep link, which always works.
