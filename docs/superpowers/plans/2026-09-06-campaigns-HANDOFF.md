# Campaigns Feature — Handoff Prompt

Paste everything below the line into Cursor.

---

I'm continuing a partially-finished feature in this monorepo (AdmobiHQ). Work on the branch `feat/campaigns-end-to-end` — it's already checked out.

## Read these first

1. `docs/superpowers/plans/2026-09-06-campaigns-end-to-end.md` — the full 17-task implementation plan. **This is the spec. Follow it.**
2. `docs/superpowers/plans/2026-09-06-campaigns-open-gaps.md` — open questions and verification debt. **Keep it updated as you close gaps.**
3. `CLAUDE.md` and `.claude/CLAUDE.md` — project rules.

## What the feature is

Advertisers create campaigns in `customer-web` / `customer-mobile` (full-page multi-step wizard, **not** a side sheet), upload creative to Cloudinary (private/authenticated delivery), and submit for review. Ops reviews in `ops` / `ops-mobile` — Approve / Request changes / Reject with an **advertiser-visible reason**. Every state change fires email + in-app inbox + push + toast. Both calendars read real campaigns from the DB.

It is a deliberate clone of the existing **driver-verification vertical slice**. When in doubt, find the driver equivalent (`DriverProfile` / `driver-applications` / `driver-web/components/profile-setup`) and mirror it rather than inventing something.

## Done and committed (Tasks 1–11)

| Task | What | Commit |
|---|---|---|
| 1 | DB: `campaigns`, `campaign_creatives`, `customer_notifications` | `4e3f728` |
| 2 | Contracts: enums, Zod schemas, DTOs, `creative-specs.ts`, ops-api-client `campaigns` namespace | `56b35b5` |
| 3 | `apps/api/lib/private-media.ts` (Cloudinary, image + video) | `057f63c` |
| 4 | `campaign-store.ts`, `campaign-dto.ts`, derived flight phase | `7c6980f` |
| 5 | Customer in-app notification inbox + routes | `e63b638` |
| 6 | `notifyUserPush` — targeted single-user push | `774fad8` |
| 7 | Campaign emails + distinct `campaign-submission` alert type | `9858788` |
| 8 | Advertiser campaign CRUD, creative upload, submit | `d0568bc` |
| 9 | Ops campaign list, detail, review, creative proxy | `130b59e` |
| 10+11 | customer-web: full-page wizard, real-data list/detail/calendar, merged inbox | `80abd44` |

**The API layer is complete and tested.** 14 live-DB lifecycle tests pass (`apps/api/app/v1/campaigns/lifecycle.test.ts`).

## IMMEDIATE NEXT STEP — finish Task 14 (ops web), currently uncommitted

These files are **already written** in the working tree but **not committed and not yet typechecked**:

- `apps/ops/lib/queries/entities.ts` — added `listCampaigns` + `getPendingCampaignsCount`
- `apps/ops/lib/entity-pages.ts` — added `CAMPAIGNS_PAGE`
- `apps/ops/components/ops-shell.tsx` — added Campaigns nav item (`MonitorPlay` icon, `campaigns` permission); **generalized the pending badge** from a hardcoded `item.href === "/driver-applications"` check to a `pendingCounts: Partial<Record<string, number>>` prop keyed by href
- `apps/ops/app/(dashboard)/layout.tsx` — rewritten to pass `pendingCounts`
- `apps/ops/app/(dashboard)/campaigns/page.tsx`
- `apps/ops/app/(dashboard)/campaigns/campaigns-view.tsx`
- `apps/ops/app/(dashboard)/campaigns/[id]/page.tsx`
- `apps/ops/app/(dashboard)/campaigns/[id]/campaign-detail-view.tsx`
- `apps/ops/components/campaign-detail-skeleton.tsx`

- `apps/ops/components/status-badge.tsx` — added `cancelled`, `live`, `scheduled`, `completed`

**All of Task 14 is written. It has not been typechecked, linted, or committed.** Do exactly this first:

```bash
npx turbo typecheck --filter=ops     # expect this to surface a few fixes
npx turbo lint --filter=ops          # must be 0 errors; ~40 pre-existing warnings are fine
```

Fix whatever those flag, then stage **explicit paths only** and commit as
`feat(ops): add campaigns review section with sidebar entry and pending badge`

```bash
git add apps/ops/app/\(dashboard\)/campaigns apps/ops/components/campaign-detail-skeleton.tsx \
        apps/ops/components/ops-shell.tsx apps/ops/components/status-badge.tsx \
        apps/ops/app/\(dashboard\)/layout.tsx apps/ops/lib/entity-pages.ts \
        apps/ops/lib/queries/entities.ts
```

## Then do the remaining tasks, in this order

**Task 15 — ops-mobile campaign review.** Copy `apps/ops-mobile/app/(ops)/driver-applications/` (`_layout.tsx` 39 lines, `index.tsx` 155, `[id].tsx` 321) to `app/(ops)/campaigns/`, retargeted at `client.campaigns.*` (the ops-api-client namespace already exists — no new fetch code). Register the screen in `app/(ops)/_layout.tsx` near line 160 and add it to the ops-mobile menu, gated on the `campaigns` permission. Video creative can use a play affordance rather than an inline player. `apps/ops-mobile/lib/permission-labels.ts` already has the `campaigns` label.

**Task 12 — customer-mobile campaign flow.** Mirror `apps/customer-web/lib/campaigns-client.ts` + `use-campaigns.ts`. `app/(tabs)/campaigns/new.tsx` is already a full-screen route — make it the same four-step wizard (Brief → Flight & budget → Creative → Review) and API-backed. Use `expo-image-picker` (already a dependency) with `mediaTypes` covering images **and** video. Delete `apps/customer-mobile/lib/campaigns.ts` (AsyncStorage store). Surface `CREATIVE_SPECS` from contracts above the picker. **Do NOT add a toast library** — use inline banners like ops-mobile's `ApiErrorBanner`.

**Task 13 — customer-mobile push + merged inbox.** Merge `/v1/customer/notifications` with the announcement feed (same two-query merge as `apps/driver-web/lib/use-driver-notifications.ts`). Handle notification tap: `expo-notifications` response listener reads `data.href` and routes to `/campaigns/:id` — verify from cold start, background, and foreground.
**Also fix two things found during tracing (see gaps ledger §2.2):**
- `apps/customer-mobile/lib/use-push-registration.ts` has a **stale, actively misleading comment** claiming the hook renders outside `ClerkProvider`. It doesn't — `PushRegistrationBridge` is nested *inside* it in `app/_layout.tsx`. Correct the comment.
- That hook's effect deps are `[pushSupported, getToken]`; Clerk's `getToken` identity is stable, so signing in doesn't re-register. Add Clerk's `userId` to the deps so a token links to the account immediately rather than on the next foreground.

**Task 16 — round-trip verification.** Follow the plan's Task 16 steps exactly. Includes an EAS `--environment preview` build for both Expo apps (never omit `--environment preview`, or it bakes the builder's LAN IP).

**Task 17 — documentation.** Per `CLAUDE.md`, docs ship in the same change: `docs/api/API.md`, `docs/customer/APP.md` + `APP-MOBILE.md`, `docs/ops/OPS-ADMIN.md` + `MOBILE-OPS.md`, `docs/shared/DATA-LAYER.md`, `DEPLOYMENT.md`, `FEATURE-INVENTORY.md`. DATA-LAYER.md must include the **hardware spec table** and the **supplier/screen-API seam note** (see plan). Finish with `graphify update .`.

## Hard rules — violating these breaks things

- **Never `prisma migrate` or `db push`.** The Neon DB is shared with a self-hosted n8n; a careless push drops its tables. Schema changes are additive SQL via `prisma db execute`. The campaigns migration is **already applied to the local DB**. Production still needs `npm run db:campaigns:prod -w web`.
- **Never `git add -A`.** Another session writes to this repo concurrently (a driver-SOS design spec keeps appearing). **Always stage explicit paths.** I already had to reset one commit that swallowed 2,179 lines of someone else's work.
- **Commit messages: no `Co-Authored-By` trailer, no "Generated with Claude Code" line.** Project rule.
- **Creative formats are PNG, JPG, GIF, MP4 only.** No WebP, WebM, or BMP — the supplier's LED player can't decode them, so accepting one lets creative pass review and then fail silently on the vehicle. There's a regression test pinning this list.
- **Never point an `<img src>` at Cloudinary.** Creative bytes only ever reach a client through the authenticated proxy route: fetch with the bearer token, `URL.createObjectURL(blob)`, revoke on unmount.
- **Ownership mismatch returns 404, not 403** — otherwise ids are enumerable.
- **Don't add a `live` column.** Flight phase is derived from `starts_on`/`ends_on` at read time in `campaign-dto.ts`. A stored one goes stale the moment a date passes.

## Gotchas I hit — save yourself the time

- `jsonError(msg, status, detail)` nests `detail` under **`issues`**, not at the top level.
- Prisma delegates (`customerPushToken` vs `driverPushToken`) **don't unify into a callable union** — pick the table with a ternary per call, as `broadcast-announcement.ts` does.
- Zod's `.refine` second arg rejects a readonly `path` — don't mark that object `as const`.
- `apps/api` vitest only collects tests under `lib/**` or `app/**`.
- The Cloudinary SDK takes ~6s to import cold; warm it in a `beforeAll` with its own timeout rather than bumping every test's.
- Bash heredocs choke on apostrophes in this environment — use the file-write tool for multi-line content.

## Verification commands

```bash
npx turbo typecheck                      # all 13 packages must pass
npx turbo lint --filter=<pkg>            # 0 errors required; warnings pre-exist
npm run test -w api                      # includes live-DB lifecycle tests
npm run test -w @workspace/ops-contracts # creative-spec + schema tests
```

## Two open questions for the product owner (don't block on them)

1. **Panel pixel resolution.** The spec gives 960×320 mm (taxi top) and 320×320 mm P2.5 (bike box) and calls them the "active pixel canvas" — but at P2.5 a 320 mm face is 128 px, so mm and px may differ. Current behaviour: **aspect ratio is a hard reject, pixel dimensions only warn.** Correct under either reading. When confirmed, tighten `checkCreativeDimensions` in `packages/ops-contracts/src/creative-specs.ts` to a hard check.
2. **Supplier delivery model** — do suppliers pull creative from a URL we mint, or do we push bytes to their API? Either works with no re-upload, since we hold the `public_id`. Doesn't block anything.
