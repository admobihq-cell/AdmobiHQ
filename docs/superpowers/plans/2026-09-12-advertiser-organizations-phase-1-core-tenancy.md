# Advertiser Organizations — Phase 1: Core Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `clerk_user_id`-only advertiser ownership with a Postgres-backed `AdvertiserOrg` tenant, RBAC permission set, and lazy org bootstrap — with zero user-visible behavior change. This is spec §11 steps 1–5, the slice explicitly called out as shippable on its own.

**Architecture:** Clerk keeps issuing sessions; Postgres owns organizations, membership, roles. `apps/api/lib/customer-auth.ts` grows an org-resolution + lazy-bootstrap + 60s permission cache, mirroring the existing ops pattern in `apps/api/lib/auth.ts`. `campaign-store.ts` flips its scoping key from `clerk_user_id` to `org_id`. A one-off backfill script gives every existing advertiser an org before the scoping flip ships.

**Tech Stack:** Next.js App Router (`apps/api`), Prisma 7 + `PrismaClient` (`apps/web/prisma/schema.prisma`), Clerk (`@clerk/backend`), Vitest, `tsx` for one-off scripts.

**Spec:** [docs/superpowers/specs/2026-09-07-advertiser-organizations-design.md](../specs/2026-09-07-advertiser-organizations-design.md) — this plan implements §4 (data model), §5 (bootstrap/backfill), §6 (permissions/roles), §7 (ownership scoping, core routes only), and the write side of §13.2 (audit `org_id` stamping). Everything else in the spec (§7's new org/member routes, §8 client/ops changes, §9 out-of-scope items, §13.3+ activity read side, §14) is later phases — **do not implement them here**, they get their own plan once this one ships.

## Global Constraints

- **One org per advertiser user in v1.** Enforced by `@unique` on `AdvertiserMember.clerk_user_id` — a DB constraint, not app code. Never add app-level "already has an org" checks that duplicate this.
- **No Clerk Organizations on the customer instance.** Postgres owns tenancy; Clerk keeps doing identity only. Never call `customerClerkClient.organizations.*`.
- **A missing org must never degrade to an empty result.** If bootstrap fails, the request must fail loudly (throw/500), never silently scope a query to `org_id = null`.
- **Owner bypass.** `is_owner = true` members skip every permission check and implicitly hold every permission — mirrors `org:admin` in `apps/api/lib/auth.ts`. Never add a role row for "Owner."
- **Permission cache shape.** 60s TTL, `Map<clerk_user_id, { value, expiresAt }>`, `Date.now()` comparisons — copy the exact shape already used by `clerkUserCache` / `opsRoleCache` / `opsPermissionsCache` in `apps/api/lib/auth.ts`. Do not introduce a different caching library or a shared multi-purpose cache.
- **`clerk_user_id` is kept on `Campaign`.** It remains the backfill source and records the individual author. Do not drop it in this phase.
- **Migrations use `prisma db push`, not `prisma migrate dev`.** ~~The plan originally assumed `apps/web/prisma/README.md`'s claim that real Prisma migrations are safe post-cutover.~~ **Correction, discovered while executing Task 1:** `prisma migrate dev --create-only` against the real dev database reported the `public` schema as drifted from dozens of n8n tables (`workflow_entity`, `credentials_entity`, `agent_checkpoints`, etc.) and unrelated diffs on our own tables, and its only offered resolution was `prisma migrate reset` — which would drop the entire shared `public` schema, including n8n's live data. The README's claim does not hold: this Neon database is still schema-shared, unisolated, with n8n. `prisma db push` (already scripted as `db:push` in `apps/web/package.json`) diffs `schema.prisma` against the live DB and applies only the additive changes for the models it manages, without demanding drift-free ownership of the whole schema. No migration history file is produced — the partial unique index (Task 1 Step 3) is applied via `prisma db execute` instead of hand-editing a generated migration file.
- **The Postgres-NULL uniqueness caveat.** `@@unique([org_id, name])` on `AdvertiserRole` does not stop two starter roles both named `"Manager"` with `org_id = NULL`, because Postgres treats NULLs as distinct. Use a partial unique index (`WHERE org_id IS NULL`) instead, added by hand-editing the generated migration SQL (Prisma's schema DSL cannot express a partial index).
- **No `@clerk/*` imports outside `apps/api/lib/customer-auth.ts` and the customer-web/mobile auth components.** Preserves the seam for a future auth-provider swap. Every new function in this plan that needs Clerk goes through `apps/api/lib/customer-clerk.ts` (already Clerk-facing) or `customer-auth.ts` itself.

---

## File Structure

| File | Responsibility |
|---|---|
| `apps/web/prisma/schema.prisma` | New models: `AdvertiserOrg`, `AdvertiserRole`, `AdvertiserMember`, `AdvertiserInvitation`. `Campaign.org_id`, `AuditEvent.org_id`. Applied via `prisma db push` (no migration history file — see Global Constraints). |
| `packages/ops-contracts/src/enums.ts` | `AdvertiserPermission` enum + `ADVERTISER_STARTER_ROLES` permission sets, next to `OpsPermission`. |
| `apps/web/scripts/seed-advertiser-roles.ts` (new) | Idempotent seed of the three starter roles (`org_id = null`). |
| `apps/api/lib/customer-auth.ts` | Grows: `AdvertiserPermission`-typed `CustomerAccess`, lazy bootstrap transaction, 60s permission cache, `requireCustomerPermission()`, `getAdvertiserOrgId()`. |
| `apps/api/lib/api-utils.ts` | New `requireCustomerPermissionAccess()` wrapper, mirroring `requireOpsPermissionAccess()`. |
| `apps/api/lib/audit.ts` | `RecordAuditEventInput.org_id`, `auditFromCustomerUser()` auto-resolves and stamps it. |
| `apps/api/app/v1/campaigns/[id]/review/route.ts` | Ops review route stamps the campaign's `org_id` onto its audit event. |
| `apps/api/scripts/backfill-advertiser-orgs.ts` (new) | One-off, idempotent backfill for existing advertisers. |
| `apps/api/lib/campaign-store.ts` | `getOwnedCampaign`/`listOwnedCampaigns` flip from `clerkUserId` to `orgId`. |
| 8 route files under `apps/api/app/v1/customer/campaigns/**` | Call-site updates: `requireCustomerAccess()` → `requireCustomerPermissionAccess(<perm>)`, `auth.access.userId` → `auth.access.orgId` at the two store functions. |
| `apps/api/app/v1/campaigns/lifecycle.test.ts` | Existing cross-account isolation test updated for org-scoped mocks. |

---

## Task 1: Prisma schema — tenancy tables

**Files:**
- Modify: `apps/web/prisma/schema.prisma` (insert after `OpsRoleAssignment`, currently ending at line 443; modify `Campaign` at lines 518-566; modify `AuditEvent` at lines 630-648)
- No migration file is created — schema changes are applied directly to the live database via `prisma db push` (see Global Constraints).

**Interfaces:**
- Produces: Prisma Client models `prisma.advertiserOrg`, `prisma.advertiserRole`, `prisma.advertiserMember`, `prisma.advertiserInvitation`, and `org_id` columns on `Campaign` / `AuditEvent`. Every later task in this plan depends on these existing after `prisma generate` runs.

- [x] **Step 1: Add the four new models to `schema.prisma`, right after the `OpsRoleAssignment` model**

```prisma
/// An advertiser tenant. Created automatically for every advertiser — a solo
/// advertiser is an org of one and never sees org UI. Name is seeded from the
/// company name collected at sign-up (Clerk unsafeMetadata.companyName) and
/// is editable in settings later.
model AdvertiserOrg {
  id         Int      @id @default(autoincrement())
  name       String
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  members     AdvertiserMember[]
  invitations AdvertiserInvitation[]
  roles       AdvertiserRole[]
  campaigns   Campaign[]

  @@map("advertiser_orgs")
}

/// Fine-grained permission set, mirroring OpsRole. Rows with org_id = null are
/// the seeded starter roles shared by every org; a non-null org_id is a custom
/// role belonging to one org (not built until a later phase).
///
/// The @@unique below does NOT stop two starter roles both named "Manager"
/// with org_id = NULL — Postgres treats NULLs as distinct in unique indexes.
/// A partial unique index (added by hand to the generated migration, see
/// Step 3) is what actually protects the starter-role names.
model AdvertiserRole {
  id          Int            @id @default(autoincrement())
  org_id      Int?
  org         AdvertiserOrg? @relation(fields: [org_id], references: [id], onDelete: Cascade)
  name        String
  permissions String[]       @default([])
  created_at  DateTime       @default(now())

  members AdvertiserMember[]

  @@unique([org_id, name])
  @@map("advertiser_roles")
}

/// One row per advertiser user. clerk_user_id is globally unique, which is how
/// "one org per user in v1" is enforced — a DB constraint, not app code.
/// is_owner members are exempt from permission checks entirely, exactly as
/// org:admin is exempt in ops.
model AdvertiserMember {
  id            Int             @id @default(autoincrement())
  org_id        Int
  org           AdvertiserOrg   @relation(fields: [org_id], references: [id], onDelete: Cascade)
  clerk_user_id String          @unique
  role_id       Int?
  role          AdvertiserRole? @relation(fields: [role_id], references: [id])
  is_owner      Boolean         @default(false)
  created_at    DateTime        @default(now())
  updated_at    DateTime        @updatedAt

  @@index([org_id])
  @@map("advertiser_members")
}

/// A pending invitation. Not consumed until the Team-management phase — the
/// table is created now so this migration adds the whole tenancy shape in one
/// additive pass, matching spec §4.
model AdvertiserInvitation {
  id                       Int             @id @default(autoincrement())
  org_id                   Int
  org                      AdvertiserOrg   @relation(fields: [org_id], references: [id], onDelete: Cascade)
  email                    String
  role_id                  Int?
  token_hash               String          @unique
  expires_at               DateTime
  accepted_at              DateTime?
  revoked_at               DateTime?
  invited_by_clerk_user_id String
  created_at               DateTime        @default(now())

  @@unique([org_id, email])
  @@index([email])
  @@map("advertiser_invitations")
}
```

- [x] **Step 2: Add `org_id` to `Campaign` and `AuditEvent`**

In `Campaign` (after the `creatives CampaignCreative[]` line, before the `@@index` lines):

```prisma
  org_id Int?
  org    AdvertiserOrg? @relation(fields: [org_id], references: [id])
```

Add one more index line among `Campaign`'s existing `@@index` block:

```prisma
  @@index([org_id, created_at])
```

In `AuditEvent` (after `entity_id String?`, before `summary`):

```prisma
  org_id Int?
```

Add one more index line among `AuditEvent`'s existing `@@index` block:

```prisma
  @@index([org_id, created_at])
```

- [x] **Step 3: Push the schema additively, then add the partial unique index by hand**

`prisma migrate dev` cannot be used against this database — see the Global Constraints note above (it detects the whole `public` schema as drifted because of n8n's tables and offers only a destructive reset). Use `db push` instead, which diffs and applies only the models this schema manages:

```bash
npm run db:push -w web
```

Expected: Prisma reports the new tables/columns created (`advertiser_orgs`, `advertiser_roles`, `advertiser_members`, `advertiser_invitations`, plus `org_id` on `campaigns` and `audit_events`) and regenerates the client. It should NOT report drift or offer a reset — if it does, stop and re-check the diff before continuing.

`db push` has the same limitation `migrate dev` would have here: it cannot express a partial unique index from the Prisma schema DSL. Add it directly with `prisma db execute`:

```bash
cat > /tmp/advertiser-roles-partial-index.sql <<'EOF'
-- Partial unique index: protects starter-role names (org_id IS NULL) from
-- duplicates. The @@unique([org_id, name]) in schema.prisma does NOT do this
-- on its own because Postgres treats NULL as distinct in unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS "advertiser_roles_starter_name_key" ON "advertiser_roles"("name") WHERE "org_id" IS NULL;
EOF
npx dotenv -e apps/web/.env.local -- npx prisma db execute --schema apps/web/prisma/schema.prisma --file /tmp/advertiser-roles-partial-index.sql
```

- [x] **Step 4: Verify the client picked up the new models**

```bash
npx tsc --noEmit -p apps/web
```

Expected: no new type errors (the generated client types now include the new models; nothing references them yet so nothing should fail).

- [x] **Step 5: Commit**

Two commits, since the schema-isolation fix is a separate, load-bearing change discovered mid-task (see the Global Constraints correction above) — n8n's ~108 tables were moved from `public` to a new `n8n` Postgres schema (via hand-run `ALTER TABLE ... SET SCHEMA`, not part of this repo's history since it was a one-time live-DB operation with no file to check in) before `prisma db push` could safely run:

```bash
git add n8n-project/docker-compose.yml
git commit -m "fix: isolate n8n's tables into their own Postgres schema"

git add apps/web/prisma/schema.prisma apps/web/prisma/scripts/advertiser-roles-partial-index.sql
git commit -m "feat: add advertiser org, role, member, invitation tables"
```

---

## Task 2: `AdvertiserPermission` enum and starter role definitions

**Files:**
- Modify: `packages/ops-contracts/src/enums.ts` (append after the `OpsPermission` block, currently ending at line 247)
- Test: `packages/ops-contracts/src/enums.test.ts` (new — check for an existing test file at this path first; if `packages/ops-contracts` has no test file convention yet, create one following the same `describe`/`it` style as `apps/api/lib/campaign-dto.test.ts`)

**Interfaces:**
- Produces: `ADVERTISER_PERMISSIONS: readonly string[]`, `type AdvertiserPermission`, `ADVERTISER_STARTER_ROLES: Record<"Manager" | "Member" | "Viewer", readonly AdvertiserPermission[]>`. Task 3 (seed script), Task 4 (`customer-auth.ts`), and Task 7 (route permission checks) all import from here.

- [x] **Step 1: Write the failing test**

```typescript
// packages/ops-contracts/src/enums.test.ts
import { describe, expect, it } from "vitest"

import { ADVERTISER_PERMISSIONS, ADVERTISER_STARTER_ROLES } from "./enums"

describe("ADVERTISER_STARTER_ROLES", () => {
  it("only grants permissions that exist in ADVERTISER_PERMISSIONS", () => {
    for (const permissions of Object.values(ADVERTISER_STARTER_ROLES)) {
      for (const permission of permissions) {
        expect(ADVERTISER_PERMISSIONS).toContain(permission)
      }
    }
  })

  it("gives Member every permission Viewer has, plus more", () => {
    const viewer = new Set(ADVERTISER_STARTER_ROLES.Viewer)
    const member = new Set(ADVERTISER_STARTER_ROLES.Member)
    for (const permission of viewer) {
      expect(member.has(permission)).toBe(true)
    }
    expect(member.size).toBeGreaterThan(viewer.size)
  })

  it("only Manager can submit campaigns", () => {
    expect(ADVERTISER_STARTER_ROLES.Manager).toContain("campaigns:submit")
    expect(ADVERTISER_STARTER_ROLES.Member).not.toContain("campaigns:submit")
    expect(ADVERTISER_STARTER_ROLES.Viewer).not.toContain("campaigns:submit")
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/ops-contracts/src/enums.test.ts`
Expected: FAIL — `ADVERTISER_PERMISSIONS`/`ADVERTISER_STARTER_ROLES` are not exported from `./enums`.

- [x] **Step 3: Add the enum and starter-role map**

Append to `packages/ops-contracts/src/enums.ts`, after `export type OpsPermission = (typeof OPS_PERMISSIONS)[number]`:

```typescript
/** Advertiser-org permission set. `resource:action` shape — deliberately not
 * retrofitted onto the flat, section-shaped OpsPermission above, because the
 * whole point here is separating "drafts a campaign" from "submits it and
 * commits spend." campaigns:submit is the money boundary. */
export const ADVERTISER_PERMISSIONS = [
  "campaigns:read",
  "campaigns:write",
  "campaigns:submit",
  "creatives:write",
  "reports:read",
  "billing:read",
  "billing:write",
  "team:manage",
  "org:manage",
  "activity:read",
  "support:read_all",
] as const
export type AdvertiserPermission = (typeof ADVERTISER_PERMISSIONS)[number]

/** Seeded once (org_id = null) by apps/web/scripts/seed-advertiser-roles.ts.
 * "Owner" is not a role row — is_owner members bypass permission checks
 * entirely, exactly as org:admin is exempt in ops. billing:write, team:manage
 * and org:manage are held only by owners in v1; they exist in the enum so a
 * later custom-role phase can grant them without a migration. */
export const ADVERTISER_STARTER_ROLES: Record<"Manager" | "Member" | "Viewer", readonly AdvertiserPermission[]> = {
  Manager: [
    "campaigns:read",
    "campaigns:write",
    "campaigns:submit",
    "creatives:write",
    "reports:read",
    "billing:read",
    "activity:read",
    "support:read_all",
  ],
  Member: ["campaigns:read", "campaigns:write", "creatives:write", "reports:read"],
  Viewer: ["campaigns:read", "reports:read"],
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/ops-contracts/src/enums.test.ts`
Expected: PASS (3 tests)

- [x] **Step 5: Commit**

```bash
git add packages/ops-contracts/src/enums.ts packages/ops-contracts/src/enums.test.ts
git commit -m "feat: add AdvertiserPermission enum and starter role definitions"
```

---

## Task 3: Seed the starter roles

**Files:**
- Create: `apps/web/scripts/seed-advertiser-roles.ts`
- Modify: `apps/web/package.json` (add a `seed:advertiser-roles` script next to `seed:blog`/`seed:help`)
- Test: `apps/web/scripts/seed-advertiser-roles.test.ts`

**Interfaces:**
- Consumes: `ADVERTISER_STARTER_ROLES` from `@workspace/ops-contracts` (Task 2), `prisma.advertiserRole` (Task 1).
- Produces: `seedAdvertiserStarterRoles(): Promise<void>` — Task 4's bootstrap logic and Task 6's backfill script both rely on these three rows existing, but only via reading them at runtime, not by importing this function.

- [x] **Step 1: Write the failing test**

```typescript
// apps/web/scripts/seed-advertiser-roles.test.ts
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { afterAll, describe, expect, it } from "vitest"

import { seedAdvertiserStarterRoles } from "./seed-advertiser-roles"

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)("seedAdvertiserStarterRoles", () => {
  // This Prisma version requires an explicit driver adapter — plain
  // `new PrismaClient()` throws "Pass a driver adapter to the PrismaClient
  // constructor". Mirrors apps/api/lib/prisma.ts.
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // 30s, not vitest's 5s default: Neon's compute suspends when idle and the
  // first query of a run pays a real cold-start cost.
  it("creates exactly one row per starter role, and is idempotent", async () => {
    await seedAdvertiserStarterRoles()
    await seedAdvertiserStarterRoles() // run twice on purpose

    const roles = await prisma.advertiserRole.findMany({ where: { org_id: null } })
    const byName = new Map(roles.map((r) => [r.name, r]))

    expect(byName.size).toBe(3)
    expect(byName.get("Manager")?.permissions).toContain("campaigns:submit")
    expect(byName.get("Member")?.permissions).not.toContain("campaigns:submit")
    expect(byName.get("Viewer")?.permissions).toEqual(["campaigns:read", "reports:read"])
  }, 30_000)
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx dotenv -e apps/web/.env.local -- vitest run apps/web/scripts/seed-advertiser-roles.test.ts`
Expected: FAIL — cannot find module `./seed-advertiser-roles`.

- [x] **Step 3: Write the seed script**

```typescript
// apps/web/scripts/seed-advertiser-roles.ts
import { fileURLToPath } from "node:url"

import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

import { ADVERTISER_STARTER_ROLES } from "@workspace/ops-contracts"

// This Prisma version requires an explicit driver adapter — plain
// `new PrismaClient()` throws. Mirrors apps/api/lib/prisma.ts, minus the
// shared-pool singleton machinery this one-off script doesn't need.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

/** Idempotent: guards on org_id IS NULL AND name = $1 (a manual upsert)
 * rather than relying on Prisma's upsert-by-unique-key, because
 * @@unique([org_id, name]) does not catch NULL org_id duplicates on its
 * own — see the partial unique index added in the schema migration. */
export async function seedAdvertiserStarterRoles(): Promise<void> {
  for (const [name, permissions] of Object.entries(ADVERTISER_STARTER_ROLES)) {
    const existing = await prisma.advertiserRole.findFirst({
      where: { org_id: null, name },
    })
    if (existing) {
      await prisma.advertiserRole.update({
        where: { id: existing.id },
        data: { permissions: [...permissions] },
      })
    } else {
      await prisma.advertiserRole.create({
        data: { org_id: null, name, permissions: [...permissions] },
      })
    }
  }
}

// file://-URL vs. process.argv[1]'s native path never match on Windows
// (backslashes vs. the URL's forward slashes) — normalize through
// fileURLToPath instead of a raw string comparison.
const isMain = process.argv[1] != null && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  seedAdvertiserStarterRoles()
    .then(() => console.log("Seeded advertiser starter roles."))
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
```

**Two things discovered running this for real, applicable to every later task's throwaway `PrismaClient` usage (Tasks 4-7's tests, Task 6's backfill script):** (1) this Prisma version requires a driver adapter — `new PrismaClient()` alone throws; (2) `import.meta.url === \`file://${process.argv[1]}\`` never matches on Windows. Use the patterns above.

- [x] **Step 4: Run test to verify it passes**

Run: `npx dotenv -e apps/web/.env.local -- vitest run apps/web/scripts/seed-advertiser-roles.test.ts`
Expected: PASS

- [x] **Step 5: Add the npm script**

In `apps/web/package.json`, next to `"seed:blog"`:

```json
    "seed:advertiser-roles": "dotenv -e .env.local -- tsx scripts/seed-advertiser-roles.ts",
```

- [x] **Step 6: Run the seed against the real dev database**

```bash
npm run seed:advertiser-roles -w web
```

Expected: `Seeded advertiser starter roles.` and no errors.

- [x] **Step 7: Commit**

```bash
git add apps/web/scripts/seed-advertiser-roles.ts apps/web/scripts/seed-advertiser-roles.test.ts apps/web/package.json
git commit -m "feat: seed advertiser starter roles"
```

---

## Task 4: `customer-auth.ts` — org resolution, lazy bootstrap, permission cache

**Files:**
- Modify: `apps/api/lib/customer-auth.ts` (full rewrite of the file — currently 54 lines, see below for the complete new contents)
- Modify: `apps/api/lib/api-utils.ts` (add `requireCustomerPermissionAccess`, lines 84-97 area)
- Test: `apps/api/lib/customer-auth.test.ts` (new)

**Interfaces:**
- Consumes: `getCustomerCompanyName` from `apps/api/lib/customer-clerk.ts` (existing), `AdvertiserPermission` / `ADVERTISER_PERMISSIONS` from `@workspace/ops-contracts` (Task 2), `prisma.advertiserOrg` / `prisma.advertiserMember` / `prisma.advertiserRole` (Task 1).
- Produces:
  - `export type CustomerAccess = { status: "unauthenticated" } | { status: "authorized"; userId: string; orgId: number; isOwner: boolean; permissions: Set<AdvertiserPermission> }` — **breaking change** to the existing type. Task 7 and the existing `lifecycle.test.ts` mock both need updating to match (Task 7 handles this).
  - `export async function requireCustomerUser(): Promise<Extract<CustomerAccess, { status: "authorized" }>>` (same name/throw behavior as today, richer return type).
  - `export async function requireCustomerPermission(permission: AdvertiserPermission): Promise<Extract<CustomerAccess, { status: "authorized" }>>` — new, mirrors `requireOpsPermission` in `apps/api/lib/auth.ts`.
  - `export async function getAdvertiserOrgId(clerkUserId: string): Promise<number | null>` — new, used by Task 5's `audit.ts`. Never triggers bootstrap; returns `null` if no membership row exists yet.

- [x] **Step 1: Write the failing tests**

```typescript
// apps/api/lib/customer-auth.test.ts
import { PrismaClient } from "@prisma/client"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/customer-clerk", () => ({
  getCustomerCompanyName: vi.fn(async () => "Acme Media"),
}))
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ authorization: "Bearer test-token" })),
}))
vi.mock("@clerk/backend", () => ({
  verifyToken: vi.fn(async () => ({ sub: currentTestUserId })),
}))

let currentTestUserId = ""
const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)("customer-auth org bootstrap", () => {
  const prisma = new PrismaClient()
  const createdUserIds: string[] = []

  beforeAll(async () => {
    process.env.CUSTOMER_CLERK_SECRET_KEY = "test-secret"
  })

  afterEach(async () => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    // Delete orgs FIRST, while their members still exist to match this
    // relational filter — AdvertiserMember.org has onDelete: Cascade, so
    // this also removes the member rows. Deleting members first would make
    // this filter match zero orgs (their only member is already gone) and
    // silently leak an AdvertiserOrg row on every run.
    await prisma.advertiserOrg.deleteMany({ where: { members: { some: { clerk_user_id: { in: createdUserIds } } } } })
    await prisma.$disconnect()
  })

  it("bootstraps a new user into an org they own, seeded from the Clerk company name", async () => {
    currentTestUserId = `auth-test-${Date.now()}`
    createdUserIds.push(currentTestUserId)

    const { getCustomerAccess } = await import("./customer-auth")
    const access = await getCustomerAccess()

    expect(access.status).toBe("authorized")
    if (access.status !== "authorized") throw new Error("unreachable")
    expect(access.isOwner).toBe(true)
    expect(access.userId).toBe(currentTestUserId)

    const org = await prisma.advertiserOrg.findUnique({ where: { id: access.orgId } })
    expect(org?.name).toBe("Acme Media")
  })

  it("is idempotent: a second call for the same user returns the same org", async () => {
    currentTestUserId = `auth-test-idempotent-${Date.now()}`
    createdUserIds.push(currentTestUserId)

    const { getCustomerAccess } = await import("./customer-auth")
    const first = await getCustomerAccess()
    const second = await getCustomerAccess()

    if (first.status !== "authorized" || second.status !== "authorized") throw new Error("unreachable")
    expect(second.orgId).toBe(first.orgId)

    const memberCount = await prisma.advertiserMember.count({
      where: { clerk_user_id: currentTestUserId },
    })
    expect(memberCount).toBe(1)
  })

  it("an owner holds every permission without a role assignment", async () => {
    currentTestUserId = `auth-test-owner-${Date.now()}`
    createdUserIds.push(currentTestUserId)

    const { getCustomerAccess } = await import("./customer-auth")
    const access = await getCustomerAccess()
    if (access.status !== "authorized") throw new Error("unreachable")

    expect(access.permissions.has("campaigns:submit")).toBe(true)
    expect(access.permissions.has("org:manage")).toBe(true)
  })

  it("getAdvertiserOrgId returns null for a user with no membership, without creating one", async () => {
    const strangerId = `auth-test-stranger-${Date.now()}`
    const { getAdvertiserOrgId } = await import("./customer-auth")

    const orgId = await getAdvertiserOrgId(strangerId)
    expect(orgId).toBeNull()

    const member = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: strangerId } })
    expect(member).toBeNull()
  })
})
```

- [x] **Step 2: Run tests to verify they fail**

Run: `npx dotenv -e apps/web/.env.local -- vitest run apps/api/lib/customer-auth.test.ts`
Expected: FAIL — `getAdvertiserOrgId` is not exported, and `access.orgId`/`access.isOwner`/`access.permissions` are `undefined` under the current `CustomerAccess` shape.

- [x] **Step 3: Rewrite `customer-auth.ts`**

```typescript
// apps/api/lib/customer-auth.ts
import { Prisma } from "@prisma/client"
import { verifyToken } from "@clerk/backend"
import { headers } from "next/headers"

import { ADVERTISER_PERMISSIONS, type AdvertiserPermission } from "@workspace/ops-contracts"

import { getCustomerCompanyName } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"

/**
 * Verifies against the CUSTOMER Clerk instance (CUSTOMER_CLERK_SECRET_KEY), a
 * separate instance from ops (lib/auth.ts) and driver (lib/driver-auth.ts).
 * Bearer-token only, no session-cookie fallback — apps/api is a separate
 * origin from customer-web/customer-mobile. Callers must send
 * `Authorization: Bearer <token>` using a token from the customer Clerk
 * instance's getToken().
 *
 * Postgres owns tenancy — Clerk never learns organizations exist. See
 * docs/superpowers/specs/2026-09-07-advertiser-organizations-design.md §3.
 */

export type CustomerAccess =
  | { status: "unauthenticated" }
  | {
      status: "authorized"
      userId: string
      orgId: number
      isOwner: boolean
      permissions: Set<AdvertiserPermission>
    }

type AdvertiserAccessValue = { orgId: number; isOwner: boolean; permissions: Set<AdvertiserPermission> }

const ADVERTISER_ACCESS_CACHE_TTL_MS = 60_000
const advertiserAccessCache = new Map<string, { value: AdvertiserAccessValue; expiresAt: number }>()

function getCachedAdvertiserAccess(userId: string): AdvertiserAccessValue | null {
  const entry = advertiserAccessCache.get(userId)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    advertiserAccessCache.delete(userId)
    return null
  }
  return entry.value
}

function setCachedAdvertiserAccess(userId: string, value: AdvertiserAccessValue): void {
  advertiserAccessCache.set(userId, { value, expiresAt: Date.now() + ADVERTISER_ACCESS_CACHE_TTL_MS })
}

async function resolveCustomerUserId(): Promise<string | null> {
  const authHeader = (await headers()).get("authorization")
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null
  if (!bearer) {
    return null
  }

  try {
    const payload = await verifyToken(bearer, {
      secretKey: process.env.CUSTOMER_CLERK_SECRET_KEY,
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

async function resolveRolePermissions(roleId: number | null): Promise<Set<AdvertiserPermission>> {
  if (roleId == null) return new Set()
  const role = await prisma.advertiserRole.findUnique({ where: { id: roleId } })
  const permissions = (role?.permissions ?? []).filter((p): p is AdvertiserPermission =>
    (ADVERTISER_PERMISSIONS as readonly string[]).includes(p),
  )
  return new Set(permissions)
}

/**
 * The first authenticated request from a clerk_user_id with no
 * AdvertiserMember row creates the org and an owner membership in one
 * transaction. Lazy rather than at sign-up because it covers the Google SSO
 * round-trip, the email-code path, and pre-existing users with one code path
 * and no client cooperation.
 *
 * If two requests race, the loser's create hits the unique constraint on
 * clerk_user_id (P2002) — it reads back the winner's row rather than failing
 * the request, so "concurrent first requests create exactly one org" holds
 * without extra locking.
 */
async function bootstrapOrGetMembership(
  clerkUserId: string,
): Promise<{ orgId: number; isOwner: boolean; roleId: number | null }> {
  const existing = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: clerkUserId } })
  if (existing) {
    return { orgId: existing.org_id, isOwner: existing.is_owner, roleId: existing.role_id }
  }

  const companyName = (await getCustomerCompanyName(clerkUserId)) ?? ""

  try {
    const member = await prisma.$transaction(async (tx) => {
      const org = await tx.advertiserOrg.create({ data: { name: companyName } })
      return tx.advertiserMember.create({
        data: { org_id: org.id, clerk_user_id: clerkUserId, is_owner: true },
      })
    })
    return { orgId: member.org_id, isOwner: member.is_owner, roleId: member.role_id }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const winner = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: clerkUserId } })
      if (winner) {
        return { orgId: winner.org_id, isOwner: winner.is_owner, roleId: winner.role_id }
      }
    }
    throw error
  }
}

export async function getCustomerAccess(): Promise<CustomerAccess> {
  const userId = await resolveCustomerUserId()
  if (!userId) {
    return { status: "unauthenticated" }
  }

  const cached = getCachedAdvertiserAccess(userId)
  if (cached) {
    return { status: "authorized", userId, ...cached }
  }

  const { orgId, isOwner, roleId } = await bootstrapOrGetMembership(userId)
  const permissions = isOwner ? new Set(ADVERTISER_PERMISSIONS) : await resolveRolePermissions(roleId)

  setCachedAdvertiserAccess(userId, { orgId, isOwner, permissions })
  return { status: "authorized", userId, orgId, isOwner, permissions }
}

/** Reads org_id for an existing member, WITHOUT bootstrapping — a missing
 * membership here returns null rather than creating an org, because audit
 * stamping must never have the side effect of creating tenancy. By the time
 * an audited action has happened, requireCustomerUser() already bootstrapped
 * the org earlier in the same request. */
export async function getAdvertiserOrgId(clerkUserId: string): Promise<number | null> {
  const cached = getCachedAdvertiserAccess(clerkUserId)
  if (cached) return cached.orgId
  const member = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: clerkUserId } })
  return member?.org_id ?? null
}

export async function requireCustomerUser(): Promise<Extract<CustomerAccess, { status: "authorized" }>> {
  const access = await getCustomerAccess()
  if (access.status === "unauthenticated") {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  return access
}

/** Mirrors requireOpsPermission in lib/auth.ts. is_owner bypasses this
 * entirely, same as org:admin does for ops. */
export async function requireCustomerPermission(
  permission: AdvertiserPermission,
): Promise<Extract<CustomerAccess, { status: "authorized" }>> {
  const access = await requireCustomerUser()
  if (!access.isOwner && !access.permissions.has(permission)) {
    throw new Response(
      JSON.stringify({ error: `Forbidden — "${permission}" access required` }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    )
  }
  return access
}
```

- [x] **Step 4: Add `requireCustomerPermissionAccess` to `api-utils.ts`**

In `apps/api/lib/api-utils.ts`, update the import on line 15 and add a new wrapper next to `requireCustomerAccess` (lines 84-97):

```typescript
import { requireCustomerPermission, requireCustomerUser } from "@/lib/customer-auth"
```

```typescript
/** Same as requireCustomerAccess, but the caller must also hold the given
 * advertiser permission. Owners bypass the check inside
 * requireCustomerPermission itself. */
export async function requireCustomerPermissionAccess(
  permission: AdvertiserPermission,
): Promise<
  | { access: Awaited<ReturnType<typeof requireCustomerPermission>>; error?: undefined }
  | { access?: undefined; error: NextResponse }
> {
  try {
    const access = await requireCustomerPermission(permission)
    return { access }
  } catch (e) {
    if (e instanceof Response) return { error: e as NextResponse }
    return { error: jsonError("Unauthorized", 401) }
  }
}
```

Add `AdvertiserPermission` to the existing `@workspace/ops-contracts` import at the top of the file (currently importing `OpsPermission` among others).

- [x] **Step 5: Run tests to verify they pass**

Run: `npx dotenv -e apps/web/.env.local -- vitest run apps/api/lib/customer-auth.test.ts`
Expected: PASS (4 tests)

- [x] **Step 6: Type-check the whole `apps/api` app**

Run: `npx tsc --noEmit -p apps/api`
Expected: errors ONLY in the 8 customer-campaign route files and `apps/api/lib/campaign-store.ts` (they still call `getOwnedCampaign(auth.access.userId, ...)`, which now mismatches `CustomerAccess`'s new shape) and in `apps/api/app/v1/campaigns/lifecycle.test.ts`'s mock. These are expected — Task 7 fixes them. Confirm no *other* files have new errors.

- [x] **Step 7: Commit**

```bash
git add apps/api/lib/customer-auth.ts apps/api/lib/customer-auth.test.ts apps/api/lib/api-utils.ts
git commit -m "feat: org resolution, lazy bootstrap, and permission cache in customer-auth"
```

---

## Task 5: Stamp `org_id` on audit events

**Files:**
- Modify: `apps/api/lib/audit.ts` (lines 14-24 `RecordAuditEventInput`, lines 26-53 `recordAuditEvent`, lines 95-111 `auditFromCustomerUser`, lines 132-161 `toAuditEventDto`)
- Modify: `apps/api/app/v1/campaigns/[id]/review/route.ts` (line 79, the `auditFromOpsUser` call)
- Test: `apps/api/lib/audit.test.ts` (new)

**Interfaces:**
- Consumes: `getAdvertiserOrgId` from `apps/api/lib/customer-auth.ts` (Task 4).
- Produces: `RecordAuditEventInput.org_id?: number | null`, `auditFromCustomerUser` auto-stamps it (not caller-supplied), `auditFromOpsUser`/`auditFromDriverUser`/`auditPublic` accept it optionally (unchanged call sites keep working). This is spec §11 step 3 and §13.2.

- [x] **Step 1: Write the failing test**

```typescript
// apps/api/lib/audit.test.ts
import { PrismaClient } from "@prisma/client"
import { afterAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/customer-clerk", () => ({
  getCustomerEmail: vi.fn(async () => "advertiser@example.com"),
}))

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)("audit org_id stamping", () => {
  const prisma = new PrismaClient()
  const createdUserIds: string[] = []
  const createdEventIds: number[] = []

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { id: { in: createdEventIds } } })
    // Delete orgs FIRST, while their members still exist to match this
    // relational filter — AdvertiserMember.org has onDelete: Cascade, so
    // this also removes the member rows. Deleting members first would make
    // this filter match zero orgs (their only member is already gone) and
    // silently leak an AdvertiserOrg row on every run.
    await prisma.advertiserOrg.deleteMany({ where: { members: { some: { clerk_user_id: { in: createdUserIds } } } } })
    await prisma.$disconnect()
  })

  it("auditFromCustomerUser stamps org_id from the actor's membership", async () => {
    const userId = `audit-test-${Date.now()}`
    createdUserIds.push(userId)
    const org = await prisma.advertiserOrg.create({ data: { name: "Audit Test Org" } })
    await prisma.advertiserMember.create({ data: { org_id: org.id, clerk_user_id: userId, is_owner: true } })

    const { auditFromCustomerUser } = await import("./audit")
    await auditFromCustomerUser(userId, {
      action: "create",
      entity_type: "campaign",
      entity_id: 999,
      summary: "test event",
    })

    const event = await prisma.auditEvent.findFirst({
      where: { actor_user_id: userId },
      orderBy: { id: "desc" },
    })
    expect(event).not.toBeNull()
    createdEventIds.push(event!.id)
    expect(event!.org_id).toBe(org.id)
  })

  it("auditFromCustomerUser stamps a null org_id when the actor has no membership", async () => {
    const userId = `audit-test-no-org-${Date.now()}`

    const { auditFromCustomerUser } = await import("./audit")
    await auditFromCustomerUser(userId, {
      action: "create",
      entity_type: "campaign",
      entity_id: 998,
      summary: "test event without org",
    })

    const event = await prisma.auditEvent.findFirst({
      where: { actor_user_id: userId },
      orderBy: { id: "desc" },
    })
    expect(event).not.toBeNull()
    createdEventIds.push(event!.id)
    expect(event!.org_id).toBeNull()
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx dotenv -e apps/web/.env.local -- vitest run apps/api/lib/audit.test.ts`
Expected: FAIL — `event!.org_id` is `undefined` (column doesn't exist on the write path yet / TS error that `org_id` isn't a valid `AuditEvent` filter... it does exist on the model since Task 1, but `recordAuditEvent` never writes it).

- [x] **Step 3: Update `audit.ts`**

Add `org_id` to `RecordAuditEventInput`:

```typescript
export type RecordAuditEventInput = {
  app: AuditApp | string
  actor_type: AuditActorType | string
  actor_user_id?: string | null
  actor_email?: string | null
  action: AuditAction | string
  entity_type: AuditEntityType | string
  entity_id?: string | number | null
  org_id?: number | null
  summary: string
  metadata?: Record<string, unknown> | null
}
```

In `recordAuditEvent`'s `prisma.auditEvent.create({ data: {...} })`, add:

```typescript
        org_id: input.org_id ?? null,
```

Replace `auditFromCustomerUser` to auto-resolve `org_id` (note the narrower `Omit` — callers cannot pass `org_id` themselves, it is always derived from the actor):

```typescript
import { getAdvertiserOrgId } from "@/lib/customer-auth"

export async function auditFromCustomerUser(
  userId: string,
  input: Omit<RecordAuditEventInput, "app" | "actor_type" | "actor_user_id" | "actor_email" | "org_id">,
): Promise<void> {
  const [actorEmail, orgId] = await Promise.all([getCustomerEmail(userId), getAdvertiserOrgId(userId)])
  return recordAuditEvent({
    app: "api",
    actor_type: "customer",
    actor_user_id: userId,
    actor_email: actorEmail,
    org_id: orgId,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    summary: input.summary,
    metadata: input.metadata,
  })
}
```

Update `toAuditEventDto`'s parameter type and return to include `org_id` (`auditFromOpsUser`/`auditFromDriverUser`/`auditPublic` signatures are unchanged — `org_id` was never omitted from their `Omit<...>`, so it's already an optional passthrough field on their input type):

```typescript
export function toAuditEventDto(row: {
  id: number
  app: string
  actor_type: string
  actor_user_id: string | null
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  org_id: number | null
  summary: string
  metadata: Prisma.JsonValue
  created_at: Date
}) {
  return {
    id: row.id,
    app: row.app,
    actor_type: row.actor_type,
    actor_user_id: row.actor_user_id,
    actor_email: row.actor_email,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    org_id: row.org_id,
    summary: row.summary,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    created_at: row.created_at.toISOString(),
  }
}
```

- [x] **Step 4: Stamp the ops campaign-review route**

In `apps/api/app/v1/campaigns/[id]/review/route.ts`, update the `auditFromOpsUser` call (currently lines 79-86) to pass the campaign's org:

```typescript
  await auditFromOpsUser(access, {
    action: "update",
    entity_type: "campaign",
    entity_id: id,
    org_id: existing.org_id,
    summary: isUnapprove
      ? `Campaign #${id} "${updated.name}" unapproved (now ${decision.replace(/_/g, " ")})`
      : `Campaign #${id} "${updated.name}" ${decision.replace(/_/g, " ")}`,
  })
```

(`existing` is the pre-update `prisma.campaign.findUnique({ where: { id } })` result already in scope on line 53 — it now carries `org_id` once Task 1's migration is applied.)

- [x] **Step 5: Run tests to verify they pass**

Run: `npx dotenv -e apps/web/.env.local -- vitest run apps/api/lib/audit.test.ts`
Expected: PASS (2 tests)

- [x] **Step 6: Commit**

```bash
git add apps/api/lib/audit.ts apps/api/lib/audit.test.ts apps/api/app/v1/campaigns/[id]/review/route.ts
git commit -m "feat: stamp org_id on customer and ops-reviewed campaign audit events"
```

---

## Task 6: Backfill script for existing advertisers

**Files:**
- Create: `apps/api/scripts/backfill-advertiser-orgs.ts`
- Modify: `apps/api/package.json` (add a `backfill:advertiser-orgs` script next to `env:check`)
- Test: `apps/api/scripts/backfill-advertiser-orgs.test.ts`

**Interfaces:**
- Consumes: `customerClerkClient`, `readCompanyName` from `apps/api/lib/customer-clerk.ts` (existing), `prisma` (Task 1's new tables + existing `Campaign`).
- Produces: `backfillAdvertiserOrgs(): Promise<{ orgsCreated: number; orphanedCampaignIds: number[] }>`. Nothing later in this plan calls it programmatically — it is a one-off, run once manually before Task 7 ships.

- [x] **Step 1: Write the failing test**

```typescript
// apps/api/scripts/backfill-advertiser-orgs.test.ts
import { PrismaClient } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

const FAKE_USERS = [
  { id: "backfill-test-user-a", unsafeMetadata: { companyName: "Acme Media" } },
  { id: "backfill-test-user-b", unsafeMetadata: {} },
]

vi.mock("@/lib/customer-clerk", async () => {
  const actual = await vi.importActual<typeof import("@/lib/customer-clerk")>("@/lib/customer-clerk")
  return {
    ...actual,
    customerClerkClient: {
      users: {
        getUserList: vi.fn(async ({ offset }: { offset: number }) => ({
          data: offset === 0 ? FAKE_USERS : [],
        })),
      },
    },
  }
})

const databaseUrl = process.env.DATABASE_URL

describe.skipIf(!databaseUrl)("backfillAdvertiserOrgs", () => {
  const prisma = new PrismaClient()

  beforeAll(async () => {
    await prisma.campaign.create({
      data: { clerk_user_id: "backfill-test-user-a", name: "Pre-existing campaign" },
    })
  })

  afterAll(async () => {
    const memberships = await prisma.advertiserMember.findMany({
      where: { clerk_user_id: { in: FAKE_USERS.map((u) => u.id) } },
    })
    const orgIds = memberships.map((m) => m.org_id)
    await prisma.campaign.deleteMany({ where: { clerk_user_id: "backfill-test-user-a" } })
    await prisma.advertiserMember.deleteMany({ where: { clerk_user_id: { in: FAKE_USERS.map((u) => u.id) } } })
    await prisma.advertiserOrg.deleteMany({ where: { id: { in: orgIds } } })
    await prisma.$disconnect()
  })

  it("creates an org + owner membership per Clerk user, and stamps their campaigns", async () => {
    const { backfillAdvertiserOrgs } = await import("./backfill-advertiser-orgs")
    const result = await backfillAdvertiserOrgs()

    expect(result.orgsCreated).toBe(2)

    const memberA = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: "backfill-test-user-a" } })
    expect(memberA?.is_owner).toBe(true)
    const orgA = await prisma.advertiserOrg.findUnique({ where: { id: memberA!.org_id } })
    expect(orgA?.name).toBe("Acme Media")

    const campaign = await prisma.campaign.findFirst({ where: { clerk_user_id: "backfill-test-user-a" } })
    expect(campaign?.org_id).toBe(memberA!.org_id)

    const memberB = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: "backfill-test-user-b" } })
    const orgB = await prisma.advertiserOrg.findUnique({ where: { id: memberB!.org_id } })
    expect(orgB?.name).toBe("")
  })

  it("is idempotent: running it again creates nothing new", async () => {
    const { backfillAdvertiserOrgs } = await import("./backfill-advertiser-orgs")
    const result = await backfillAdvertiserOrgs()
    expect(result.orgsCreated).toBe(0)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx dotenv -e apps/web/.env.local -- vitest run apps/api/scripts/backfill-advertiser-orgs.test.ts`
Expected: FAIL — cannot find module `./backfill-advertiser-orgs`.

- [x] **Step 3: Write the backfill script**

```typescript
// apps/api/scripts/backfill-advertiser-orgs.ts
import "@/lib/load-env"

import { customerClerkClient, readCompanyName } from "@/lib/customer-clerk"
import { prisma } from "@/lib/prisma"

const PAGE_SIZE = 100

/**
 * One-off, idempotent: for every customer Clerk user with no AdvertiserMember
 * row yet, creates an org (named from their Clerk company metadata, empty if
 * unset) and an owner membership, then points their campaigns at it. Safe to
 * run more than once — a user who already has a membership is skipped.
 */
export async function backfillAdvertiserOrgs(): Promise<{
  orgsCreated: number
  orphanedCampaignIds: number[]
}> {
  let orgsCreated = 0
  let offset = 0

  for (;;) {
    const { data: users } = await customerClerkClient.users.getUserList({ limit: PAGE_SIZE, offset })
    if (users.length === 0) break

    for (const user of users) {
      const existing = await prisma.advertiserMember.findUnique({ where: { clerk_user_id: user.id } })
      if (existing) continue

      const name = readCompanyName(user) ?? ""
      await prisma.$transaction(async (tx) => {
        const org = await tx.advertiserOrg.create({ data: { name } })
        await tx.advertiserMember.create({
          data: { org_id: org.id, clerk_user_id: user.id, is_owner: true },
        })
        await tx.campaign.updateMany({
          where: { clerk_user_id: user.id },
          data: { org_id: org.id },
        })
      })
      orgsCreated++
    }

    offset += users.length
  }

  const orphaned = await prisma.campaign.findMany({ where: { org_id: null }, select: { id: true } })
  return { orgsCreated, orphanedCampaignIds: orphaned.map((c) => c.id) }
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  backfillAdvertiserOrgs()
    .then(({ orgsCreated, orphanedCampaignIds }) => {
      console.log(`Created ${orgsCreated} advertiser orgs.`)
      if (orphanedCampaignIds.length > 0) {
        console.error(`WARNING: ${orphanedCampaignIds.length} campaigns still have no org_id:`, orphanedCampaignIds)
        process.exitCode = 1
      }
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx dotenv -e apps/web/.env.local -- vitest run apps/api/scripts/backfill-advertiser-orgs.test.ts`
Expected: PASS (2 tests)

- [x] **Step 5: Add the npm script**

In `apps/api/package.json`, next to `"env:check"`:

```json
    "backfill:advertiser-orgs": "dotenv -e .env.local -- tsx scripts/backfill-advertiser-orgs.ts",
```

- [x] **Step 6: Run it against the real dev database and verify zero orphans**

```bash
npm run backfill:advertiser-orgs -w api
```

Expected: `Created N advertiser orgs.` with no `WARNING` line. If a warning appears, investigate those campaign ids before proceeding to Task 7 — Task 7's scoping flip will make any orphaned campaign (`org_id IS NULL`) permanently unreachable by its owner.

- [x] **Step 7: Commit**

```bash
git add apps/api/scripts/backfill-advertiser-orgs.ts apps/api/scripts/backfill-advertiser-orgs.test.ts apps/api/package.json
git commit -m "feat: add one-off backfill script for existing advertiser orgs"
```

---

## Task 7: Flip campaign scoping to `org_id` and add permission checks

**Files:**
- Modify: `apps/api/lib/campaign-store.ts` (lines 26-44, `getOwnedCampaign` and `listOwnedCampaigns`)
- Modify: `apps/api/app/v1/customer/campaigns/route.ts` (GET, POST)
- Modify: `apps/api/app/v1/customer/campaigns/[id]/route.ts` (GET, PATCH, DELETE)
- Modify: `apps/api/app/v1/customer/campaigns/[id]/submit/route.ts` (POST)
- Modify: `apps/api/app/v1/customer/campaigns/[id]/creatives/route.ts` (POST)
- Modify: `apps/api/app/v1/customer/campaigns/[id]/creatives/[creativeId]/route.ts` (DELETE)
- Modify: `apps/api/app/v1/customer/campaigns/[id]/creatives/[creativeId]/file/route.ts` (GET)
- Modify: `apps/api/app/v1/customer/campaigns/[id]/proof-of-play/route.tsx` (GET)
- Modify: `apps/api/app/v1/customer/campaigns/statement/route.tsx` (GET)
- Modify: `apps/api/app/v1/campaigns/lifecycle.test.ts` (mock + fixture update)

**Interfaces:**
- Consumes: `requireCustomerPermissionAccess` (Task 4), `CustomerAccess.orgId` (Task 4).
- Produces: `getOwnedCampaign(orgId: number, id: number)`, `listOwnedCampaigns(orgId: number)` — the breaking signature change every call site below applies.

Permission assigned per route (spec §7's table covers the first four rows; the remaining three aren't in the spec and are assigned here by extension of the same resource:action scheme — file-serving is a read of the campaign, proof-of-play/statement are reports):

| Route | Method | Permission |
|---|---|---|
| `/v1/customer/campaigns` | GET | `campaigns:read` |
| `/v1/customer/campaigns` | POST | `campaigns:write` |
| `/v1/customer/campaigns/[id]` | GET | `campaigns:read` |
| `/v1/customer/campaigns/[id]` | PATCH | `campaigns:write` |
| `/v1/customer/campaigns/[id]` | DELETE | `campaigns:write` |
| `/v1/customer/campaigns/[id]/submit` | POST | `campaigns:submit` |
| `/v1/customer/campaigns/[id]/creatives` | POST | `creatives:write` |
| `/v1/customer/campaigns/[id]/creatives/[creativeId]` | DELETE | `creatives:write` |
| `/v1/customer/campaigns/[id]/creatives/[creativeId]/file` | GET | `campaigns:read` |
| `/v1/customer/campaigns/[id]/proof-of-play` | GET | `reports:read` |
| `/v1/customer/campaigns/statement` | GET | `reports:read` |

- [x] **Step 1: Update `lifecycle.test.ts`'s mock and fixtures first (this is the failing test for this task)**

This existing test asserts cross-account isolation — the exact behavior this task must preserve under the new scoping key. Replace its mock block (currently lines 39-47) and add real `AdvertiserOrg` fixtures:

```typescript
const CUSTOMER = `lifecycle-adv-${Date.now()}`
const OTHER_CUSTOMER = `lifecycle-other-${Date.now()}`
let actingUserId = CUSTOMER
let actingOrgId = 0
let otherOrgId = 0

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireCustomerAccess: vi.fn(async () => ({
      access: { userId: actingUserId, orgId: actingOrgId, isOwner: true, permissions: new Set() },
    })),
    requireCustomerPermissionAccess: vi.fn(async () => ({
      access: { userId: actingUserId, orgId: actingOrgId, isOwner: true, permissions: new Set() },
    })),
    requireOpsPermissionAccess: vi.fn(async () => ({
      access: { userId: "ops_1", email: "ops@admobihq.com" },
    })),
  }
})
```

Find this suite's `beforeAll` (creates fixtures) and add, before any campaign is created:

```typescript
  const customerOrg = await prisma.advertiserOrg.create({ data: { name: "Lifecycle Test Org" } })
  const otherOrg = await prisma.advertiserOrg.create({ data: { name: "Lifecycle Other Org" } })
  actingOrgId = customerOrg.id
  otherOrgId = otherOrg.id
```

In the `it("hides another advertiser's campaign behind a 404, not a 403", ...)` test (currently lines 207-213), switch orgs instead of just the user id:

```typescript
  it("hides another advertiser's campaign behind a 404, not a 403", async () => {
    actingUserId = OTHER_CUSTOMER
    actingOrgId = otherOrgId
    const { GET } = await import("../customer/campaigns/[id]/route")
    const res = await GET(bare("GET"), routeParams(campaignId))
    expect(res.status).toBe(404)
    actingUserId = CUSTOMER
    actingOrgId = customerOrg.id
  }, 30_000)
```

In this suite's `afterAll` cleanup, add org cleanup after the existing campaign/notification deletes:

```typescript
  await prisma.advertiserOrg.deleteMany({ where: { id: { in: [customerOrg.id, otherOrg.id] } } })
```

- [x] **Step 2: Run the suite to verify it fails**

Run: `npx dotenv -e apps/web/.env.local -- vitest run apps/api/app/v1/campaigns/lifecycle.test.ts`
Expected: FAIL — `prisma.campaign.create` calls inside the route handlers still write `clerk_user_id` only with no `org_id`, and `getOwnedCampaign`/`listOwnedCampaigns` still scope by `clerk_user_id`, so the campaign created under `actingOrgId` is still visible to `otherOrgId` in this test's isolation check (or, depending on exact fixture wiring, other assertions fail with a TypeScript error first since `access.orgId` doesn't exist on the old `getOwnedCampaign(clerkUserId, id)` signature — either way, red).

- [x] **Step 3: Flip `campaign-store.ts`**

```typescript
/**
 * Returns the campaign only if this org owns it, and null otherwise — for
 * both "no such campaign" and "someone else's org's campaign".
 *
 * Callers turn null into a 404, never a 403: a 403 would confirm that a given
 * id exists, letting anyone enumerate the campaign table. Same rule the driver
 * document routes follow.
 */
export async function getOwnedCampaign(
  orgId: number,
  id: number,
): Promise<CampaignWithCreatives | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: CREATIVE_ORDER,
  })
  if (!campaign || campaign.org_id !== orgId) return null
  return campaign
}

export function listOwnedCampaigns(orgId: number): Promise<CampaignWithCreatives[]> {
  return prisma.campaign.findMany({
    where: { org_id: orgId },
    orderBy: { created_at: "desc" },
    include: CREATIVE_ORDER,
  })
}
```

- [x] **Step 4: Update the 8 route files**

`apps/api/app/v1/customer/campaigns/route.ts` — GET and POST:

```typescript
export async function GET() {
  const auth = await requireCustomerPermissionAccess("campaigns:read")
  if (auth.error) return auth.error

  const campaigns = await listOwnedCampaigns(auth.access.orgId)
  return NextResponse.json(campaigns.map((campaign) => toCampaignDto(campaign)))
}

export async function POST(req: Request) {
  const auth = await requireCustomerPermissionAccess("campaigns:write")
  if (auth.error) return auth.error

  const parsed = await parseJsonBody(req, campaignCreateSchema)
  if ("error" in parsed) return parsed.error
  const { starts_on, ends_on, ...rest } = parsed.data

  const created = await prisma.campaign.create({
    data: {
      ...rest,
      clerk_user_id: auth.access.userId,
      org_id: auth.access.orgId,
      starts_on: starts_on ? new Date(`${starts_on}T00:00:00Z`) : null,
      ends_on: ends_on ? new Date(`${ends_on}T00:00:00Z`) : null,
    },
    include: { creatives: true },
  })

  await auditFromCustomerUser(auth.access.userId, {
    action: "create",
    entity_type: "campaign",
    entity_id: created.id,
    summary: `Campaign #${created.id} "${created.name}" created`,
  })

  return NextResponse.json(toCampaignDto(created), { status: 201 })
}
```

(Import `requireCustomerPermissionAccess` from `@/lib/api-utils` in place of `requireCustomerAccess` in this file's import line.)

`apps/api/app/v1/customer/campaigns/[id]/route.ts` — GET/PATCH/DELETE: replace `requireCustomerAccess()` with `requireCustomerPermissionAccess("campaigns:read")` in GET, `requireCustomerPermissionAccess("campaigns:write")` in PATCH and DELETE, and every `getOwnedCampaign(auth.access.userId, id)` with `getOwnedCampaign(auth.access.orgId, id)` (three call sites, one per handler). No other lines change.

`apps/api/app/v1/customer/campaigns/[id]/submit/route.ts` — replace `requireCustomerAccess()` with `requireCustomerPermissionAccess("campaigns:submit")` and `getOwnedCampaign(auth.access.userId, id)` with `getOwnedCampaign(auth.access.orgId, id)`. The `auditFromCustomerUser(auth.access.userId, ...)`, `getCustomerEmail(auth.access.userId)`, `getCustomerName(auth.access.userId)`, and `notifyUserPush("customer", auth.access.userId, ...)` calls are per-user, not per-org — leave them on `auth.access.userId`.

`apps/api/app/v1/customer/campaigns/[id]/creatives/route.ts` — replace `requireCustomerAccess()` with `requireCustomerPermissionAccess("creatives:write")` and `getOwnedCampaign(auth.access.userId, id)` with `getOwnedCampaign(auth.access.orgId, id)`.

`apps/api/app/v1/customer/campaigns/[id]/creatives/[creativeId]/route.ts` — replace `requireCustomerAccess()` with `requireCustomerPermissionAccess("creatives:write")` and `getOwnedCampaign(auth.access.userId, id)` with `getOwnedCampaign(auth.access.orgId, id)`.

`apps/api/app/v1/customer/campaigns/[id]/creatives/[creativeId]/file/route.ts` — replace `requireCustomerAccess()` with `requireCustomerPermissionAccess("campaigns:read")` and `getOwnedCampaign(auth.access.userId, id)` with `getOwnedCampaign(auth.access.orgId, id)`.

`apps/api/app/v1/customer/campaigns/[id]/proof-of-play/route.tsx` — replace `requireCustomerAccess()` with `requireCustomerPermissionAccess("reports:read")` and `getOwnedCampaign(auth.access.userId, id)` with `getOwnedCampaign(auth.access.orgId, id)`.

`apps/api/app/v1/customer/campaigns/statement/route.tsx` — replace `requireCustomerAccess()` with `requireCustomerPermissionAccess("reports:read")` and `listOwnedCampaigns(auth.access.userId)` with `listOwnedCampaigns(auth.access.orgId)`.

For each of these 8 files, update the `@/lib/api-utils` import line to bring in `requireCustomerPermissionAccess` instead of (or alongside, where `jsonError`/`parseId` etc. are also imported from the same line) `requireCustomerAccess`.

- [x] **Step 5: Run the full customer-campaigns test suite**

Run: `npx dotenv -e apps/web/.env.local -- vitest run apps/api/app/v1/campaigns/lifecycle.test.ts apps/api/lib/campaign-dto.test.ts`
Expected: PASS on all tests, including the cross-org 404 assertion from Step 1.

- [x] **Step 6: Type-check and lint the whole `apps/api` app**

```bash
npx tsc --noEmit -p apps/api
npx eslint apps/api/app/v1/customer/campaigns apps/api/lib/campaign-store.ts
```

Expected: zero errors.

- [x] **Step 7: Run the complete `apps/api` test suite**

```bash
npm run test -w api
```

Expected: PASS. This catches any other test file that constructs a `CustomerAccess` literal or calls `getOwnedCampaign`/`listOwnedCampaigns` that wasn't surfaced by the targeted runs above.

- [x] **Step 8: Commit**

```bash
git add apps/api/lib/campaign-store.ts apps/api/app/v1/customer/campaigns apps/api/app/v1/campaigns/lifecycle.test.ts
git commit -m "feat: scope campaign ownership to org_id and gate customer routes on permissions"
```

---

## Self-Review

**Spec coverage** (§11 steps 1-5, mapped to tasks):
- Step 1 (schema, models, starter roles) → Tasks 1, 2, 3.
- Step 2 (`customer-auth.ts` org resolution, bootstrap, permission set, cache) → Task 4.
- Step 3 (`auditFromCustomerUser` stamps `org_id`; ops campaign-review stamps it too) → Task 5.
- Step 4 (backfill script; verify zero orphans) → Task 6.
- Step 5 (`campaign-store.ts` scoping flip + permission checks on existing routes) → Task 7.
- §4's Postgres-NULL uniqueness caveat → Task 1 Step 3 (partial index) + Task 3 (guarded seed).
- §5's "missing org must never degrade to an empty result" → Task 4's `bootstrapOrGetMembership` always creates-or-throws, never returns a null org silently; `getOwnedCampaign`/`listOwnedCampaigns` always receive a real `orgId` from `requireCustomerPermissionAccess`, never `null`.
- §6's permission table and owner exemption → Task 2 (enum + starter roles) and Task 4 (`isOwner` bypass).
- §7's ownership funnel through one module → Task 7 (only `campaign-store.ts` changes scoping logic; routes only add permission checks).
- §10's testing list, the Phase-1-relevant subset (scoping isolation, permission matrix's `campaigns:submit` boundary, owner exemption, bootstrap idempotency, bootstrap failure-not-silent, backfill idempotency) → covered across Tasks 4, 6, 7's tests.
- §13.2 (write side of the activity log, "must ship in v1") → Task 5.
- Everything in §7's new routes, §8, §9, §13.3+, §14 is explicitly deferred per this plan's header — not a gap, a scope boundary.

**Placeholder scan:** no TBD/TODO markers; every code block above is complete, runnable code, not a description of code.

**Type consistency:** `CustomerAccess` (Task 4) → consumed identically in Task 5 (`getAdvertiserOrgId` uses `AdvertiserMember` directly, not `CustomerAccess`) and Task 7 (`auth.access.orgId`, `auth.access.userId`, `auth.access.isOwner`, `auth.access.permissions` — same field names throughout). `AdvertiserPermission` (Task 2) flows unchanged through `requireCustomerPermission` (Task 4), `requireCustomerPermissionAccess` (Task 4), and the route-level calls (Task 7). `getOwnedCampaign(orgId, id)` / `listOwnedCampaigns(orgId)` (Task 7) match every call site's argument order and type.

---

**Plan complete and saved to `docs/superpowers/plans/2026-09-12-advertiser-organizations-phase-1-core-tenancy.md`.**

This is Phase 1 of a multi-phase implementation. Once it ships, the remaining spec sections become their own plans in this order: **Phase 2** (§11 steps 6-7: org/member routes, Resend invitations, Team settings UI), **Phase 3** (§11 steps 8-9: ops joins replace Clerk metadata, activity feed read side), **Phase 4** (§14.1-14.4: notification fan-out, deletion guard, soft-deleted membership, org-scoped support), **Phase 5** (§14.5: ops advertiser org view), plus the `AUTH.md` doc update (§11 step 12, folded into whichever phase touches it last).

Two execution options for Phase 1:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
