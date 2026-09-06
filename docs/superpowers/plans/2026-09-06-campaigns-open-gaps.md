# Campaigns — Open Gaps Ledger

Companion to [`2026-09-06-campaigns-end-to-end.md`](./2026-09-06-campaigns-end-to-end.md). That plan is the record of what to build; **this file is the record of what is not yet settled**. Update it as gaps close — do not let a resolved gap sit here looking open.

**Status as of 2026-09-06:** Tasks 1–3 shipped (database, contracts + creative specs, Cloudinary generalization). Tasks 4–17 pending.

---

## 1. Blocked on an answer from outside the codebase

These cannot be resolved by reading code. Each names who can answer it and what changes when they do.

### 1.1 Panel pixel resolution — supplier · **highest value, lowest cost to answer**

The brief gives `960 × 320 mm` (taxi top) and `320 × 320 mm` (bike box, P2.5) and calls them the *"active pixel canvas"* — but those are millimetre figures. A 320 mm face at P2.5 pitch is **128 px**, so the mm number and the px number may be two different things.

- **Current behaviour:** aspect ratio is a **hard** reject; pixel dimensions only **warn**. Correct under either reading, blocks nobody.
- **On answer:** flip the dimension check to hard in `checkCreativeDimensions` ([creative-specs.ts](../../packages/ops-contracts/src/creative-specs.ts)) and update `recommendedWidthPx` / `recommendedHeightPx`. One function, one test file.
- **Cost of not answering:** undersized artwork reaches ops review and a human has to catch it.

### 1.2 Supplier delivery model — product owner + supplier

Do suppliers **pull** creative from a URL we mint, or do we **push** bytes to their API?

- **Current behaviour:** creatives are stored `type: "authenticated"` (private). We hold the `public_id`, so a supplier URL can be minted server-side at dispatch time. **Either model works with no re-upload.**
- **On answer:** determines whether `campaign_placements` carries a URL + expiry or a push receipt. Does not block Tasks 4–17.

### 1.3 Maximum video duration — supplier

No duration limit is specified anywhere in the brief. Cloudinary reports duration on upload and we store it (`campaign_creatives.duration_seconds`), so the data is already there — there is simply no rule to enforce.

- **Current behaviour:** any duration accepted under the 50 MB cap.
- **On answer:** one added branch in `checkCreativeDimensions`' sibling. No migration.

### 1.4 Is 50 MB the right creative cap? — product owner

`MAX_CREATIVE_BYTES = 50 * 1024 * 1024` is a judgement call, not a supplied figure. A 15-second LED spot is typically 5–15 MB, so 50 MB is generous; it also sets the worst case for a mobile upload over Kenyan mobile data.

- **Note:** the base64 data-URI ceiling that made 50 MB impossible is **already fixed** (uploads now stream). The number is now purely a product choice.

### 1.5 Per-side pricing and creative — product owner

The taxi top is double-sided and the bike box is three-sided. Two unanswered questions: does an advertiser pay per side, and may they run *different* artwork per side?

- **Current behaviour:** `campaign_creatives.slot` exists, defaults to `"all"`, and **no UI sets it**. One creative plays on every face.
- **On answer:** per-face artwork is a picker, not a migration. Per-side pricing is a pricing-track question, not a schema one.

### 1.6 `"campaign"` ops-alert type is already taken — needs a decision before Task 9

[`ops-alerts.ts`](../../apps/api/lib/push/ops-alerts.ts) already has an `OpsAlertType` of `"campaign"`, but its `ROUTE_SEGMENT` maps to `leads` — it is the **marketing start-campaign lead form's** alert, not this feature's.

- **The trap:** repointing `campaign → campaigns` to serve real campaigns would silently misroute every existing marketing-lead alert to the wrong ops screen.
- **Recommended:** add a distinct `"campaign_submission"` type rather than repurposing `"campaign"`. Task 9 Step 5 must not be done as a one-line edit.

---

## 2. Discovered while building — not in the original plan

### 2.1 No per-user push exists anywhere in the repo

`notifyOpsStaffAlert` pushes to *all* ops devices; `broadcastAnnouncement` pushes to *everyone*. **Nothing pushes to one user.** Driver review decisions today send an email and write an inbox row but reach no device.

- Task 6 adds `notifyUserPush(audience, clerkUserId, …)`, deliberately audience-generic.
- **Residual gap:** after this ships, the *driver* flow still has no push until someone adopts the helper. Two-line change, listed in the plan's out-of-scope table.

### 2.2 Customer push tokens may not carry `clerk_user_id`

`notifyUserPush` looks up tokens by `clerk_user_id`. `CustomerPushToken` has both `clerk_user_id` and `anonymous_device_id`, and both are nullable — a token registered before sign-in and never re-upserted afterwards would be **invisible to every campaign push**.

- **Unverified.** Task 13 Step 3 must confirm the registration call re-upserts on sign-in, and fix it if not.
- **Failure mode is silent:** no error, just no notification.

### 2.3 New ops roles will not get the `campaigns` permission automatically

The additive SQL grants `campaigns` to the **seeded `Member` role only** (matching how `driver_applications` was handled). Any custom role created before this migration keeps its old permission set.

- **Action for ops:** review roles under Team → Roles after deploy. Not a code gap; an operational one.

### 2.4 Cloudinary reports a duration for animated GIFs

Observed in the live round trip: a 2-frame GIF came back with `durationSeconds: 0.2`. Harmless — we store it — and potentially useful if a max-loop-length rule ever lands. Noted so nobody later treats a non-null duration as proof of "this is a video".

### 2.5 `graphify query` is not runnable as documented

`CLAUDE.md` instructs running `graphify query "<question>"` first for codebase questions. `npx graphify` fails (`could not determine executable to run`); the bare `graphify` binary works. Minor, but the documented command is wrong for anyone without it on PATH.

---

## 3. Verification debt

Things believed correct but **not yet proven end to end**.

| Gap | Proven so far | Still needed |
|---|---|---|
| Driver document upload after the `upload_stream` switch | Live Cloudinary round trip at the library level: upload → signed fetch → destroy, dimensions and byte count correct | A real upload through the driver-web UI, previewed in ops **and** ops-mobile. The library is exercised; the routes are not. |
| Animated GIF survives delivery | Live round trip returns `GIF89a` magic bytes | A real animated GIF through the campaign upload route once Task 8 lands |
| MP4 upload / delivery | Nothing — no fixture small enough to inline | Round-trip a real MP4 when Task 8 lands; confirm `duration_seconds` populates and the video preview plays in both ops surfaces |
| 50 MB upload actually completes | The base64 ceiling that would have blocked it is removed | One genuine large-file upload over a real connection, ideally from mobile |
| `campaigns` permission gating | Typecheck forced both `PERMISSION_LABELS` maps to be filled | An ops **member** with only `campaigns` sees the section and nothing else; without it, `/campaigns` redirects |

---

## 4. Deliberate non-goals

Not gaps. Listed so they are not "discovered" again later — full rationale in the plan's out-of-scope table.

- Supplier screen-API dispatch (`campaign_placements`, playout reporting, impression reconciliation)
- Flight start / end notifications (the only notification needing a cron)
- Real impressions and spend figures (they come from supplier reporting, not us)
- Supplier playlist primitives: scrolling text, clocks, embedded web pages, vehicle temperature sensors
- Video transcoding — the supplier console has its own Transcoding toggle; re-encoding here only degrades the master
- A mobile toast library
- `driver-mobile` changes — drivers neither create nor review campaigns
