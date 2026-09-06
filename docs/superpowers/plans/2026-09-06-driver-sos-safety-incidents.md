# Driver SOS / Safety Incidents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give drivers a one-tap SOS on mobile and web that files a structured safety incident with photos and location, alerts ops loudly, and gives ops a dedicated review queue on both ops surfaces.

**Architecture:** A new `SafetyIncident` vertical slice modelled on the existing `SupportCase` slice — same Prisma → additive-SQL → contracts → API → four-app-UI shape. Pure logic (severity derivation, ping admission, DTO mapping) lives in `apps/api/lib/safety-incident.ts` so it is unit-testable without a database; route files stay thin. Photo storage is a thin SOS-specific wrapper over the shared `apps/api/lib/private-media.ts` helper, not a third copy of the Cloudinary logic.

**Tech Stack:** Next.js App Router, Prisma 7 + Neon Postgres, Cloudinary (authenticated delivery type), Clerk (separate ops / driver instances), Zod, TanStack Query, Expo / React Native (`expo-location`, `expo-image-picker`, `expo-notifications`), Turborepo, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-06-driver-sos-safety-incidents-design.md`

---

## Global Constraints

- **Another agent is working concurrently in the primary working tree** (`C:/Users/victo/Documents/GitHub/AdmobiHQ`) on `feat/campaigns-end-to-end`. Do **not** implement this plan there. Task 0 creates an isolated worktree. Never run `git add -A` or `git add .` anywhere in this plan — stage named paths only.
- **No `prisma migrate`.** The Neon DB is shared with self-hosted n8n. Schema changes ship as `apps/web/prisma/scripts/safety-incidents-additive.sql`, run with `prisma db execute`. Edit `schema.prisma` for the generated client, create no migration folder. Never run `npm run db:push -w web` — it would drop the Payload CMS and n8n tables.
- **Never cross Clerk instances.** Driver routes use `requireDriverAccess()` (`apps/api/lib/api-utils.ts:71`). Ops routes use `requireOpsPermissionAccess("safety")` (`apps/api/lib/api-utils.ts:54`). A `SafetyIncident` is owned by `driver_clerk_user_id` from the **driver** instance.
- **The report must never be blocked on a location fix.** Permission denied, unavailable, or timed out all submit the incident with null coordinates.
- **Alerting is always fire-and-forget** (`void notify...`, or `try/catch` around email). A push or email failure must never fail the incident write. This mirrors `apps/api/app/v1/public/support/route.ts`.
- **Cloudinary public ids and signed URLs never reach a client.** Callers expose only the DB-assigned photo id, exactly as `driver-document-storage.ts` documents.
- **Commit trailers:** `CLAUDE.md` forbids `Co-Authored-By` trailers and "Generated with Claude Code" lines. Do not add them to any commit in this plan.
- **Docs:** per `CLAUDE.md`, shipping this feature includes writing its docs (Task 13). That is not optional cleanup.

### Fixed values (copy verbatim)

```
SAFETY_INCIDENT_TYPES  = accident, harassment, theft, vehicle_damage, medical, breakdown, other
SAFETY_SEVERITIES      = critical, high, medium
SAFETY_INCIDENT_STATUSES = new, acknowledged, in_progress, resolved, cancelled
ACK_TARGET_SECONDS     = 300
MAX_INCIDENT_PHOTOS    = 4
MAX_PHOTO_BYTES        = 8 * 1024 * 1024
ALLOWED_PHOTO_TYPES    = image/jpeg, image/png, image/webp
PING_INTERVAL_MS       = 120_000
PING_MAX_INCIDENT_AGE_MS = 6 * 60 * 60 * 1000
Ops permission key     = "safety"
Audit entity type      = "safety_incident"
Platform flag key      = "sos"
```

---

## Concurrency map — files the campaigns agent also touches

Both features append to these. Git merges append-at-different-offsets cleanly; appends at the same offset (notably end-of-file) conflict, and resolution is always **keep both sides**.

| File | Campaigns adds | SOS adds |
|---|---|---|
| `apps/web/prisma/schema.prisma` | `Campaign`, `CampaignCreative`, `CustomerNotification` | `SafetyIncident`, `SafetyIncidentPhoto`, `SafetyIncidentUpdate` |
| `packages/ops-contracts/src/enums.ts` | campaign enums, `OPS_PERMISSIONS += "campaigns"`, `AUDIT_ENTITY_TYPES += "campaign"` | safety enums, `OPS_PERMISSIONS += "safety"`, `AUDIT_ENTITY_TYPES += "safety_incident"`, `PLATFORM_FLAG_KEYS += "sos"` |
| `packages/ops-contracts/src/{schemas,types,index}.ts` | campaign schemas/DTOs | safety schemas/DTOs |
| `packages/ops-api-client/src/index.ts` | `campaigns` namespace | `safety` namespace |
| `apps/ops/components/roles-view.tsx` | `campaigns:` label | `safety:` label |
| `apps/ops-mobile/lib/permission-labels.ts` | `campaigns:` label | `safety:` label |
| `apps/ops/components/ops-shell.tsx` | Campaigns nav item | SOS nav item |
| `apps/ops-mobile/components/app/nav-drawer.tsx` | Campaigns entry | SOS entry |
| `apps/ops/lib/use-ops-notifications.ts` | campaigns source | safety source |
| `apps/api/lib/queries/entities.ts` | `listCampaigns` | `listSafetyIncidents` |
| `apps/api/lib/push/ops-alerts.ts` | (reuses existing `campaign` type) | `safety` type + override fields |

### Hard dependency on the campaigns branch

`apps/api/lib/private-media.ts` is **campaigns Task 3**. It landed on `feat/campaigns-end-to-end` as commit `057f63c` ("refactor(api): generalize Cloudinary private-media helper for images and video") on 2026-09-06 — so the block on Task 6 lifts as soon as that branch reaches `master`, with no further work needed on their side. Its exported interface, which Task 6 of this plan consumes:

```ts
export type PrivateResourceType = "image" | "video"
export type UploadedAsset = {
  publicId: string; contentType: string; sizeBytes: number
  width: number | null; height: number | null; durationSeconds: number | null
}
export function uploadPrivateAsset(file: File, publicId: string, resourceType: PrivateResourceType): Promise<UploadedAsset>
export function destroyPrivateAsset(publicId: string, resourceType: PrivateResourceType): Promise<void>
export function fetchPrivateAsset(publicId: string, options: {
  resourceType: PrivateResourceType; contentType?: string; maxWidth?: number | null
}): Promise<Response>
```

**Task 6 is blocked until that file exists on `master`.** Tasks 1–5 and 7–12 are not. If Task 6 is reached and `master` still lacks it, do not write a second Cloudinary helper — stop and report the block. Every other task proceeds independently.

`apps/api/lib/push/user-push.ts` (targeted single-user push, campaigns Task 8) is **deliberately not depended on**. SOS notifies drivers by writing `DriverNotification` rows, which their existing bell already reads. Adding driver push once `user-push.ts` lands is a later three-line follow-up, not part of this plan.

---

## Task 0: Isolated worktree

**Files:** none in the repo — this is workspace setup.

**Interfaces:**
- Produces: a working tree at `../AdmobiHQ-sos` on branch `feat/driver-sos`, based on `master`, where every later task runs.

**REQUIRED SUB-SKILL:** Use `superpowers:using-git-worktrees`.

- [ ] **Step 1: Confirm you are not about to disturb the other agent**

Run from the primary tree:
```bash
git worktree list
git status --short
```
Expected: one worktree, on `feat/campaigns-end-to-end`, with uncommitted campaign files (`private-media.ts`, `campaign-creative-storage.ts`, modified `driver-document-storage.ts`). **Do not stage, commit, stash, or revert any of them.** They belong to the other agent.

- [ ] **Step 2: Create the worktree off `master`**

```bash
git worktree add ../AdmobiHQ-sos -b feat/driver-sos master
```

Branching off `master` — not off `feat/campaigns-end-to-end` — keeps this branch independently reviewable and mergeable.

- [ ] **Step 3: Carry the spec and this plan onto the new branch**

Both documents were committed to `feat/campaigns-end-to-end` before this worktree existed. Copy the files across rather than cherry-picking — no hashes to go stale, and no risk of importing the `Co-Authored-By` trailer on the spec commit that `CLAUDE.md` forbids:

```bash
cd ../AdmobiHQ-sos
git checkout feat/campaigns-end-to-end -- \
  docs/superpowers/specs/2026-09-06-driver-sos-safety-incidents-design.md \
  docs/superpowers/plans/2026-09-06-driver-sos-safety-incidents.md
git commit -m "docs: add SOS design spec and implementation plan"
```

Leave `feat/campaigns-end-to-end` alone. Removing the two stray doc commits from that branch is the user's call, not this plan's — rewriting a branch another agent has checked out would break their working tree mid-task.

- [ ] **Step 4: Install and verify the worktree builds**

```bash
npm install
npm run test -w api
```
Expected: install completes; the existing API tests pass. If `npm install` is slow, that is expected for a fresh worktree — it does not share `node_modules`.

- [ ] **Step 5: Commit nothing**

There is nothing to commit here. Confirm `git status --short` is clean in the new worktree before starting Task 1.

**Every remaining task in this plan runs in `../AdmobiHQ-sos`.**

---

## Task 1: Prisma models and additive SQL

**Files:**
- Modify: `apps/web/prisma/schema.prisma` (append after the `SupportMessage` model, which ends around line 323)
- Create: `apps/web/prisma/scripts/safety-incidents-additive.sql`
- Modify: `apps/web/package.json` (scripts block, after the `db:campaigns` entries)

**Interfaces:**
- Produces: Prisma models `SafetyIncident`, `SafetyIncidentPhoto`, `SafetyIncidentUpdate`, and the generated client types every later API task imports from `@prisma/client`.

- [ ] **Step 1: Append the three models to `schema.prisma`**

Place them directly after `model SupportMessage { ... }` so the safety slice reads next to the support slice it is a sibling of.

```prisma
/// A driver-reported safety incident — the SOS flow on driver-web and
/// driver-mobile. Deliberately NOT a SupportCase category: an SOS is measured
/// by acknowledgement latency (see acknowledged_at), is only ever filed by an
/// authenticated driver (so the anonymous access_token_hash / SupportIdentity
/// machinery is dead weight), and must never be buried in the helpdesk inbox
/// behind billing questions.
///
/// driver_name / driver_phone are SNAPSHOTS taken from DriverProfile at
/// create. Ops needs a number to call in the first thirty seconds; that must
/// not depend on a DriverProfile row existing, being approved, or still
/// holding the same number weeks later.
model SafetyIncident {
  id                   Int    @id @default(autoincrement())
  driver_clerk_user_id String
  driver_name          String?
  driver_phone         String?

  type        String // accident, harassment, theft, vehicle_damage, medical, breakdown, other
  severity    String @default("high") // critical, high, medium — derived from type at create
  status      String @default("new") // new, acknowledged, in_progress, resolved, cancelled
  description String?

  /// Snapshot at submit. Null when the device had no fix — the report is
  /// never blocked on location.
  reported_lat        Float?
  reported_lng        Float?
  reported_accuracy_m Int?

  /// Overwritten by foreground re-pings while the incident is open. There is
  /// deliberately no ping-history table — ops sees the current pin move, not
  /// a breadcrumb trail.
  last_lat         Float?
  last_lng         Float?
  last_location_at DateTime?

  acknowledged_at       DateTime?
  acknowledged_by_email String?
  resolved_at           DateTime?
  resolved_by_email     String?
  resolution            String?

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  photos  SafetyIncidentPhoto[]
  updates SafetyIncidentUpdate[]

  @@index([status, created_at])
  @@index([driver_clerk_user_id, created_at])
  @@map("safety_incidents")
}

/// A photo of the damage/scene attached to an incident. Stored with
/// Cloudinary's "authenticated" delivery type via lib/private-media.ts —
/// cloudinary_public_id is private and never exposed to a client.
model SafetyIncidentPhoto {
  id                   Int            @id @default(autoincrement())
  incident_id          Int
  incident             SafetyIncident @relation(fields: [incident_id], references: [id], onDelete: Cascade)
  cloudinary_public_id String         @unique
  content_type         String
  size_bytes           Int
  created_at           DateTime       @default(now())

  @@index([incident_id])
  @@map("safety_incident_photos")
}

/// One entry in the incident thread. author_type "system" records lifecycle
/// events (acknowledged / resolved / cancelled) in the same list the humans
/// write to, so the detail view is one chronological feed rather than a
/// timeline plus a separate conversation.
model SafetyIncidentUpdate {
  id              Int            @id @default(autoincrement())
  incident_id     Int
  incident        SafetyIncident @relation(fields: [incident_id], references: [id], onDelete: Cascade)
  author_type     String // "driver" | "ops" | "system"
  author_email    String?
  author_clerk_id String?
  body            String
  internal_note   Boolean        @default(false)
  created_at      DateTime       @default(now())

  @@index([incident_id, created_at])
  @@map("safety_incident_updates")
}
```

- [ ] **Step 2: Create the additive SQL script**

Create `apps/web/prisma/scripts/safety-incidents-additive.sql`:

```sql
-- Safe additive migration: safety_incidents + safety_incident_photos +
-- safety_incident_updates, backing the SafetyIncident / SafetyIncidentPhoto /
-- SafetyIncidentUpdate Prisma models — the driver SOS flow, with ops review
-- on both ops surfaces.
--
-- Linked to the DRIVER Clerk instance's user id, the same key
-- driver_profiles.clerk_user_id and driver_notifications.clerk_user_id use.
-- NOT related to support_cases: an SOS is a separate entity on purpose (see
-- docs/superpowers/specs/2026-09-06-driver-sos-safety-incidents-design.md).
--
-- Also grants the new "safety" ops permission to the seeded Member role, so
-- existing members can see the SOS queue (see ops-roles-additive.sql).
--
-- Does NOT touch Payload tables or the n8n workflow tables sharing this DB.
--
-- HOW TO RUN (pick one):
--   A) Neon dashboard -> SQL Editor -> paste this entire file -> Run
--   B) From repo root: npm run db:safety-incidents -w web
--
-- Do NOT paste SQL into PowerShell — that is not a SQL client.
-- Do NOT run: npm run db:push -w web (would drop Payload CMS + n8n tables).

CREATE TABLE IF NOT EXISTS safety_incidents (
  id                    SERIAL PRIMARY KEY,
  driver_clerk_user_id  TEXT NOT NULL,
  driver_name           TEXT,
  driver_phone          TEXT,
  type                  TEXT NOT NULL,
  severity              TEXT NOT NULL DEFAULT 'high',
  status                TEXT NOT NULL DEFAULT 'new',
  description           TEXT,
  reported_lat          DOUBLE PRECISION,
  reported_lng          DOUBLE PRECISION,
  reported_accuracy_m   INTEGER,
  last_lat              DOUBLE PRECISION,
  last_lng              DOUBLE PRECISION,
  last_location_at      TIMESTAMP(3),
  acknowledged_at       TIMESTAMP(3),
  acknowledged_by_email TEXT,
  resolved_at           TIMESTAMP(3),
  resolved_by_email     TEXT,
  resolution            TEXT,
  created_at            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS safety_incidents_status_created_at_idx
  ON safety_incidents (status, created_at);
CREATE INDEX IF NOT EXISTS safety_incidents_driver_created_at_idx
  ON safety_incidents (driver_clerk_user_id, created_at);

CREATE TABLE IF NOT EXISTS safety_incident_photos (
  id                   SERIAL PRIMARY KEY,
  incident_id          INTEGER NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,
  cloudinary_public_id TEXT NOT NULL UNIQUE,
  content_type         TEXT NOT NULL,
  size_bytes           INTEGER NOT NULL,
  created_at           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS safety_incident_photos_incident_id_idx
  ON safety_incident_photos (incident_id);

CREATE TABLE IF NOT EXISTS safety_incident_updates (
  id              SERIAL PRIMARY KEY,
  incident_id     INTEGER NOT NULL REFERENCES safety_incidents(id) ON DELETE CASCADE,
  author_type     TEXT NOT NULL,
  author_email    TEXT,
  author_clerk_id TEXT,
  body            TEXT NOT NULL,
  internal_note   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS safety_incident_updates_incident_created_at_idx
  ON safety_incident_updates (incident_id, created_at);

-- Grant the new permission to the seeded Member role so existing ops members
-- can reach the queue without a manual edit in Team -> Roles.
UPDATE ops_roles
   SET permissions = array_append(permissions, 'safety')
 WHERE name = 'Member'
   AND NOT ('safety' = ANY(permissions));
```

- [ ] **Step 3: Add the db scripts**

In `apps/web/package.json`, directly after the two `db:campaigns` entries:

```json
"db:safety-incidents": "dotenv -e .env.local -- prisma db execute --file prisma/scripts/safety-incidents-additive.sql",
"db:safety-incidents:prod": "dotenv -e .env.production.local -- prisma db execute --file prisma/scripts/safety-incidents-additive.sql",
```

- [ ] **Step 4: Generate the client and verify it compiles**

```bash
npx prisma generate --schema apps/web/prisma/schema.prisma
```
Expected: "Generated Prisma Client". If it errors on a relation, the most likely cause is a missing back-relation field on `SafetyIncident` — both child models need their `incident` field and `SafetyIncident` needs both list fields.

- [ ] **Step 5: Run the SQL against the dev database**

```bash
npm run db:safety-incidents -w web
```
Expected: success, no output about dropped tables. Re-run it once more — every statement is `IF NOT EXISTS` or guarded, so a second run must also succeed. That idempotency is what makes it safe to hand to the user for production.

- [ ] **Step 6: Commit**

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/scripts/safety-incidents-additive.sql apps/web/package.json
git commit -m "feat(db): add safety_incidents, photos, and updates tables"
```

---

## Task 2: Contracts — enums, schemas, DTOs

**Files:**
- Modify: `packages/ops-contracts/src/enums.ts`
- Modify: `packages/ops-contracts/src/schemas.ts`
- Modify: `packages/ops-contracts/src/types.ts`
- Modify: `apps/ops/components/roles-view.tsx` (`PERMISSION_LABELS`)
- Modify: `apps/ops-mobile/lib/permission-labels.ts` (`PERMISSION_LABELS`)
- Test: `packages/ops-contracts/src/safety.test.ts`

**Interfaces:**
- Produces: `SAFETY_INCIDENT_TYPES`, `SAFETY_SEVERITIES`, `SAFETY_INCIDENT_STATUSES`, `ACK_TARGET_SECONDS`, `SEVERITY_BY_TYPE`, `safetyIncidentCreateSchema`, `safetyIncidentDriverUpdateSchema`, `safetyIncidentOpsUpdateSchema`, `safetyIncidentLocationSchema`, `safetyIncidentMessageCreateSchema`, `SafetyIncidentDto`, `SafetyIncidentDetailDto`, `SafetyIncidentUpdateDto`, `SafetyIncidentPhotoDto`. Every later task imports these from `@workspace/ops-contracts`.

- [ ] **Step 1: Write the failing test**

Create `packages/ops-contracts/src/safety.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import {
  SAFETY_INCIDENT_TYPES,
  SEVERITY_BY_TYPE,
  safetyIncidentCreateSchema,
  safetyIncidentLocationSchema,
} from "./index"

describe("SEVERITY_BY_TYPE", () => {
  it("maps every incident type — a missing entry would silently default a real emergency", () => {
    for (const type of SAFETY_INCIDENT_TYPES) {
      expect(SEVERITY_BY_TYPE[type]).toBeDefined()
    }
  })

  it("treats accident, medical and harassment as critical", () => {
    expect(SEVERITY_BY_TYPE.accident).toBe("critical")
    expect(SEVERITY_BY_TYPE.medical).toBe("critical")
    expect(SEVERITY_BY_TYPE.harassment).toBe("critical")
  })
})

describe("safetyIncidentCreateSchema", () => {
  it("accepts a report with no location at all", () => {
    const parsed = safetyIncidentCreateSchema.safeParse({
      type: "accident",
      channel: "driver-mobile",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects an unknown incident type", () => {
    const parsed = safetyIncidentCreateSchema.safeParse({
      type: "alien_abduction",
      channel: "driver-mobile",
    })
    expect(parsed.success).toBe(false)
  })

  it("rejects out-of-range coordinates", () => {
    const parsed = safetyIncidentCreateSchema.safeParse({
      type: "breakdown",
      channel: "driver-web",
      reported_lat: 91,
      reported_lng: 36.8,
    })
    expect(parsed.success).toBe(false)
  })
})

describe("safetyIncidentLocationSchema", () => {
  it("requires both coordinates — a half-fix is not a position", () => {
    expect(safetyIncidentLocationSchema.safeParse({ lat: -1.29 }).success).toBe(false)
    expect(
      safetyIncidentLocationSchema.safeParse({ lat: -1.29, lng: 36.82 }).success,
    ).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm run test -w @workspace/ops-contracts
```
Expected: FAIL — `SAFETY_INCIDENT_TYPES` is not exported from `./index`.

- [ ] **Step 3: Add the enums**

Append to `packages/ops-contracts/src/enums.ts`:

```ts
export const SAFETY_INCIDENT_TYPES = [
  "accident",
  "harassment",
  "theft",
  "vehicle_damage",
  "medical",
  "breakdown",
  "other",
] as const
export type SafetyIncidentType = (typeof SAFETY_INCIDENT_TYPES)[number]

export const SAFETY_SEVERITIES = ["critical", "high", "medium"] as const
export type SafetySeverity = (typeof SAFETY_SEVERITIES)[number]

export const SAFETY_INCIDENT_STATUSES = [
  "new",
  "acknowledged",
  "in_progress",
  "resolved",
  "cancelled",
] as const
export type SafetyIncidentStatus = (typeof SAFETY_INCIDENT_STATUSES)[number]

/** Statuses that accept no further driver input and no location pings. */
export const SAFETY_TERMINAL_STATUSES = ["resolved", "cancelled"] as const

/**
 * The driver is never asked to rate their own emergency — severity is derived
 * from the incident type at create, and ops adjusts it if wrong. Asking
 * someone who has just been hit to pick "critical" vs "high" is a worse form
 * than guessing and letting a human correct it.
 */
export const SEVERITY_BY_TYPE: Record<SafetyIncidentType, SafetySeverity> = {
  accident: "critical",
  medical: "critical",
  harassment: "critical",
  theft: "high",
  vehicle_damage: "medium",
  breakdown: "medium",
  other: "high",
}

/**
 * Drives the red acknowledgement clock in the ops SOS list. There is
 * deliberately no auto-escalation attached: an escalation path nobody is
 * rota'd for is theatre.
 */
export const ACK_TARGET_SECONDS = 300
```

In the same file, extend three existing arrays. **Append to the end of each array literal** so a merge with the campaigns branch is a keep-both:

- `OPS_PERMISSIONS` (line ~235): add `"safety",` after `"campaigns",`
- `AUDIT_ENTITY_TYPES` (line ~211): add `"safety_incident",` after `"campaign_creative",`
- `PLATFORM_FLAG_KEYS` (line ~253): becomes `["deliveries", "sos"] as const`

- [ ] **Step 4: Add the Zod schemas**

Append to `packages/ops-contracts/src/schemas.ts`:

```ts
const latitude = z.number().min(-90).max(90)
const longitude = z.number().min(-180).max(180)

export const safetyIncidentCreateSchema = z.object({
  type: z.enum(SAFETY_INCIDENT_TYPES),
  channel: z.enum(["driver-web", "driver-mobile"]),
  description: z.string().max(2000).optional(),
  reported_lat: latitude.optional(),
  reported_lng: longitude.optional(),
  reported_accuracy_m: z.number().int().min(0).max(100_000).optional(),
})

/** Drivers may only cancel. Every other transition is ops-only. */
export const safetyIncidentDriverUpdateSchema = z.object({
  status: z.literal("cancelled"),
})

export const safetyIncidentOpsUpdateSchema = z.object({
  status: z.enum(SAFETY_INCIDENT_STATUSES).optional(),
  severity: z.enum(SAFETY_SEVERITIES).optional(),
  resolution: z.string().max(2000).optional(),
})

export const safetyIncidentLocationSchema = z.object({
  lat: latitude,
  lng: longitude,
  accuracy_m: z.number().int().min(0).max(100_000).optional(),
})

export const safetyIncidentMessageCreateSchema = z.object({
  body: z.string().min(1).max(4000),
  internal_note: z.boolean().optional(),
})

export type SafetyIncidentCreateInput = z.infer<typeof safetyIncidentCreateSchema>
export type SafetyIncidentOpsUpdateInput = z.infer<typeof safetyIncidentOpsUpdateSchema>
export type SafetyIncidentLocationInput = z.infer<typeof safetyIncidentLocationSchema>
export type SafetyIncidentMessageCreateInput = z.infer<typeof safetyIncidentMessageCreateSchema>
```

Import the enums at the top of the file alongside the existing enum imports.

- [ ] **Step 5: Add the DTOs**

Append to `packages/ops-contracts/src/types.ts`:

```ts
export type SafetyIncidentPhotoDto = {
  id: number
  content_type: string
  created_at: string
}

export type SafetyIncidentUpdateDto = {
  id: number
  author_type: "driver" | "ops" | "system"
  author_email: string | null
  body: string
  internal_note: boolean
  created_at: string
}

export type SafetyIncidentDto = {
  id: number
  driver_name: string | null
  driver_phone: string | null
  type: string
  severity: string
  status: string
  description: string | null
  reported_lat: number | null
  reported_lng: number | null
  reported_accuracy_m: number | null
  last_lat: number | null
  last_lng: number | null
  last_location_at: string | null
  acknowledged_at: string | null
  acknowledged_by_email: string | null
  resolved_at: string | null
  resolved_by_email: string | null
  resolution: string | null
  photo_count: number
  created_at: string
  updated_at: string
}

export type SafetyIncidentDetailDto = SafetyIncidentDto & {
  updates: SafetyIncidentUpdateDto[]
  photos: SafetyIncidentPhotoDto[]
}

export type SafetyListQueryParams = Partial<PaginationParams> & {
  status?: string
  type?: string
  severity?: string
}
```

Export everything new from `packages/ops-contracts/src/index.ts` following the existing re-export style in that file.

- [ ] **Step 6: Run the test and watch it pass**

```bash
npm run test -w @workspace/ops-contracts
```
Expected: PASS, all 6 assertions.

- [ ] **Step 7: Add the permission labels**

`PERMISSION_LABELS` is a `Record<OpsPermission, string>` in two files, so adding `"safety"` to `OPS_PERMISSIONS` breaks both until they are updated. Add to each, after the `campaigns` entry:

```ts
safety: "SOS & Safety",
```

- Modify `apps/ops/components/roles-view.tsx`
- Modify `apps/ops-mobile/lib/permission-labels.ts`

- [ ] **Step 8: Typecheck the whole workspace**

```bash
npm run typecheck
```
Expected: clean. A `Record<OpsPermission, string>` error names whichever `PERMISSION_LABELS` you missed.

- [ ] **Step 9: Commit**

```bash
git add packages/ops-contracts/src apps/ops/components/roles-view.tsx apps/ops-mobile/lib/permission-labels.ts
git commit -m "feat(contracts): add safety incident enums, schemas, and DTOs"
```

---

## Task 3: Pure incident logic + DTO mappers

**Files:**
- Create: `apps/api/lib/safety-incident.ts`
- Test: `apps/api/lib/safety-incident.test.ts`

**Interfaces:**
- Consumes: contracts from Task 2.
- Produces:
  - `severityForType(type: SafetyIncidentType): SafetySeverity`
  - `isTerminalStatus(status: string): boolean`
  - `pingAdmission(incident: { status: string; created_at: Date }, now?: Date): "accept" | "terminal" | "stale"`
  - `canAcceptPhoto(currentCount: number, file: { type: string; size: number }): { ok: true } | { ok: false; reason: string }`
  - `toDriverIncident(i, photos, updates): SafetyIncidentDetailDto`
  - `toOpsIncident(i, photoCount): SafetyIncidentDto`
  - `toIncidentUpdate(u): SafetyIncidentUpdateDto`
  - `toIncidentPhoto(p): SafetyIncidentPhotoDto`

Every route in Tasks 4–7 uses these. Keeping them pure is what makes them testable without a database — the existing API tests (`apps/api/lib/private-media.test.ts`) are offline unit tests, and this follows that.

- [ ] **Step 1: Write the failing test**

Create `apps/api/lib/safety-incident.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import {
  canAcceptPhoto,
  isTerminalStatus,
  pingAdmission,
  severityForType,
} from "./safety-incident"

const HOUR = 60 * 60 * 1000

describe("severityForType", () => {
  it("derives critical for an accident", () => {
    expect(severityForType("accident")).toBe("critical")
  })
  it("falls back to high for an unrecognised type rather than throwing", () => {
    expect(severityForType("nonsense" as never)).toBe("high")
  })
})

describe("isTerminalStatus", () => {
  it.each(["resolved", "cancelled"])("treats %s as terminal", (s) => {
    expect(isTerminalStatus(s)).toBe(true)
  })
  it.each(["new", "acknowledged", "in_progress"])("treats %s as open", (s) => {
    expect(isTerminalStatus(s)).toBe(false)
  })
})

describe("pingAdmission", () => {
  const now = new Date("2026-09-06T12:00:00Z")

  it("accepts a ping for a fresh open incident", () => {
    const created_at = new Date(now.getTime() - 10 * 60_000)
    expect(pingAdmission({ status: "acknowledged", created_at }, now)).toBe("accept")
  })

  it("refuses a ping once the incident is resolved", () => {
    const created_at = new Date(now.getTime() - 10 * 60_000)
    expect(pingAdmission({ status: "resolved", created_at }, now)).toBe("terminal")
  })

  it("refuses a ping for an incident older than 6h — a phone left in a drawer must stop", () => {
    const created_at = new Date(now.getTime() - 7 * HOUR)
    expect(pingAdmission({ status: "new", created_at }, now)).toBe("stale")
  })

  it("still accepts at 5h59m — the cutoff is 6h, not 'about 6h'", () => {
    const created_at = new Date(now.getTime() - (6 * HOUR - 60_000))
    expect(pingAdmission({ status: "new", created_at }, now)).toBe("accept")
  })
})

describe("canAcceptPhoto", () => {
  const jpeg = { type: "image/jpeg", size: 1_000 }

  it("accepts the fourth photo", () => {
    expect(canAcceptPhoto(3, jpeg).ok).toBe(true)
  })
  it("rejects the fifth", () => {
    const result = canAcceptPhoto(4, jpeg)
    expect(result.ok).toBe(false)
  })
  it("rejects a PDF", () => {
    expect(canAcceptPhoto(0, { type: "application/pdf", size: 1_000 }).ok).toBe(false)
  })
  it("rejects a file over 8MB", () => {
    expect(canAcceptPhoto(0, { type: "image/jpeg", size: 9 * 1024 * 1024 }).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm run test -w api -- safety-incident
```
Expected: FAIL — cannot resolve `./safety-incident`.

- [ ] **Step 3: Write the implementation**

Create `apps/api/lib/safety-incident.ts`:

```ts
import type {
  SafetyIncident,
  SafetyIncidentPhoto,
  SafetyIncidentUpdate,
} from "@prisma/client"

import {
  SEVERITY_BY_TYPE,
  type SafetyIncidentDetailDto,
  type SafetyIncidentDto,
  type SafetyIncidentPhotoDto,
  type SafetyIncidentType,
  type SafetyIncidentUpdateDto,
  type SafetySeverity,
} from "@workspace/ops-contracts"

export const MAX_INCIDENT_PHOTOS = 4
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024
export const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

/** Pings stop 6h after the report regardless of status — see pingAdmission. */
export const PING_MAX_INCIDENT_AGE_MS = 6 * 60 * 60 * 1000

const TERMINAL = new Set(["resolved", "cancelled"])

export function severityForType(type: SafetyIncidentType): SafetySeverity {
  return SEVERITY_BY_TYPE[type] ?? "high"
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL.has(status)
}

/**
 * Decides whether a location re-ping should be written.
 *
 * The 6h age cap is the important half: the client stops pinging when it sees
 * a terminal status, but a phone that lost connectivity, was left in a drawer,
 * or never reloaded the tracking screen would otherwise ping forever. Neon
 * compute is this platform's main cost driver, so the server refuses rather
 * than trusting the client to stop.
 */
export function pingAdmission(
  incident: { status: string; created_at: Date },
  now: Date = new Date(),
): "accept" | "terminal" | "stale" {
  if (isTerminalStatus(incident.status)) return "terminal"
  if (now.getTime() - incident.created_at.getTime() > PING_MAX_INCIDENT_AGE_MS) return "stale"
  return "accept"
}

export function canAcceptPhoto(
  currentCount: number,
  file: { type: string; size: number },
): { ok: true } | { ok: false; reason: string } {
  if (currentCount >= MAX_INCIDENT_PHOTOS) {
    return { ok: false, reason: `An incident can have at most ${MAX_INCIDENT_PHOTOS} photos` }
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { ok: false, reason: "Photo must be JPEG, PNG, or WebP" }
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, reason: "Photo must be under 8MB" }
  }
  return { ok: true }
}

export function toIncidentPhoto(p: SafetyIncidentPhoto): SafetyIncidentPhotoDto {
  return {
    id: p.id,
    content_type: p.content_type,
    created_at: p.created_at.toISOString(),
  }
}

export function toIncidentUpdate(u: SafetyIncidentUpdate): SafetyIncidentUpdateDto {
  return {
    id: u.id,
    author_type: u.author_type as SafetyIncidentUpdateDto["author_type"],
    author_email: u.author_email,
    body: u.body,
    internal_note: u.internal_note,
    created_at: u.created_at.toISOString(),
  }
}

function baseIncident(i: SafetyIncident, photoCount: number): SafetyIncidentDto {
  return {
    id: i.id,
    driver_name: i.driver_name,
    driver_phone: i.driver_phone,
    type: i.type,
    severity: i.severity,
    status: i.status,
    description: i.description,
    reported_lat: i.reported_lat,
    reported_lng: i.reported_lng,
    reported_accuracy_m: i.reported_accuracy_m,
    last_lat: i.last_lat,
    last_lng: i.last_lng,
    last_location_at: i.last_location_at?.toISOString() ?? null,
    acknowledged_at: i.acknowledged_at?.toISOString() ?? null,
    acknowledged_by_email: i.acknowledged_by_email,
    resolved_at: i.resolved_at?.toISOString() ?? null,
    resolved_by_email: i.resolved_by_email,
    resolution: i.resolution,
    photo_count: photoCount,
    created_at: i.created_at.toISOString(),
    updated_at: i.updated_at.toISOString(),
  }
}

export function toOpsIncident(i: SafetyIncident, photoCount: number): SafetyIncidentDto {
  return baseIncident(i, photoCount)
}

/**
 * The driver's view. Internal ops notes are filtered out here rather than in
 * the route, so no driver-facing caller can forget to do it.
 */
export function toDriverIncident(
  i: SafetyIncident,
  photos: SafetyIncidentPhoto[],
  updates: SafetyIncidentUpdate[],
): SafetyIncidentDetailDto {
  return {
    ...baseIncident(i, photos.length),
    photos: photos.map(toIncidentPhoto),
    updates: updates.filter((u) => !u.internal_note).map(toIncidentUpdate),
  }
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npm run test -w api -- safety-incident
```
Expected: PASS, 13 assertions.

- [ ] **Step 5: Commit**

```bash
git add apps/api/lib/safety-incident.ts apps/api/lib/safety-incident.test.ts
git commit -m "feat(api): add pure safety-incident logic and DTO mappers"
```

---

## Task 4: Ops alerting

**Files:**
- Modify: `apps/api/lib/push/ops-alerts.ts`
- Create: `apps/api/lib/email/templates/SafetyIncidentAlert.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `notifyOpsStaffAlert` accepting `type: "safety"` plus optional `title`, `body`, `channelId`, `color`; and the `SafetyIncidentAlert` email component taking `{ incidentId, driverName, driverPhone, type, severity, description, mapsUrl, opsUrl }`.

- [ ] **Step 1: Extend the alert type maps**

In `apps/api/lib/push/ops-alerts.ts`, add `"safety"` to `OpsAlertType`, `TYPE_LABELS` (`safety: "SOS"`), and `ROUTE_SEGMENT` (`safety: "sos"`).

- [ ] **Step 2: Add the overrides to the input type**

Extending the existing function rather than writing a parallel one: a second implementation would have to re-do token lookup, receipt recording, and invalid-token pruning, all of which already work here.

```ts
export type OpsStaffAlertInput = {
  type: OpsAlertType
  entityId: number
  submitterName: string
  submitterCompany?: string
  /** SOS overrides the default "New <label>" / submitter-name copy: an
   *  emergency needs its own wording, its own Android channel (so the sound
   *  is not silently downgraded), and high priority. */
  title?: string
  body?: string
  channelId?: string
  color?: string
}
```

- [ ] **Step 3: Use the overrides when building messages**

Replace the `title`, `body`, and the `channelId`/`color` fields inside the `messages` map:

```ts
const title = input.title ?? `New ${TYPE_LABELS[input.type]}`
const body =
  input.body ??
  (input.submitterCompany
    ? `${input.submitterName} · ${input.submitterCompany}`
    : input.submitterName)
```

and in the message object: `channelId: input.channelId ?? "default"`, `color: input.color ?? "#0b6e4f"`.

Leave `priority: "high"` as-is — it is already what an SOS needs, and every other alert type keeps its current behaviour because both overrides default to today's values.

- [ ] **Step 4: Create the admin email template**

Create `apps/api/lib/email/templates/SafetyIncidentAlert.tsx`, modelled on the existing `AdminAlert` template in the same directory — open it first and match its component structure, imports, and inline-style conventions exactly rather than inventing a new layout. Content, in order: a red header reading `SOS — {type}`, driver name, a `tel:` link on the phone, severity, the description, a Google Maps link (`https://www.google.com/maps?q={lat},{lng}`) or "Location unavailable", and a button linking to `{opsUrl}`.

Props:

```ts
type SafetyIncidentAlertProps = {
  incidentId: number
  driverName: string
  driverPhone: string | null
  type: string
  severity: string
  description: string | null
  mapsUrl: string | null
  opsUrl: string
}
```

- [ ] **Step 5: Verify nothing regressed**

```bash
npm run test -w api
npm run typecheck
```
Expected: existing tests pass, types clean. There is no unit test for the push path itself — it is a network call whose failure mode is already swallowed; the real verification is the manual device check in Task 12.

- [ ] **Step 6: Commit**

```bash
git add apps/api/lib/push/ops-alerts.ts apps/api/lib/email/templates/SafetyIncidentAlert.tsx
git commit -m "feat(api): add safety alert type and SOS admin email template"
```

---

## Task 5: Driver API — create, list, detail, cancel, messages, location

**Files:**
- Create: `apps/api/app/v1/driver/sos/route.ts`
- Create: `apps/api/app/v1/driver/sos/[id]/route.ts`
- Create: `apps/api/app/v1/driver/sos/[id]/messages/route.ts`
- Create: `apps/api/app/v1/driver/sos/[id]/location/route.ts`
- Create: `apps/api/lib/safety-incident-store.ts`

**Interfaces:**
- Consumes: Task 2 contracts, Task 3 helpers, Task 4 `notifyOpsStaffAlert`.
- Produces: `loadOwnedIncident(id: number, driverClerkUserId: string): Promise<SafetyIncident | null>` and `appendSystemUpdate(incidentId: number, body: string): Promise<void>` from `safety-incident-store.ts`; the six driver endpoints consumed by Tasks 9 and 12.

- [ ] **Step 1: Create the store helpers**

Create `apps/api/lib/safety-incident-store.ts`:

```ts
import type { SafetyIncident } from "@prisma/client"

import { prisma } from "@/lib/prisma"

/**
 * Loads an incident only if it belongs to this driver. Every driver-facing
 * route goes through this rather than a bare findUnique — a plain id lookup
 * plus a forgotten ownership check is how one driver reads another's
 * emergency.
 */
export async function loadOwnedIncident(
  id: number,
  driverClerkUserId: string,
): Promise<SafetyIncident | null> {
  const incident = await prisma.safetyIncident.findUnique({ where: { id } })
  if (!incident) return null
  if (incident.driver_clerk_user_id !== driverClerkUserId) return null
  return incident
}

/** Lifecycle events land in the same thread humans write to. */
export async function appendSystemUpdate(incidentId: number, body: string): Promise<void> {
  await prisma.safetyIncidentUpdate.create({
    data: { incident_id: incidentId, author_type: "system", body },
  })
}
```

Returning `null` for "not yours" rather than throwing is deliberate: routes then answer 404 for both missing and forbidden, which does not leak whether an id exists.

- [ ] **Step 2: Create `POST` / `GET` at `/v1/driver/sos`**

Create `apps/api/app/v1/driver/sos/route.ts`. `POST`:

1. `const limited = await checkRateLimit(req, "sos-create", { limit: 3, windowSeconds: 300 })` — return it if truthy.
2. `const auth = await requireDriverAccess()` — return `auth.error` if set.
3. `const parsed = await parseJsonBody(req, safetyIncidentCreateSchema)` — return `parsed.error` if present.
4. Snapshot the driver: `const profile = await prisma.driverProfile.findUnique({ where: { clerk_user_id: auth.access.userId } })`, then `driver_name: profile?.full_name ?? null`, `driver_phone: profile?.phone ?? null`.
5. `prisma.safetyIncident.create` with `severity: severityForType(parsed.data.type)` and the parsed location fields (`?? null`).
6. Fire-and-forget alerts:

```ts
void notifyOpsStaffAlert({
  type: "safety",
  entityId: incident.id,
  submitterName: incident.driver_name ?? "A driver",
  title: `🚨 SOS — ${formatLabel(incident.type)}`,
  body: `${incident.driver_name ?? "A driver"} · tap to respond`,
  channelId: "safety",
  color: "#dc2626",
})
```

7. Admin email in a `try/catch` that only logs, using `renderTemplate(SafetyIncidentAlert, {...})` and `sendAdminEmail(\`🚨 SOS #${incident.id}: ${formatLabel(incident.type)}\`, html)`. Build `mapsUrl` from `reported_lat`/`reported_lng` when both are present, else `null`.
8. `await auditFromDriverUser(auth.access.userId, { action: "create", entity_type: "safety_incident", entity_id: incident.id, summary: \`Filed SOS #${incident.id} (${incident.type})\` })`
9. Return `NextResponse.json({ success: true, data: toDriverIncident(incident, [], []) }, { status: 201 })`.

`GET`: `requireDriverAccess()`, then `prisma.safetyIncident.findMany({ where: { driver_clerk_user_id: auth.access.userId }, orderBy: { created_at: "desc" }, take: 50, include: { _count: { select: { photos: true } } } })`, returning `{ items: rows.map((r) => toOpsIncident(r, r._count.photos)) }`. `toOpsIncident` is the plain non-thread mapper and exposes nothing driver-private — the name refers to its shape, not its audience.

- [ ] **Step 3: Create `GET` / `PATCH` at `/v1/driver/sos/[id]`**

Create `apps/api/app/v1/driver/sos/[id]/route.ts`, using the `type Params = { params: Promise<{ id: string }> }` idiom from `apps/api/app/v1/support/[id]/route.ts`.

`GET`: `requireDriverAccess()` → `parseId` → `loadOwnedIncident` → 404 if null → load photos (`orderBy: { created_at: "asc" }`) and updates (`orderBy: { created_at: "asc" }`) → return `toDriverIncident(incident, photos, updates)`.

`PATCH`: same preamble, then `parseJsonBody(req, safetyIncidentDriverUpdateSchema)`. The schema is `z.literal("cancelled")`, so any other status is already a 400. Additionally:

```ts
if (isTerminalStatus(incident.status)) {
  return jsonError("This incident is already closed", 409)
}
```

Then update to `status: "cancelled"`, `appendSystemUpdate(id, "Driver cancelled this report.")`, audit with `action: "update"`, and return the updated DTO.

- [ ] **Step 4: Create `POST` at `/v1/driver/sos/[id]/messages`**

`requireDriverAccess()` → `parseId` → `loadOwnedIncident` → 404 if null → reject with 409 when `isTerminalStatus(incident.status)` → `parseJsonBody(req, safetyIncidentMessageCreateSchema)`.

**Ignore `internal_note` here** — a driver must never be able to write an ops-internal note. Create with `author_type: "driver"`, `author_clerk_id: auth.access.userId`, `internal_note: false` hardcoded. Return `toIncidentUpdate(created)`.

- [ ] **Step 5: Create `POST` at `/v1/driver/sos/[id]/location`**

```ts
export async function POST(req: Request, { params }: Params) {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (!id) return jsonError("Invalid id", 400)

  const incident = await loadOwnedIncident(id, auth.access.userId)
  if (!incident) return jsonError("Not found", 404)

  // ponytail: one UPDATE of three columns, no ping-history table. Ops sees
  // the current pin move, not a breadcrumb trail. If a trail is ever needed,
  // add safety_incident_location_pings — do not start appending here.
  const admission = pingAdmission(incident)
  if (admission !== "accept") {
    return new Response(null, { status: 204 })
  }

  const parsed = await parseJsonBody(req, safetyIncidentLocationSchema)
  if ("error" in parsed) return parsed.error

  await prisma.safetyIncident.update({
    where: { id },
    data: {
      last_lat: parsed.data.lat,
      last_lng: parsed.data.lng,
      last_location_at: new Date(),
    },
  })

  return new Response(null, { status: 204 })
}
```

The admission check runs **before** body parsing on purpose: a stale client's ping should cost one indexed read and nothing else. No audit event here either — a ping every two minutes would drown the activity trail.

- [ ] **Step 6: Verify by hand against the dev API**

Start the API (`npm run dev -w api`) and, with a driver Clerk token in `$TOKEN`:

```bash
curl -s -X POST localhost:3003/v1/driver/sos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"accident","channel":"driver-web","description":"test","reported_lat":-1.29,"reported_lng":36.82}'
```
Expected: 201 with `"severity":"critical"` and `"status":"new"`.

```bash
curl -s -X POST localhost:3003/v1/driver/sos/1/location \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"lat":-1.30,"lng":36.83}' -o /dev/null -w '%{http_code}\n'
```
Expected: `204`, and `GET /v1/driver/sos/1` now shows `last_lat`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/lib/safety-incident-store.ts apps/api/app/v1/driver/sos
git commit -m "feat(api): add driver SOS create, detail, cancel, message, and location routes"
```

---

## Task 6: Incident photos — BLOCKED on `private-media.ts` reaching `master`

**Files:**
- Create: `apps/api/lib/incident-photo-storage.ts`
- Create: `apps/api/app/v1/driver/sos/[id]/photos/route.ts`
- Test: `apps/api/lib/incident-photo-storage.test.ts`

**Interfaces:**
- Consumes: `uploadPrivateAsset`, `destroyPrivateAsset`, `fetchPrivateAsset` from `apps/api/lib/private-media.ts` (campaigns Task 3); `canAcceptPhoto` from Task 3; `loadOwnedIncident` from Task 5.
- Produces: `buildIncidentPhotoPublicId(incidentId, uploadId)`, `uploadIncidentPhoto(file, publicId)`, `fetchIncidentPhoto(publicId, contentType)`; the `POST /v1/driver/sos/[id]/photos` endpoint used by Tasks 9 and 12, and `fetchIncidentPhoto` consumed by Task 7's ops file route.

- [ ] **Step 1: Check the dependency**

```bash
git fetch origin && git log origin/master --oneline -- apps/api/lib/private-media.ts | head
ls apps/api/lib/private-media.ts
```

If the file is absent, **stop and report the block**. Do not write a second Cloudinary helper — the whole point of the campaigns agent generalising `driver-document-storage.ts` was to have exactly one. Rebase onto `master` once it lands:

```bash
git rebase master
```

- [ ] **Step 2: Write the failing test**

Create `apps/api/lib/incident-photo-storage.test.ts`, following the offline signed-URL idiom already established in `apps/api/lib/private-media.test.ts` — read that file first and copy its `beforeAll` warm-up (the Cloudinary SDK takes ~6s to import cold and will blow the default 5s timeout otherwise).

```ts
import { beforeAll, describe, expect, it, vi } from "vitest"

beforeAll(async () => {
  process.env.CLOUDINARY_URL = "cloudinary://123456789012345:test-api-secret@test-cloud"
  vi.resetModules()
  await import("./incident-photo-storage")
}, 30_000)

describe("buildIncidentPhotoPublicId", () => {
  it("namespaces under safety-incidents/<id> so the Media Library groups them", async () => {
    const { buildIncidentPhotoPublicId } = await import("./incident-photo-storage")
    expect(buildIncidentPhotoPublicId(42, "abc-123")).toBe("safety-incidents/42/abc-123")
  })
})

describe("fetchIncidentPhoto", () => {
  it("requests an authenticated, signed, width-capped image", async () => {
    const { cloudinary } = await import("@/lib/cloudinary")
    const spy = vi.spyOn(cloudinary, "url")
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 500 }))

    const { fetchIncidentPhoto } = await import("./incident-photo-storage")
    await fetchIncidentPhoto("safety-incidents/42/abc-123", "image/jpeg").catch(() => undefined)

    const options = spy.mock.calls[0]?.[1] as Record<string, unknown>
    expect(options.type).toBe("authenticated")
    expect(options.sign_url).toBe(true)
    expect(options.resource_type).toBe("image")
    expect(options.width).toBe(800)

    spy.mockRestore()
    fetchSpy.mockRestore()
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

```bash
npm run test -w api -- incident-photo-storage
```
Expected: FAIL — cannot resolve `./incident-photo-storage`.

- [ ] **Step 4: Write the wrapper**

Create `apps/api/lib/incident-photo-storage.ts`. It is deliberately thin — all Cloudinary behaviour lives in `private-media.ts`; this file only owns the SOS naming convention and the image-only resource type.

```ts
import {
  destroyPrivateAsset,
  fetchPrivateAsset,
  uploadPrivateAsset,
  type UploadedAsset,
} from "@/lib/private-media"

export function buildIncidentPhotoPublicId(incidentId: number, uploadId: string): string {
  return `safety-incidents/${incidentId}/${uploadId}`
}

export function uploadIncidentPhoto(file: File, publicId: string): Promise<UploadedAsset> {
  return uploadPrivateAsset(file, publicId, "image")
}

export function destroyIncidentPhoto(publicId: string): Promise<void> {
  return destroyPrivateAsset(publicId, "image")
}

/** 800px is plenty: an ops reviewer looks at a damaged screen on a laptop,
 *  and a full-resolution phone photo is several MB per view. */
export function fetchIncidentPhoto(publicId: string, contentType: string): Promise<Response> {
  return fetchPrivateAsset(publicId, { resourceType: "image", contentType, maxWidth: 800 })
}
```

- [ ] **Step 5: Run the test and watch it pass**

```bash
npm run test -w api -- incident-photo-storage
```
Expected: PASS.

- [ ] **Step 6: Create the upload route**

Create `apps/api/app/v1/driver/sos/[id]/photos/route.ts`, modelled on `apps/api/app/v1/driver/documents/route.ts`:

1. `requireDriverAccess()` → `parseId` → `loadOwnedIncident` → 404 if null.
2. 409 if `isTerminalStatus(incident.status)`.
3. `const form = await req.formData()`; `const file = form.get("file")`; 400 if not `instanceof File`.
4. `const count = await prisma.safetyIncidentPhoto.count({ where: { incident_id: id } })`.
5. `const check = canAcceptPhoto(count, file)`; if `!check.ok` return `jsonError(check.reason, 400)`.
6. `const publicId = buildIncidentPhotoPublicId(id, crypto.randomUUID())`; `const uploaded = await uploadIncidentPhoto(file, publicId)`.
7. Create the row with `cloudinary_public_id: uploaded.publicId`, `content_type: uploaded.contentType`, `size_bytes: uploaded.sizeBytes`.
8. Return `NextResponse.json(toIncidentPhoto(created), { status: 201 })`.

Unlike driver documents there is no replace-existing branch: incidents accumulate up to four photos rather than holding one per type.

- [ ] **Step 7: Verify a real round trip**

```bash
curl -s -X POST localhost:3003/v1/driver/sos/1/photos \
  -H "Authorization: Bearer $TOKEN" -F "file=@some-photo.jpg"
```
Expected: 201 with an id and no `cloudinary_public_id` in the response body. Upload four more; the fifth must return 400 with the photo-cap message.

- [ ] **Step 8: Commit**

```bash
git add apps/api/lib/incident-photo-storage.ts apps/api/lib/incident-photo-storage.test.ts "apps/api/app/v1/driver/sos/[id]/photos"
git commit -m "feat(api): add SOS incident photo upload"
```

---

## Task 7: Ops API — list, detail, review, messages, photo file

**Files:**
- Create: `apps/api/app/v1/safety-incidents/route.ts`
- Create: `apps/api/app/v1/safety-incidents/[id]/route.ts`
- Create: `apps/api/app/v1/safety-incidents/[id]/messages/route.ts`
- Create: `apps/api/app/v1/safety-incidents/[id]/photos/[photoId]/file/route.ts`
- Modify: `apps/api/lib/queries/entities.ts`

**Interfaces:**
- Consumes: Tasks 2, 3, 5, 6.
- Produces: `listSafetyIncidents(params)` in `entities.ts`, and the five ops endpoints Tasks 10 and 11 consume.

- [ ] **Step 1: Add `listSafetyIncidents` to `entities.ts`**

Append after `listSupportCases` (line ~267), mirroring it exactly:

```ts
export async function listSafetyIncidents(
  params: Partial<PaginationParams> & {
    status?: string
    type?: string
    severity?: string
  } = {},
): Promise<
  SerializedPaginatedResult<Awaited<ReturnType<typeof prisma.safetyIncident.findMany>>[number]>
> {
  const parsed = parsePagination({ ...params, sortBy: params.sortBy ?? "created_at" })
  const where: Prisma.SafetyIncidentWhereInput = {}

  if (parsed.search) {
    where.OR = [
      { driver_name: { contains: parsed.search, mode: "insensitive" } },
      { driver_phone: { contains: parsed.search, mode: "insensitive" } },
      { description: { contains: parsed.search, mode: "insensitive" } },
    ]
  }
  if (params.status) where.status = params.status
  if (params.type) where.type = params.type
  if (params.severity) where.severity = params.severity

  const sortField = ["created_at", "updated_at", "status", "severity"].includes(parsed.sortBy ?? "")
    ? parsed.sortBy!
    : "created_at"

  const [items, total] = await Promise.all([
    prisma.safetyIncident.findMany({
      where,
      orderBy: { [sortField]: parsed.sortDir },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      include: { _count: { select: { photos: true } } },
    }),
    prisma.safetyIncident.count({ where }),
  ])

  return toPaginatedResult(items, total, parsed.page, parsed.pageSize)
}
```

- [ ] **Step 2: Create the ops list route**

Create `apps/api/app/v1/safety-incidents/route.ts`, copying the structure of `apps/api/app/v1/support/route.ts` verbatim but with `requireOpsPermissionAccess("safety")`, `listSafetyIncidents`, and `status` / `type` / `severity` search params. Map rows through `toOpsIncident(row, row._count.photos)`.

- [ ] **Step 3: Create the ops detail + review route**

Create `apps/api/app/v1/safety-incidents/[id]/route.ts`.

`GET`: `requireOpsPermissionAccess("safety")` → `parseId` → `findUnique` with `include: { photos: true }` → 404 → load all updates (**including internal notes** — this is the ops view) → return `{ ...toOpsIncident(incident, incident.photos.length), photos: incident.photos.map(toIncidentPhoto), updates: updates.map(toIncidentUpdate) }`.

`PATCH`: same preamble, `parseJsonBody(req, safetyIncidentOpsUpdateSchema)`, then build the update explicitly rather than spreading the parsed body — the stamped fields are the whole value of this route:

```ts
const now = new Date()
const data: Prisma.SafetyIncidentUpdateInput = {}
const systemLines: string[] = []

if (parsed.data.severity && parsed.data.severity !== existing.severity) {
  data.severity = parsed.data.severity
  systemLines.push(`Severity changed to ${parsed.data.severity}.`)
}

if (parsed.data.status && parsed.data.status !== existing.status) {
  if (parsed.data.status === "cancelled") {
    return jsonError("Only the driver can cancel a report — resolve it instead", 400)
  }
  if (parsed.data.status === "resolved" && !parsed.data.resolution?.trim()) {
    return jsonError("A resolution note is required to resolve an incident", 400)
  }

  data.status = parsed.data.status
  systemLines.push(`Status changed to ${formatLabel(parsed.data.status)}.`)

  // First acknowledgement only — re-acknowledging must not restart the clock
  // that the whole SLA display is measured against.
  if (parsed.data.status !== "new" && !existing.acknowledged_at) {
    data.acknowledged_at = now
    data.acknowledged_by_email = access.email
  }
  if (parsed.data.status === "resolved") {
    data.resolved_at = now
    data.resolved_by_email = access.email
    data.resolution = parsed.data.resolution!.trim()
  }
}
```

After the `prisma.safetyIncident.update`, write one `appendSystemUpdate(id, systemLines.join(" "))` if `systemLines` is non-empty, then notify the driver — fire-and-forget, in a `try/catch` that only logs:

```ts
if (data.acknowledged_at) {
  await prisma.driverNotification.create({
    data: {
      clerk_user_id: existing.driver_clerk_user_id,
      type: "sos_acknowledged",
      title: "We've seen your report",
      body: "Someone from the Admobi team is on it and will be in touch.",
    },
  })
}
if (data.status === "resolved") {
  await prisma.driverNotification.create({
    data: {
      clerk_user_id: existing.driver_clerk_user_id,
      type: "sos_resolved",
      title: "Your report was resolved",
      body: parsed.data.resolution!.trim().slice(0, 240),
    },
  })
}
```

Finish with `auditFromOpsUser(access, { action: "update", entity_type: "safety_incident", entity_id: id, summary: ..., metadata: parsed.data as Record<string, unknown> })` and return the DTO.

- [ ] **Step 4: Create the ops messages route**

`requireOpsPermissionAccess("safety")` → `parseId` → 404 if missing → `parseJsonBody(req, safetyIncidentMessageCreateSchema)` → create with `author_type: "ops"`, `author_email: access.email`, `author_clerk_id: access.userId`, `internal_note: parsed.data.internal_note ?? false`. Ops is the only side allowed to set that flag. Return `toIncidentUpdate(created)`.

- [ ] **Step 5: Create the photo file route**

Create `apps/api/app/v1/safety-incidents/[id]/photos/[photoId]/file/route.ts`, modelled on `apps/api/app/v1/driver-applications/[id]/documents/[docId]/file/route.ts` — read that file and match how it streams bytes and sets headers.

Load the photo with `where: { id: photoId, incident_id: id }` so a photo id from another incident cannot be read through this path. Then:

```ts
const upstream = await fetchIncidentPhoto(photo.cloudinary_public_id, photo.content_type)
return new Response(upstream.body, {
  headers: {
    "Content-Type": photo.content_type,
    "Cache-Control": "private, max-age=300",
  },
})
```

- [ ] **Step 6: Verify the permission gate and the ack clock**

With an ops token lacking `safety`:
```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:3003/v1/safety-incidents -H "Authorization: Bearer $OPS_TOKEN"
```
Expected: `403`.

With a permitted token, `PATCH` an incident to `acknowledged`, confirm `acknowledged_at` is set, then `PATCH` it to `in_progress` and confirm `acknowledged_at` is **unchanged**. Then `PATCH` to `resolved` with no `resolution` and confirm `400`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/lib/queries/entities.ts apps/api/app/v1/safety-incidents
git commit -m "feat(api): add ops safety incident list, review, messages, and photo routes"
```

---

## Task 8: Ops API client namespace

**Files:**
- Modify: `packages/ops-api-client/src/index.ts`

**Interfaces:**
- Consumes: Task 2 DTOs, Task 7 endpoints.
- Produces: `client.safety.list(params)`, `.get(id)`, `.update(id, body)`, `.reply(id, body)`, `.photoFileUrl(incidentId, photoId)` — used by Tasks 10 and 11.

- [ ] **Step 1: Add the interface members**

In the client type, directly after the `support` block (line ~194):

```ts
safety: {
  list: (params?: SafetyListQueryParams) => Promise<PaginatedResponse<SafetyIncidentDto>>
  get: (id: number) => Promise<SafetyIncidentDetailDto>
  update: (id: number, body: SafetyIncidentOpsUpdateInput) => Promise<SafetyIncidentDto>
  reply: (id: number, body: SafetyIncidentMessageCreateInput) => Promise<SafetyIncidentUpdateDto>
  /** No JSON endpoint — the file route streams raw bytes, so the caller
   *  fetches it directly with the same bearer token. */
  photoFileUrl: (incidentId: number, photoId: number) => string
}
```

- [ ] **Step 2: Add the implementation**

After the `support` implementation block (line ~519), mirroring it:

```ts
safety: {
  list: (params = {}) => {
    const query = buildListQueryParams({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortBy: params.sortBy,
      sortDir: params.sortDir,
      status: params.status,
      type: params.type,
      severity: params.severity,
    })
    const qs = query.toString()
    return request<PaginatedResponse<SafetyIncidentDto>>(
      `${apiPrefix}/safety-incidents${qs ? `?${qs}` : ""}`,
    )
  },
  get: (id) => request<SafetyIncidentDetailDto>(`${apiPrefix}/safety-incidents/${id}`),
  update: (id, body) =>
    request<SafetyIncidentDto>(`${apiPrefix}/safety-incidents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  reply: (id, body) =>
    request<SafetyIncidentUpdateDto>(`${apiPrefix}/safety-incidents/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  photoFileUrl: (incidentId, photoId) =>
    `${apiPrefix}/safety-incidents/${incidentId}/photos/${photoId}/file`,
},
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/ops-api-client/src/index.ts
git commit -m "feat(ops-api-client): add safety incident namespace"
```

---

## Task 9: driver-mobile SOS

**Files:**
- Create: `apps/driver-mobile/lib/sos.ts`
- Create: `apps/driver-mobile/lib/use-incident-ping.ts`
- Create: `apps/driver-mobile/app/sos/_layout.tsx`
- Create: `apps/driver-mobile/app/sos/index.tsx`
- Create: `apps/driver-mobile/app/sos/[id].tsx`
- Create: `apps/driver-mobile/components/sos/sos-button.tsx`
- Modify: `apps/driver-mobile/app/(tabs)/index.tsx`
- Modify: `apps/driver-mobile/components/app/nav-drawer.tsx`

**Interfaces:**
- Consumes: Task 5 and Task 6 driver endpoints.
- Produces: `createIncident`, `listMyIncidents`, `getIncident`, `replyToIncident`, `uploadIncidentPhoto`, `cancelIncident`, `pingIncidentLocation` from `lib/sos.ts`; `useIncidentPing(incidentId, status)` from `lib/use-incident-ping.ts`.

- [ ] **Step 1: Write the API client**

Create `apps/driver-mobile/lib/sos.ts`. Unlike `lib/support.ts`, there is **no AsyncStorage token juggling** — every call is authenticated with the driver's Clerk token, so the module takes the token as an argument. Follow the `getJson`/`postJson` helper shape already in `lib/support.ts`, with `EXPO_PUBLIC_API_URL` and the same `http://localhost:3003` fallback.

Export, all taking `token: string` as their first argument:

```ts
createIncident(token, input: {
  type: string; description?: string
  reported_lat?: number; reported_lng?: number; reported_accuracy_m?: number
}): Promise<SafetyIncident>          // POSTs { ...input, channel: "driver-mobile" }
listMyIncidents(token): Promise<SafetyIncident[]>
getIncident(token, id): Promise<SafetyIncidentDetail>
replyToIncident(token, id, body: string): Promise<SafetyIncidentUpdate>
uploadIncidentPhoto(token, id, asset: { uri: string; mimeType: string; fileName: string }): Promise<SafetyIncidentPhoto>
cancelIncident(token, id): Promise<SafetyIncident>
pingIncidentLocation(token, id, lat: number, lng: number): Promise<void>
```

`uploadIncidentPhoto` builds a `FormData` with `{ uri, name, type }` — the React Native file shape, not a web `File` — and must **not** set a `Content-Type` header, so the runtime fills in the multipart boundary.

- [ ] **Step 2: Write the location capture helper**

In the same file:

```ts
import * as Location from "expo-location"

/**
 * Never throws and never blocks longer than 8s. A driver in a tunnel, with
 * location off, or who denies the prompt still gets their report filed —
 * losing the incident because we could not get a fix would be the worst
 * possible failure in this flow.
 */
export async function captureLocation(): Promise<{
  reported_lat?: number
  reported_lng?: number
  reported_accuracy_m?: number
}> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") return {}

    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
    ])
    if (!position) return {}

    return {
      reported_lat: position.coords.latitude,
      reported_lng: position.coords.longitude,
      reported_accuracy_m: position.coords.accuracy
        ? Math.round(position.coords.accuracy)
        : undefined,
    }
  } catch {
    return {}
  }
}
```

- [ ] **Step 3: Write the ping hook**

Create `apps/driver-mobile/lib/use-incident-ping.ts`:

```ts
import { useEffect, useRef } from "react"
import { AppState } from "react-native"
import * as Location from "expo-location"

import { pingIncidentLocation } from "@/lib/sos"

const PING_INTERVAL_MS = 120_000
const TERMINAL = new Set(["resolved", "cancelled"])

/**
 * Foreground-only, 120s, current-position-only. No expo-task-manager and no
 * background permission: the extra battery cost and the store-review burden of
 * always-on location buy nothing an ops responder actually uses, and Neon
 * compute is this platform's main cost driver. The server independently
 * refuses pings on terminal or >6h-old incidents, so a stuck client cannot
 * ping forever even if this hook misbehaves.
 */
export function useIncidentPing(
  incidentId: number | null,
  status: string | null,
  getToken: () => Promise<string | null>,
) {
  const busy = useRef(false)

  useEffect(() => {
    if (!incidentId || !status || TERMINAL.has(status)) return

    let cancelled = false

    const tick = async () => {
      if (cancelled || busy.current) return
      if (AppState.currentState !== "active") return
      busy.current = true
      try {
        const token = await getToken()
        if (!token) return
        const { status: perm } = await Location.getForegroundPermissionsAsync()
        if (perm !== "granted") return
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        await pingIncidentLocation(token, incidentId, position.coords.latitude, position.coords.longitude)
      } catch {
        // A dropped ping is not worth surfacing — the next one is 2 minutes away.
      } finally {
        busy.current = false
      }
    }

    void tick()
    const timer = setInterval(tick, PING_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [incidentId, status, getToken])
}
```

- [ ] **Step 4: Build the SOS entry button**

Create `apps/driver-mobile/components/sos/sos-button.tsx` — a red pill/button using `useThemedStyles` and the theme tokens from `@/lib/theme`, matching how `components/ui/stat-card.tsx` consumes them. It routes to `/sos` and renders nothing when the `sos` flag is off.

Wire it into:
- `apps/driver-mobile/app/(tabs)/index.tsx` — near the top of the dashboard.
- `apps/driver-mobile/components/app/nav-drawer.tsx` — a drawer entry, following the existing item shape in that file.

`apps/driver-mobile/lib/flags.ts` needs **no change** — `usePlatformFlags()` returns a `Record<string, boolean>` fetched from `/v1/public/config`, so read `usePlatformFlags().sos` directly. Adding `"sos"` to `PLATFORM_FLAG_KEYS` in Task 2 is what makes the row exist and appear in ops Settings.

Deliberately **not** a global floating button on every screen: pocket-taps would train ops to ignore the queue.

- [ ] **Step 5: Build the submit screen**

Create `apps/driver-mobile/app/sos/_layout.tsx` (a `Stack` with `presentation: "modal"`, matching `app/profile-setup/_layout.tsx`) and `apps/driver-mobile/app/sos/index.tsx`, in this order top to bottom:

1. **Emergency services block, first.** A button calling `Linking.openURL("tel:999")`, labelled "Call 999 — police, ambulance, fire", with the line *"AdmobiHQ is not an emergency service."* This is above our own form because a driver in a real accident should not be reading it.
2. A 7-tile grid of incident types, icons from `@/components/icons`, labels via `formatLabel`.
3. An optional description `TextInput`, multiline.
4. A photo row — `expo-image-picker` `launchImageLibraryAsync` and `launchCameraAsync`, up to 4, thumbnails with a remove control. Photos are held in local state here, **not uploaded yet**.
5. A **Send SOS** button. On press: `captureLocation()`, then `createIncident(...)`, then `router.replace(\`/sos/${incident.id}\`)`, passing the pending photos through so the tracking screen uploads them.

**No severity picker.** Severity comes from the server's `severityForType`.

- [ ] **Step 6: Build the tracking screen**

Create `apps/driver-mobile/app/sos/[id].tsx`:
- `useQuery` on `getIncident`, `refetchInterval: 20_000` while the status is non-terminal.
- A status banner: "Waiting for a responder" / "Ops acknowledged {relative time}" / "Resolved".
- Photo thumbnails plus an add-photo control.
- The update thread (`author_type` drives alignment) and a reply box.
- A **Cancel incident** button behind the existing `components/ui/confirm-dialog.tsx`.
- `useIncidentPing(id, incident?.status ?? null, getToken)`.
- On mount, upload any photos handed over from the submit screen, one call each, showing per-photo progress. **Ops is alerted the moment the driver taps Send** — waiting on four uploads before alerting anyone would be the wrong trade, and a failed upload must never lose the incident.

- [ ] **Step 7: Run it on a device**

```bash
npx expo start --clear
```
Verify: SOS button appears when the flag is on and is gone when off; denying the location prompt still files the report; the incident appears in `GET /v1/driver/sos`; photos land; backgrounding the app stops the pings and foregrounding resumes them.

- [ ] **Step 8: Commit**

```bash
git add apps/driver-mobile/lib/sos.ts apps/driver-mobile/lib/use-incident-ping.ts apps/driver-mobile/app/sos apps/driver-mobile/components/sos apps/driver-mobile/app/\(tabs\)/index.tsx apps/driver-mobile/components/app/nav-drawer.tsx apps/driver-mobile/lib/flags.ts
git commit -m "feat(driver-mobile): add SOS submit and tracking screens"
```

---

## Task 10: ops web SOS queue

**Files:**
- Create: `apps/ops/app/(dashboard)/sos/page.tsx`
- Create: `apps/ops/app/(dashboard)/sos/sos-view.tsx`
- Create: `apps/ops/app/(dashboard)/sos/[id]/page.tsx`
- Create: `apps/ops/app/(dashboard)/sos/[id]/sos-detail-view.tsx`
- Create: `apps/ops/components/incident-type-icon.tsx`
- Modify: `apps/ops/components/ops-shell.tsx`
- Modify: `apps/ops/lib/use-ops-notifications.ts`
- Modify: `apps/ops/lib/tour-chapters.ts`

**Interfaces:**
- Consumes: `client.safety.*` from Task 8.
- Produces: the ops review UI. Nothing later depends on it.

- [ ] **Step 1: Add the nav entry**

In `apps/ops/components/ops-shell.tsx`, immediately **before** the Support entry at line 101:

```tsx
{ href: "/sos", label: "SOS", icon: Siren, permission: "safety" },
```

Import `Siren` from `lucide-react` alongside the other icons. Above Support because an emergency queue that sorts below the helpdesk is a queue nobody checks first.

- [ ] **Step 2: Build the list view**

Create `apps/ops/app/(dashboard)/sos/sos-view.tsx`, copying the structure of `apps/ops/app/(dashboard)/support/support-view.tsx` (`PageHero`, `DataTable`, `DataTableSortHeader`, `TablePagination`, `ApiErrorBanner`, `useOpsClient`, the `ALL = "__all__"` select idiom).

Columns: **Age** (ack clock), **Driver** (name + `tel:` link), **Type** (icon + label), **Severity** (badge), **Status** (badge), **Location** (pin linking to `https://www.google.com/maps?q={lat},{lng}`, or "unavailable"), **Photos** (count).

The ack clock:

```tsx
function AckClock({ incident }: { incident: SafetyIncidentDto }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(t)
  }, [])

  if (incident.acknowledged_at) {
    return <span className="text-muted-foreground">Acked {formatRelativeTime(incident.acknowledged_at)}</span>
  }
  const seconds = Math.floor((now - new Date(incident.created_at).getTime()) / 1000)
  const late = seconds > ACK_TARGET_SECONDS
  return (
    <span className={cn("font-medium tabular-nums", late ? "text-destructive" : "text-amber-600")}>
      Unacked {Math.floor(seconds / 60)}m {seconds % 60}s
    </span>
  )
}
```

Polling and ordering:

```tsx
const hasLive = items.some((i) => i.status === "new" || i.status === "acknowledged")

const query = useQuery({
  queryKey: ["safety", "list", status, type, severity, page, sorting],
  queryFn: () => client.safety.list({ ... }),
  placeholderData: keepPreviousData,
  refetchInterval: hasLive ? 15_000 : 60_000,
})

// Unacked incidents float to the top regardless of the active sort — the
// whole point of this screen is that nothing new goes unseen.
// SAFETY_TERMINAL_STATUSES comes from @workspace/ops-contracts (Task 2);
// apps/api's isTerminalStatus is not importable from an app.
const TERMINAL = new Set<string>(SAFETY_TERMINAL_STATUSES)

const rows = useMemo(() => {
  const raw = query.data?.items ?? []
  return [...raw].sort((a, b) => {
    const aNew = !a.acknowledged_at && !TERMINAL.has(a.status)
    const bNew = !b.acknowledged_at && !TERMINAL.has(b.status)
    if (aNew !== bNew) return aNew ? -1 : 1
    return 0
  })
}, [query.data])
```

Above the table, a red banner when `unackedCount > 0`: `"{n} unacknowledged — respond now"`.

Create `apps/ops/components/incident-type-icon.tsx` mapping the seven types to `lucide-react` icons, modelled on the existing `apps/ops/components/support-category-icon.tsx`.

`page.tsx` is a two-line server component rendering `<SosView />`, matching `support/page.tsx`.

- [ ] **Step 3: Build the detail view**

Create `apps/ops/app/(dashboard)/sos/[id]/sos-detail-view.tsx`:
- **Driver card** — name, `tel:` call link, `https://wa.me/{phone}` WhatsApp link.
- **Location** — the coordinates, accuracy, "last seen {relative}", and a Google Maps link. Embed the ops MapLibre map component if it drops in cleanly; if it does not, ship the link and move on. The map is not on the critical path for responding, and a half-working embed is worse than a link that always works.
- **Photo gallery** — `<img src={client.safety.photoFileUrl(id, photo.id)} />` fetched with the bearer token, matching how `driver-application-detail-view.tsx` renders document previews. Read that file and copy its approach.
- **Status controls** — Acknowledge / In progress / Resolve. Resolve opens a dialog requiring a note; the API rejects an empty one with 400, so validate client-side too rather than surfacing that as an error.
- **Update thread** — all updates including internal notes, visually distinguished, plus a reply box with an "internal note" checkbox.

- [ ] **Step 4: Add the notifications source**

In `apps/ops/lib/use-ops-notifications.ts`, add a query to the `useQueries` array:

```ts
{
  queryKey: ["ops-notifications", "safety"],
  enabled: canSee("safety"),
  queryFn: () => client.safety.list({ pageSize: SOURCE_LIMIT }),
  retry: false,
  refetchOnWindowFocus: false,
},
```

Destructure it as `safetyQuery` (first in the array, so SOS sorts first), add it to the dependency array at the bottom of the `useMemo` and to the returned object, and build items:

```ts
for (const i of safetyQuery.data?.items ?? []) {
  if (i.status === "resolved" || i.status === "cancelled") continue
  items.push({
    id: `safety-incident:${i.id}`,
    title: `SOS — ${formatLabel(i.type)}`,
    body: joinMeta(i.driver_name, i.driver_phone, i.acknowledged_at ? "acknowledged" : "UNACKNOWLEDGED"),
    category: "SOS",
    tone: "warning",
    href: `/sos/${i.id}`,
    createdAt: i.created_at,
  })
}
```

- [ ] **Step 5: Add the tour chapter**

In `apps/ops/lib/tour-chapters.ts`, before the `support` chapter:

```ts
{
  key: "sos",
  title: "Respond to driver SOS",
  description: "Drivers reporting an accident, damage, or a safety issue land here — acknowledge fast, then coordinate.",
  selector: '[data-tour-id="tour-nav-sos"]',
},
```

- [ ] **Step 6: Verify in the browser**

```bash
npm run dev -w ops
```
File an incident from the driver API, confirm it appears within 15s without a manual refresh, the clock turns red past 5 minutes, acknowledging stops the clock, resolving without a note is refused, and a member role without `safety` sees no SOS nav entry.

- [ ] **Step 7: Commit**

```bash
git add "apps/ops/app/(dashboard)/sos" apps/ops/components/incident-type-icon.tsx apps/ops/components/ops-shell.tsx apps/ops/lib/use-ops-notifications.ts apps/ops/lib/tour-chapters.ts
git commit -m "feat(ops): add SOS queue and incident detail view"
```

---

## Task 11: ops-mobile SOS

**Files:**
- Create: `apps/ops-mobile/app/(ops)/sos/_layout.tsx`
- Create: `apps/ops-mobile/app/(ops)/sos/index.tsx`
- Create: `apps/ops-mobile/app/(ops)/sos/[id].tsx`
- Create: `apps/ops-mobile/components/sos/incident-type-icon.tsx`
- Modify: `apps/ops-mobile/components/app/nav-drawer.tsx`
- Modify: `apps/ops-mobile/lib/push-notifications.ts`
- Modify: `apps/ops-mobile/lib/query-keys.ts`

**Interfaces:**
- Consumes: `client.safety.*` from Task 8.
- Produces: the ops-mobile review UI.

- [ ] **Step 1: Register the Android notification channel**

In `apps/ops-mobile/lib/push-notifications.ts`, alongside the existing `default` channel registration:

```ts
await Notifications.setNotificationChannelAsync("safety", {
  name: "SOS alerts",
  importance: Notifications.AndroidImportance.MAX,
  sound: "default",
  vibrationPattern: [0, 250, 250, 250],
  lightColor: "#dc2626",
  bypassDnd: true,
})
```

Without a registered high-importance channel Android silently downgrades the alert and the sound never plays — the push looks fine in logs and is invisible on the device. The `channelId: "safety"` sent from Task 4 is what selects it.

- [ ] **Step 2: Add the nav entry**

In `apps/ops-mobile/components/app/nav-drawer.tsx`, before the Support entry (line 72):

```ts
{
  key: "sos",
  label: "SOS",
  description: "Driver safety incidents needing a response",
  icon: Siren,
  href: "/(ops)/sos",
  permission: "safety",
},
```

Import `Siren` in `apps/ops-mobile/components/icons.tsx` following that file's existing re-export style.

- [ ] **Step 3: Build the list screen**

Create `apps/ops-mobile/app/(ops)/sos/_layout.tsx` (copy `(ops)/support/_layout.tsx`) and `index.tsx`, copying `apps/ops-mobile/app/(ops)/support/index.tsx` and swapping: `usePageHeader("SOS")`, `client.safety.list`, `SAFETY_INCIDENT_STATUSES` for the `FilterChips`, and a status variant map:

```ts
const STATUS_VARIANT: Record<string, "muted" | "attention" | "progress" | "success"> = {
  new: "attention",
  acknowledged: "progress",
  in_progress: "progress",
  resolved: "success",
  cancelled: "muted",
}
```

Keep the same `useInfiniteQuery` + `getNextPageParam` + `SEARCH_DEBOUNCE_MS` shape. Each `ListRow` shows type + driver name as the title, and "Unacked {n}m" or "Acked" as the subtitle. Add `refetchInterval: 15_000` to the query.

- [ ] **Step 4: Build the detail screen**

Create `apps/ops-mobile/app/(ops)/sos/[id].tsx`, following `(ops)/driver-applications/[id].tsx` for layout and the review-action pattern. Include: driver name with `Linking.openURL("tel:...")`, a "Open in Maps" button (`https://www.google.com/maps?q={lat},{lng}`), photo thumbnails fetched with the bearer token, Acknowledge / In progress / Resolve actions (Resolve prompts for a note via the existing `components/ui/confirm-dialog.tsx` pattern or a `TextInput` sheet), and the update thread.

- [ ] **Step 5: Add query keys**

Add `safety` entries to `apps/ops-mobile/lib/query-keys.ts` following the existing shape in that file.

- [ ] **Step 6: Verify on a device**

```bash
npx expo start --clear
```

Per the project's EAS note, if you build rather than run locally, pass `--environment preview` to `eas build`/`eas update` or it bakes the builder's LAN IP.

File an SOS from driver-mobile and confirm: the push arrives with the loud channel, tapping it deep-links to `/(ops)/sos/<id>`, and acknowledging from mobile shows up in ops web.

- [ ] **Step 7: Commit**

```bash
git add "apps/ops-mobile/app/(ops)/sos" apps/ops-mobile/components/sos apps/ops-mobile/components/app/nav-drawer.tsx apps/ops-mobile/components/icons.tsx apps/ops-mobile/lib/push-notifications.ts apps/ops-mobile/lib/query-keys.ts
git commit -m "feat(ops-mobile): add SOS list, detail, and alert channel"
```

---

## Task 12: driver-web SOS

**Files:**
- Create: `apps/driver-web/lib/sos-client.ts`
- Create: `apps/driver-web/app/(shell)/sos/page.tsx`
- Create: `apps/driver-web/app/(shell)/sos/sos-client.tsx`
- Create: `apps/driver-web/app/(shell)/sos/[id]/page.tsx`
- Create: `apps/driver-web/app/(shell)/sos/[id]/sos-tracking-client.tsx`
- Create: `apps/driver-web/components/shell/sos-button.tsx`
- Modify: `apps/driver-web/components/shell/app-shell.tsx`

**Interfaces:**
- Consumes: Task 5 and Task 6 driver endpoints.
- Produces: the driver-web SOS UI.

- [ ] **Step 1: Write the API client**

Create `apps/driver-web/lib/sos-client.ts` mirroring `apps/driver-web/lib/support-client.ts`'s structure but authenticated-only — no `getStoredIdentity`, no localStorage tokens. Same exported function set as Task 9's `lib/sos.ts`, taking the Clerk token from `useDriverSession`.

Location capture uses the browser API with the same never-block contract:

```ts
export function captureLocation(): Promise<{
  reported_lat?: number
  reported_lng?: number
  reported_accuracy_m?: number
}> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve({})
    const done = (value: Parameters<typeof resolve>[0]) => resolve(value)
    const timer = setTimeout(() => done({}), 8_000)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        done({
          reported_lat: pos.coords.latitude,
          reported_lng: pos.coords.longitude,
          reported_accuracy_m: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : undefined,
        })
      },
      () => {
        clearTimeout(timer)
        done({})
      },
      { enableHighAccuracy: false, timeout: 8_000 },
    )
  })
}
```

- [ ] **Step 2: Add the header button**

Create `apps/driver-web/components/shell/sos-button.tsx` — a red `Button` linking to `/sos`, rendered only when the `sos` platform flag is on. Wire it into `apps/driver-web/components/shell/app-shell.tsx`, next to the existing `notification-bell.tsx` in the header. In the header, not under `/settings`: a driver who needs it should not be navigating a settings tree.

- [ ] **Step 3: Build the submit page**

Create `apps/driver-web/app/(shell)/sos/page.tsx` (a thin server component, matching `settings/support/page.tsx`) and `sos-client.tsx` with the same section order as driver-mobile: the `tel:999` block and disclaimer first, then the type grid, description, photos, and Send SOS.

Photos use `<input type="file" accept="image/*" capture="environment" multiple />` — native camera capture on mobile browsers, no dropzone dependency. Cap the selection at 4 client-side and show thumbnails via `URL.createObjectURL`.

- [ ] **Step 4: Build the tracking page**

Create `apps/driver-web/app/(shell)/sos/[id]/page.tsx` and `sos-tracking-client.tsx`: status banner, thread with a reply box, photo thumbnails, add-photo, Cancel incident. Upload the pending photos on mount, one call each, exactly as in Task 9.

The ping loop is a `useEffect` with `setInterval(…, 120_000)` guarded on `document.visibilityState === "visible"` and a non-terminal status — the web counterpart of `useIncidentPing`.

- [ ] **Step 5: Verify in the browser**

```bash
npm run dev -w driver-web
```
Verify: the header button respects the flag; denying the geolocation prompt still files the report; the incident appears in ops within 15s; the reply thread round-trips; cancelling closes it.

- [ ] **Step 6: Commit**

```bash
git add apps/driver-web/lib/sos-client.ts "apps/driver-web/app/(shell)/sos" apps/driver-web/components/shell
git commit -m "feat(driver-web): add SOS submit and tracking pages"
```

---

## Task 13: End-to-end test and documentation

**Files:**
- Create: `e2e/sos.spec.ts`
- Create: `docs/shared/SAFETY-SOS.md`
- Modify: `docs/driver/DRIVER-APP.md`
- Modify: `docs/ops/OPS-ADMIN.md`
- Modify: `docs/ops/MOBILE-OPS.md`
- Modify: `docs/api/API.md`

**Interfaces:**
- Consumes: everything above.
- Produces: the shipped feature's documentation, per `CLAUDE.md`.

- [ ] **Step 1: Write the e2e test**

Create `e2e/sos.spec.ts` following the setup and auth helpers of the existing specs in `e2e/` — read one first and match how it signs in. The flow: driver-web files an SOS → ops-web `/sos` shows it unacknowledged → ops acknowledges → driver-web tracking page shows the acknowledgement.

- [ ] **Step 2: Run it**

```bash
npm run test:e2e -- sos
```
Expected: PASS. If the ops list has not picked the row up yet, wait on the row rather than adding a fixed sleep — the list polls every 15s.

- [ ] **Step 3: Write `docs/shared/SAFETY-SOS.md`**

Cover: what SOS is and how it differs from support cases; the five-state lifecycle and who may drive each transition; the four surfaces and their entry points; the location model and why re-pings are foreground-only, 120s, and 6h-capped; the photo storage model; the alerting matrix; the `safety` permission and the `sos` platform flag; and how to run `safety-incidents-additive.sql` in production.

- [ ] **Step 4: Update the four existing docs**

- `docs/driver/DRIVER-APP.md` — add SOS to the route table (line ~28) and the mobile tab/off-tab list (line ~51).
- `docs/ops/OPS-ADMIN.md` — add **SOS** to the nav list (line 22).
- `docs/ops/MOBILE-OPS.md` — add an SOS section next to the existing support material.
- `docs/api/API.md` — document the six driver endpoints and five ops endpoints, following that file's existing per-route format.

- [ ] **Step 5: Rebuild the knowledge graph**

Per `CLAUDE.md`:
```bash
graphify update .
```

- [ ] **Step 6: Commit**

```bash
git add e2e/sos.spec.ts docs/shared/SAFETY-SOS.md docs/driver/DRIVER-APP.md docs/ops/OPS-ADMIN.md docs/ops/MOBILE-OPS.md docs/api/API.md
git commit -m "docs: document the driver SOS flow across all four surfaces"
```

---

## Task 14: Merge

**REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch`.

- [ ] **Step 1: Full verification**

```bash
npm run typecheck && npm run test && npm run lint
```
Expected: all clean. Do not proceed on a red result — the whole point of the gate is that it is not advisory.

- [ ] **Step 2: Rebase onto current `master`**

```bash
git fetch origin && git rebase origin/master
```

Expect conflicts in the files listed in the concurrency map if campaigns merged first. Every one of them is an append to a list, an object, or the end of a file: **resolution is keep both sides**, then re-run Step 1.

- [ ] **Step 3: Confirm the production SQL is still pending**

`safety-incidents-additive.sql` has not been run against production. Flag this to the user explicitly — it is a manual step (`npm run db:safety-incidents:prod -w web`, or the Neon SQL editor) that must happen **before** the API deploys, or every SOS route 500s on a missing table.

- [ ] **Step 4: Note the deploy order**

Per `docs/shared/FEATURE-INVENTORY.md`, `NEXT_PUBLIC_API_URL` is inlined at build time: deploy **api first**, then ops, driver-web, and the two mobile OTA updates.

- [ ] **Step 5: Clean up the worktree**

```bash
cd ../AdmobiHQ && git worktree remove ../AdmobiHQ-sos
```

---

## Deferred (explicitly not in this plan)

- **Driver push on acknowledge/resolve.** Waits for campaigns' `apps/api/lib/push/user-push.ts`. Driver notification *rows* are written now, so their existing bell already updates; adding push later is a three-line follow-up.
- **Ops-initiated incidents** (a driver phones in).
- **Background location, geofencing, breadcrumb trails.**
- **Auto-escalation, paging rotas, SMS/WhatsApp alerting.**
- **The embedded map in ops detail**, if Task 10 Step 3 finds it fiddly — the Google Maps link ships either way.
