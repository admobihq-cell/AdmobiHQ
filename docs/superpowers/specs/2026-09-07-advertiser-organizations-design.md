# Advertiser Organizations & RBAC — Design

**Date:** 2026-09-07
**Status:** Approved for planning
**Scope:** `apps/customer-web`, `apps/customer-mobile`, `apps/api`, `apps/ops`, `apps/web/prisma`

Replaces the individual-user advertiser account model with an organization as
the primary tenant, and adds role-based access control for advertiser teams.

Related: [AUTH.md](../../shared/AUTH.md) · [ROADMAP.md](../../shared/ROADMAP.md) §7 milestone 2

---

## 1. Problem

Advertiser identity today is a single Clerk user. Everything an advertiser owns
— campaigns, creatives, notifications — is scoped by `clerk_user_id`. There is
no way to add a second person to an account.

The system already *behaves* as though advertisers are companies without
modelling one:

- `<AdvertiserSignUp>` collects a company name.
- `<CompanyNamePrompt>` re-demands it on first load for anyone who skipped it.
- The ops **Users** list renders a **Company** column.
- Campaign review carries `CampaignDto.company_name`.

That value lives in Clerk's `unsafeMetadata.companyName`, which is
**client-writable by design**. An advertiser can rewrite their own company name
from the browser console, and ops renders it into an internal review screen as
if it were authoritative. Introducing a real tenant closes that trust boundary,
in addition to enabling teams.

### Secondary problem: ops reads company names N+1 from Clerk

`getCustomerCompanyName` in `apps/api/lib/customer-clerk.ts` resolves a company
name from Clerk per campaign, at read time, best-effort. Moving tenancy into
Postgres turns that into a join.

---

## 2. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Solo advertisers | **Always an org.** Org auto-created at first authenticated request; solo advertiser is an org of one and never sees org UI until they invite someone. | One ownership rule everywhere. A user-or-org branch in every query and permission check never goes away once introduced. "Convert to org" becomes a UI reveal, not a migration. |
| Multi-org membership | **Not in v1.** One org per advertiser user, enforced by a unique constraint. | No switcher UI, no active-org state on web or mobile, `org_id` resolves unambiguously. Relaxing it later is a constraint swap (§9). |
| Where tenancy lives | **Postgres owns it. Clerk does identity only.** No Clerk Organizations on the customer instance. | Three reasons, §3. |
| RBAC | **In v1**, Postgres-backed, with seeded starter roles. | Clerk org roles are `admin`/`member` and cannot express "drafts campaigns but cannot submit". Ops already solved this the same way with `OpsRole`. |
| Auth provider | **Stay on Clerk.** Revisit Better Auth separately, never in this change. | §3.3. |

---

## 3. Approach: Clerk for identity, Postgres for tenancy

Clerk keeps issuing sessions and handling email OTP and Google SSO for the
customer instance. Organizations, membership, roles and invitations become
Prisma models. Clerk never learns that organizations exist.

### 3.1 Why not Clerk Organizations

1. **Cost, caused by our own design.** Because *every* advertiser gets an org,
   monthly-active-orgs would track monthly-active-users on the customer
   instance. Clerk meters organizations separately from users. The "always an
   org" decision would roughly double the customer-instance bill if it were
   implemented with Clerk Organizations.
2. **It doesn't cover the RBAC requirement anyway.** `org:admin` / `org:member`
   is two tiers. The permission split we need (§6) is finer, so a Postgres role
   table gets built regardless — at which point Clerk-side membership is
   half-redundant.
3. **Ops precedent.** Ops already runs exactly this shape: Clerk for the coarse
   tier, `OpsRole` + `OpsRoleAssignment` in Postgres for permissions.

### 3.2 Why not mirror Clerk orgs into Postgres via webhooks

The repo has **no Clerk webhook handler and no `svix` dependency**. Adding
signature-verified webhook intake introduces a new failure mode — a missed
event leaves an advertiser who exists in Clerk with no tenant row, failing every
one of their queries — and doing that *as part of* an auth refactor compounds
risk. Owning tenancy outright avoids sync entirely: our own code writes those
rows, transactionally, at the moments that create them.

### 3.3 Why Better Auth is out of scope for this change

Evaluated and deferred, not rejected:

- **Blast radius.** Clerk spans six apps (`@clerk/nextjs` in api, customer-web,
  driver-web, ops; `@clerk/clerk-expo` in customer-mobile, driver-mobile,
  ops-mobile) across three instances, plus three mobile token caches, Google SSO
  redirect flows, `verifyToken` in three API modules, and `listPlatformUsers`,
  which reads users from Clerk rather than Postgres.
- **Debuggability.** Changing the tenancy model and the session layer at once
  means an empty campaign list has two possible causes and no way to bisect.
- **The cost saving is smaller than it looks.** Better Auth is database-backed.
  Our Neon instance is already the largest compute-hour driver in the stack
  (shared with self-hosted n8n). Moving auth in-house shifts spend from Clerk's
  invoice to the Neon bill, with every session validation becoming a query.

**This design is nonetheless the hedge.** After it ships, organizations,
membership, roles and invitations are ours. A future provider migration touches
session issuance and token verification only — `apps/api/lib/customer-auth.ts`
and the `components/auth/*` forms — not tenancy. To preserve that seam, no
route outside those modules may import `@clerk/*` directly.

Not pursued: consolidating the three production Clerk instances to cut base
fees. [AUTH.md §2](../../shared/AUTH.md) records that the split was deliberate,
removing a domain-primary/satellite conflict and all role-mismatch handling.

---

## 4. Data model

New models in `apps/web/prisma/schema.prisma`. All additive.

```prisma
/// An advertiser tenant. Created automatically for every advertiser — a solo
/// advertiser is an org of one and never sees org UI. Name is seeded from the
/// company name collected at sign-up and is editable in settings.
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
/// role belonging to one org.
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
```

> **Postgres NULL caveat on `@@unique([org_id, name])`.** Postgres treats NULLs
> as distinct in unique indexes, so this constraint does **not** prevent two
> starter roles both named `"Manager"` with `org_id = null`. Custom roles are
> protected; the seeded ones are not. The seed must therefore guard on
> `WHERE org_id IS NULL AND name = $1` rather than relying on an upsert, or add
> a partial unique index (`CREATE UNIQUE INDEX ... ON advertiser_roles (name)
> WHERE org_id IS NULL`). Prefer the partial index — it makes the seed
> idempotent by construction.

```prisma

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

/// A pending invitation. Delivered by Resend (apps/api/lib/email), not Clerk.
/// Only the hash of the token is stored, matching SupportCase.access_token_hash.
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

`Campaign` gains:

```prisma
  org_id Int?
  org    AdvertiserOrg? @relation(fields: [org_id], references: [id])

  @@index([org_id, created_at])
```

`clerk_user_id` on `Campaign` is **kept** in v1 — it is the backfill source and
records which individual authored the campaign. Dropping it is a later change.

`CustomerNotification` stays user-scoped in v1. Notifications are addressed to a
person, not a company.

### Migration mechanics

The Neon database is shared with self-hosted n8n, so schema changes ship as
**additive SQL plus `prisma db pull`/generate**, never `prisma migrate` against
the shared instance. Every column added here is nullable or defaulted, so the
SQL is safe to apply before the code that reads it.

---

## 5. Bootstrap and backfill

### New advertisers

Org creation is **lazy and server-side**, in `requireCustomerAccess()`: the first
authenticated request from a `clerk_user_id` with no `AdvertiserMember` row
creates the org and an owner membership in one transaction. Lazy rather than at
sign-up because it covers the Google SSO round-trip, the email-code path, and
pre-existing users with one code path and no client cooperation.

The org name is seeded from `unsafeMetadata.companyName` when present. When it
is absent — a Google sign-up that skipped the optional field — the org is created
with an empty name and `<CompanyNamePrompt>` still fires, unchanged in behaviour,
but writing through `PATCH /v1/customer/org` instead of `user.update()`.

Keeping the prompt is deliberate: it already solves the first-load ordering race
against the product tour (`autoStartReady` in `<TourProvider>`), and deleting it
would mean reinventing "this org has no name yet" from scratch.

**A missing org must never degrade to an empty result.** Scoping a query to
`org_id = null` would silently return zero campaigns and look like data loss. The
bootstrap either succeeds or the request fails loudly.

### Existing advertisers

A one-off script, run once after the SQL lands:

1. For every customer Clerk user, create an `AdvertiserOrg` named from their
   `unsafeMetadata.companyName` (empty if unset) and an owner
   `AdvertiserMember`.
2. `UPDATE campaigns SET org_id = (owner's org) WHERE clerk_user_id = ...`.
3. Report any campaign row left with `org_id IS NULL`.

Idempotent — re-running creates nothing new, because `clerk_user_id` on
`AdvertiserMember` is unique.

---

## 6. Permissions and starter roles

Closed set, exported from `packages/ops-contracts/src/enums.ts` alongside
`OpsPermission`:

```
campaigns:read · campaigns:write · campaigns:submit ·
creatives:write · reports:read ·
billing:read · billing:write ·
team:manage · org:manage
```

**Deliberate deviation from the ops convention.** `OpsPermission` is flat and
section-shaped (`leads`, `fleet`, `finances`). Advertiser roles need a verb split
that a section-level flag cannot express — the whole point is separating "drafts
a campaign" from "submits it and commits spend". `resource:action` is used here
and *not* retrofitted onto `OpsPermission`.

`campaigns:submit` is the money boundary. Anything that commits spend or changes
who has access is owner-only by default.

### Seeded starter roles (`org_id = null`)

| Role | Permissions | Intended for |
|---|---|---|
| **Manager** | `campaigns:read`, `campaigns:write`, `campaigns:submit`, `creatives:write`, `reports:read`, `billing:read` | Runs campaigns end to end. Cannot change payment details or the team. |
| **Member** | `campaigns:read`, `campaigns:write`, `creatives:write`, `reports:read` | Drafts and edits. Cannot submit — no spend authority. |
| **Viewer** | `campaigns:read`, `reports:read` | Read-only stakeholder or client contact. |

**Owner** is not a role row. `is_owner = true` members bypass permission checks
and hold every permission implicitly, mirroring how `org:admin` is exempt in ops.
Custom roles (`org_id` set) are deferred — see §9.

`billing:write`, `team:manage` and `org:manage` are held only by owners in v1;
they exist in the enum so custom roles can grant them later without a migration.

### Enforcement

`resolveAdvertiserAccess()` in `apps/api/lib/customer-auth.ts` extends the
existing `CustomerAccess` union:

```ts
export type CustomerAccess =
  | { status: "unauthenticated" }
  | { status: "authorized"; userId: string; orgId: number; isOwner: boolean;
      permissions: Set<AdvertiserPermission> }
```

Cached 60s per user, the same shape and TTL as `resolveOpsPermissions()`.
`requireCustomerPermission(perm)` mirrors `requireOpsPermission()` and returns
`403` with the failing permission named.

---

## 7. Ownership scoping

Campaign ownership already funnels through **one module** —
`getOwnedCampaign()` and the list query in `apps/api/lib/campaign-store.ts`.
Scoping changes from `clerk_user_id` to `org_id` there, not in fifteen routes.

Route handlers change only to add a permission check:

| Route | Added check |
|---|---|
| `GET /v1/customer/campaigns`, `GET .../[id]` | `campaigns:read` |
| `POST /v1/customer/campaigns`, `PATCH .../[id]` | `campaigns:write` |
| `POST .../[id]/submit` | `campaigns:submit` |
| `POST/DELETE .../[id]/creatives*` | `creatives:write` |

New routes:

| Route | Permission | Purpose |
|---|---|---|
| `GET /v1/customer/org` | any authenticated member | Org name, member count |
| `PATCH /v1/customer/org` | `org:manage` | Rename the org |
| `GET /v1/customer/org/members` | `team:manage` | Member + pending invite list |
| `POST /v1/customer/org/members` | `team:manage` | Invite by email + role |
| `PATCH/DELETE /v1/customer/org/members/[id]` | `team:manage` | Change role, remove |
| `POST /v1/customer/org/invitations/[token]/accept` | authenticated | Accept an invite |
| `GET /v1/customer/org/roles` | `team:manage` | List assignable roles |

Modelled on the existing `/v1/team` and `/v1/roles` handlers.

**Last-owner protection.** An org must always retain at least one owner.
Demoting or removing the last owner returns `409`, exactly as
`PATCH /v1/team/[userId]` refuses to demote the last ops admin.

**Invite acceptance and the one-org rule.** Accepting an invitation while
already a member of another org fails with a clear `409` ("already belongs to an
organization"), since `AdvertiserMember.clerk_user_id` is unique. This is the
v1 boundary surfacing, and the message must say so rather than leaking a
constraint violation.

Every mutation writes an audit event through `auditFromCustomerUser()`, with new
entity types `advertiser_org`, `advertiser_member`, `advertiser_invitation`.

---

## 8. Client and ops changes

**customer-web / customer-mobile**

- Settings gains a **Team** section: member list, role selector, invite form,
  pending invites. Hidden entirely when the org has one member and no pending
  invites, so solo advertisers never see org UI.
- `<AccountSettingsView>` drops the company field; org name moves to a new org
  settings surface gated on `org:manage`.
- `<CompanyNamePrompt>` retained, repointed at `PATCH /v1/customer/org`.
- `apps/customer-web/lib/company-name.ts` is deleted once nothing writes
  `unsafeMetadata.companyName`.
- Actions the current user lacks permission for are hidden, not merely
  server-rejected — but the server check remains authoritative.

**ops**

- `getCustomerCompanyName` and `toPlatformUserDto`'s company column read
  `AdvertiserOrg.name` via join instead of Clerk metadata, removing the per-row
  Clerk call.
- Campaign review gains the org name on `CampaignDto` from the same join.

**Docs** — `docs/shared/AUTH.md` §5 ("Customer and driver instances have **no**
organization concept") becomes wrong on merge and is updated in the same change,
per `CLAUDE.md`.

---

## 9. Explicitly out of scope

Each is additive on top of this model, with the migration path noted:

- **Multi-org membership and an org switcher.** Drop the unique on
  `AdvertiserMember.clerk_user_id`, add `@@unique([org_id, clerk_user_id])`, add
  active-org state on web and Expo.
- **Custom per-org roles.** The `org_id` column on `AdvertiserRole` already
  exists; this is CRUD plus UI. Starter roles are not deletable in v1, so the
  "reassign members before deleting a role" guard that `/v1/roles/[roleId]`
  enforces for ops is deferred with it.
- **Moving media, reports and wallet to org scope.** Same one-column pattern as
  `Campaign`, once those APIs are backend-backed.
- **A Better Auth migration.** §3.3.
- **Billing entity.** `Customer` remains the support/announcement record it is
  today. When Pesapal invoicing needs a billing tenant, it points at
  `AdvertiserOrg`.

---

## 10. Testing

- `campaign-store` scoping: a member of org A cannot read, edit, or submit a
  campaign belonging to org B — `getOwnedCampaign` returns null, routes 404.
- Permission matrix: each starter role against each guarded route, asserting the
  allowed set and a `403` with the failing permission named for the rest. The
  `Member` role failing `campaigns:submit` is the case that matters most.
- Owner exemption: an owner with `role_id = null` passes every check.
- Bootstrap idempotency: concurrent first requests from one new user create
  exactly one org (unique constraint on `clerk_user_id` is the guard).
- Bootstrap failure surfaces as an error, never an empty campaign list.
- Last-owner protection: demote and remove both return `409`.
- Invite acceptance by a user who already has an org returns `409` with the
  documented message.
- Backfill script: idempotent across two runs; leaves no campaign with
  `org_id IS NULL`.

---

## 11. Suggested sequencing

1. Schema SQL + Prisma models + seeded starter roles.
2. `customer-auth.ts` — org resolution, lazy bootstrap, permission set, cache.
3. Backfill script; run and verify zero orphaned campaigns.
4. `campaign-store.ts` scoping flip + permission checks on existing routes.
5. Org and member routes + Resend invitation email.
6. Client: Team settings, org name, `<CompanyNamePrompt>` repoint.
7. Ops joins replace Clerk metadata reads; `company-name.ts` deleted.
8. `AUTH.md` updated.

Steps 1–4 are shippable on their own: they make advertisers org-scoped with
no user-visible change. Steps 5–6 turn on teams.

---

## 12. Why drivers are deliberately excluded

Asked and decided during design: drivers do **not** get this model, and fleet
partners must never share the advertiser `Organization` tables.

**Advertiser orgs are a tenancy problem; fleet is a relationship problem.**
Advertiser members are peers over a shared pool — a campaign has no existence
independent of its org, so symmetric access is the right default. A fleet owner
and a driver are two independent actors with partly conflicting interests. The
driver's account predates and outlives any fleet relationship, drivers move
between fleets, and many own their vehicle and belong to no fleet.

**The concrete hazard.** `DriverProfile` holds `national_id_number`, `kra_pin`,
`payout_mpesa_msisdn` and `payout_bank_account`; `DriverDocument` holds National
ID scans, KRA PIN certificates and payout proof; `SafetyIncident` is keyed by
`driver_clerk_user_id`. Modelling a fleet as an org whose members are drivers
would, by the default org semantics defined in this document, place all of that
inside the fleet owner's tenant. A fleet owner needs visibility into vehicles
and earnings, never into a driver's identity documents or safety incidents.

**The missing primitive is `Vehicle`, not `Organization`.** No `Vehicle` model
exists in the schema. Campaigns play out on vehicles, fleets own vehicles, and
drivers are assigned to them over time. The eventual shape is
`FleetPartner → Vehicle → driver assignment (with start/end dates)`, earnings
attaching to the vehicle-driver pair. Building fleet-as-org would substitute an
organization for a vehicle.

**It is also not yet needed.** `FleetPartner` is a marketing lead-capture table
with no `clerk_user_id` and no login, fed by `apps/web/app/(marketing)/partner-fleet`
and triaged in ops — the same shape as the `Driver` lead table. There is no fleet
product to attach auth to. Drivers additionally have no team-access motivation:
a driver account is one person.

**Explicitly rejected:** a shared `Organization` table with a `type`
discriminator serving both advertisers and fleets. That yields one table with
two incompatible permission models and a branch in every query — the dual-model
problem §2 eliminated, reintroduced one level up.

**Carried forward for whenever a fleet portal is built:** put fleet partners on
the existing driver Clerk instance and distinguish the actor with a Postgres
row, rather than provisioning a fourth billable Clerk instance. Same reasoning
as §3.1.
