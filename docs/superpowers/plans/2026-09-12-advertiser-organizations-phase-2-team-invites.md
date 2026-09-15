# Advertiser Organizations — Phase 2: Team Invites & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship org/member management APIs, Resend invitation emails, and Team settings UI on customer-web and customer-mobile — turning Phase 1's silent tenancy into inviting teammates.

**Architecture:** Postgres-backed invites (SHA-256 token hash, same as support-case tokens). Routes under `/v1/customer/org/**` mirror ops `/v1/team` shape but never call Clerk Organizations. Accept uses identity-only auth (no lazy bootstrap) so the invitee joins the inviting org instead of getting a solo org. Member removal is hard-delete in this phase (soft-delete deferred to Phase 4). Same branch as Phase 1: `feat/advertiser-orgs-phase-1-core-tenancy`.

**Tech Stack:** Next.js App Router (`apps/api`, `apps/customer-web`), Expo (`apps/customer-mobile`), Prisma, Resend (`apps/api/lib/email`), Vitest, `@workspace/ops-contracts`.

**Spec:** [docs/superpowers/specs/2026-09-07-advertiser-organizations-design.md](../specs/2026-09-07-advertiser-organizations-design.md) — this plan implements §7's new routes, §8 client changes (Team + CompanyNamePrompt repoint), and invite email. Soft-delete (§14.3), activity feed (§13.3), notification fan-out (§14.1), and ops org view (§14.5) are **out of scope**.

## Decisions locked in planning

- Branch: continue on `feat/advertiser-orgs-phase-1-core-tenancy` / PR #125
- Clients: API + customer-web + customer-mobile in one plan
- Member remove: hard-delete (Phase 4 does soft-delete)
- Approach: mirror ops team routes; separate web/mobile UIs (no shared Team package)

## Global Constraints

- **No Clerk Organizations** on the customer instance. Never call `customerClerkClient.organizations.*`.
- **One org per user** — `AdvertiserMember.clerk_user_id` `@unique`. Accept while already a member → `409` with clear copy.
- **Last-owner protection** — demote/remove last `is_owner` → `409`.
- **Owner bypass** — `is_owner` skips permission checks; Owner is not a starter-role row. Invites assign Manager/Member/Viewer only.
- **Accept must not bootstrap** — use identity-only auth so the first membership row is the invited org, not a solo org created by `getCustomerAccess`.
- **Invalidate permission cache** on role change / remove / accept (Phase 1 left a 60s TTL comment calling this out).
- **Hide Team UI** when org has one member and zero pending invites (solo advertisers never see org chrome).
- **Hard-delete members** — `prisma.advertiserMember.delete`, not `removed_at`.

---

## File Structure

| File | Responsibility |
|---|---|
| `packages/ops-contracts/src/advertiser-org.ts` | DTOs + zod schemas for org/members/invites/roles |
| `packages/ops-contracts/src/enums.ts` | Add `advertiser_org`, `advertiser_member`, `advertiser_invitation` audit entity types |
| `apps/api/lib/customer-auth.ts` | `requireCustomerIdentity()`, `invalidateAdvertiserAccessCache()` |
| `apps/api/lib/advertiser-invite-token.ts` | generate + hash invite tokens (wrap support-token pattern) |
| `apps/api/lib/email/templates/AdvertiserOrgInvite.tsx` | Resend invite email |
| `apps/api/app/v1/customer/org/**` | Org + members + invites + roles routes |
| `apps/customer-web/lib/org-client.ts` | Authed fetch helpers |
| `apps/customer-web` Team settings + `/invitations/[token]` accept page | UI |
| `apps/customer-mobile` Team settings + invite deep link | UI |
| `docs/shared/AUTH.md`, `docs/customer/APP.md`, `docs/customer/APP-MOBILE.md` | Living docs |

---

### Task 1: Contracts — DTOs, schemas, audit entity types

**Files:**
- Create: `packages/ops-contracts/src/advertiser-org.ts`
- Modify: `packages/ops-contracts/src/index.ts`, `packages/ops-contracts/src/enums.ts`
- Test: `packages/ops-contracts/src/advertiser-org.test.ts`

**Interfaces:**
- Produces: `AdvertiserOrgDto`, `AdvertiserMemberDto`, `AdvertiserInvitationDto`, `AdvertiserRoleDto`, `AdvertiserOrgMembersDto`, `advertiserOrgRenameSchema`, `advertiserInviteSchema`, `advertiserMemberUpdateSchema`

- [ ] **Step 1: Add audit entity types** to `AUDIT_ENTITY_TYPES`: `"advertiser_org"`, `"advertiser_member"`, `"advertiser_invitation"`

- [ ] **Step 2: Write contracts + export from index**

```typescript
// packages/ops-contracts/src/advertiser-org.ts
import { z } from "zod"

export const advertiserOrgRenameSchema = z.object({
  name: z.string().trim().min(1).max(120),
})
export type AdvertiserOrgRenameInput = z.infer<typeof advertiserOrgRenameSchema>

export const advertiserInviteSchema = z.object({
  email: z.string().trim().email(),
  roleId: z.number().int().positive(),
})
export type AdvertiserInviteInput = z.infer<typeof advertiserInviteSchema>

export const advertiserMemberUpdateSchema = z.object({
  roleId: z.number().int().positive().nullable(),
  isOwner: z.boolean().optional(),
})
export type AdvertiserMemberUpdateInput = z.infer<typeof advertiserMemberUpdateSchema>

export type AdvertiserOrgDto = {
  id: number
  name: string
  memberCount: number
}

export type AdvertiserMemberDto = {
  id: number
  clerkUserId: string
  email: string | null
  name: string | null
  isOwner: boolean
  roleId: number | null
  roleName: string | null
  joinedAt: string
}

export type AdvertiserInvitationDto = {
  id: number
  email: string
  roleId: number | null
  roleName: string | null
  createdAt: string
  expiresAt: string
  status: "pending" | "accepted" | "revoked" | "expired"
}

export type AdvertiserRoleDto = {
  id: number
  name: string
  permissions: string[]
}

export type AdvertiserOrgMembersDto = {
  members: AdvertiserMemberDto[]
  invitations: AdvertiserInvitationDto[]
}
```

- [ ] **Step 3: Test rename/invite schema happy paths; commit**

```bash
git add packages/ops-contracts
git commit -m "feat: add advertiser org team contracts and audit entity types"
```

---

### Task 2: Auth helpers — identity-only + cache invalidate

**Files:**
- Modify: `apps/api/lib/customer-auth.ts`
- Test: `apps/api/lib/customer-auth.test.ts` (extend)

**Interfaces:**
- Produces: `requireCustomerIdentity(): Promise<{ userId: string }>`, `invalidateAdvertiserAccessCache(userId: string): void`

- [ ] **Step 1: Export identity resolve** (reuse existing bearer verify; no bootstrap, no org lookup)
- [ ] **Step 2: Export `invalidateAdvertiserAccessCache`** — delete cache entry for `userId`
- [ ] **Step 3: Test identity does not create membership; commit**

```bash
git commit -m "feat: identity-only customer auth and permission cache invalidation"
```

---

### Task 3: Invite token + email template

**Files:**
- Create: `apps/api/lib/advertiser-invite-token.ts`
- Create: `apps/api/lib/email/templates/AdvertiserOrgInvite.tsx`
- Test: `apps/api/lib/advertiser-invite-token.test.ts`

- [ ] **Step 1: Token helpers** — re-export/wrap `generateAccessToken` / `hashAccessToken` from `support-token.ts` (or duplicate thin wrappers named for invites)
- [ ] **Step 2: Email template** — org name, inviter label, CTA to `{NEXT_PUBLIC_APP_URL}/invitations/{token}`
- [ ] **Step 3: Commit**

```bash
git commit -m "feat: advertiser org invite token helpers and email template"
```

---

### Task 4: Org API routes

**Files:**
- Create routes under `apps/api/app/v1/customer/org/`:
  - `route.ts` — GET, PATCH
  - `members/route.ts` — GET, POST
  - `members/[id]/route.ts` — PATCH, DELETE
  - `invitations/[invitationId]/route.ts` — DELETE (revoke)
  - `invitations/accept/[token]/route.ts` — POST accept
  - `roles/route.ts` — GET
- Test: `apps/api/app/v1/customer/org/org.test.ts`

**Permission table:** as in spec §7. Invite TTL: 7 days.

**Accept rules:**
1. `requireCustomerIdentity()` only
2. Hash token, find invite where `token_hash` matches, `revoked_at` null, `accepted_at` null, `expires_at` > now → else 404/410
3. If `AdvertiserMember` exists for userId → 409 `"already belongs to an organization"`
4. Create member with invite's `role_id`, `is_owner: false`; set `accepted_at`; invalidate cache; audit

**Last-owner:** before DELETE or PATCH that clears `is_owner`, count other owners in org; if zero remain → 409.

**Invite POST:** validate `roleId` is a starter role (`org_id` null); upsert/replace pending row for `(org_id, email)` if revoked/expired; send email (failure after DB write → still 201, log error — same pattern as campaign submit).

- [ ] **Step 1: Failing integration tests** (last-owner 409, accept joins without solo org, cross-org 404, Member cannot team:manage)
- [ ] **Step 2: Implement routes**
- [ ] **Step 3: Tests pass; commit**

```bash
git commit -m "feat: customer org, member, and invitation API routes"
```

---

### Task 5: customer-web — Team settings, accept page, CompanyNamePrompt

**Files:**
- Create: `apps/customer-web/lib/org-client.ts`
- Create: `apps/customer-web/components/settings/team-settings-view.tsx`
- Create: `apps/customer-web/app/(shell)/settings/(prefs)/team/page.tsx`
- Create: `apps/customer-web/app/(auth)/invitations/[token]/page.tsx` (or equivalent outside heavy shell fetches)
- Modify: `settings-navigation.ts`, `account-settings-view.tsx` (drop company field), `company-name-prompt.tsx` (PATCH `/v1/customer/org`)

**UI rules:**
- Team nav item only shown when `memberCount > 1 || pendingInvites > 0` OR user has `team:manage` (owners always can open to invite) — simplest: show Team for anyone with `team:manage` or `org:manage`; hide invite/remove controls without `team:manage`. Spec: "Hidden entirely when the org has one member and no pending invites" — implement that gate after fetching GET `/org` + members when permitted; owners with solo org still need a way to invite — **show Team section for `team:manage` holders even when solo** so they can send the first invite (spec's hide rule applies to non-managers; owners hold `team:manage`).
- Accept page: signed-out → sign-in redirect back; signed-in → POST accept → redirect `/settings/team` or `/`

- [ ] **Step 1–N: Implement client + UI; manual smoke; commit**

```bash
git commit -m "feat(customer-web): Team settings, invite accept, org-name prompt"
```

---

### Task 6: customer-mobile — Team settings + invite link

**Files:**
- Create org client + team screen under settings
- Handle `app.admobihq.com/invitations/...` / deep link if existing linking config supports it; otherwise open via WebBrowser / in-app WebView to web accept URL

- [ ] **Step 1–N: Implement; commit**

```bash
git commit -m "feat(customer-mobile): Team settings and invite acceptance"
```

---

### Task 7: Docs

**Files:** `docs/shared/AUTH.md`, `docs/customer/APP.md`, `docs/customer/APP-MOBILE.md` — document Team routes, invite flow, hard-delete note, Phase 4 soft-delete still pending.

```bash
git commit -m "docs: document advertiser Team invites on web and mobile"
```

---

## Self-Review

- Spec §7 new routes → Task 4
- Spec §8 Team + CompanyNamePrompt + drop account company field → Task 5–6
- Last-owner + one-org 409 → Task 4 tests
- Soft-delete / activity / fan-out / ops view → explicitly deferred
- Cache invalidation → Task 2 + call sites in Task 4

---

**Plan complete.** Execution: implement task-by-task on the current Phase 1 branch.

---

## Status addendum (2026-09-12)

Phase 2 implemented on `feat/advertiser-orgs-phase-1-core-tenancy` in the same session as planning:

- Contracts + audit entity types
- `requireCustomerIdentity` + cache invalidation
- `/v1/customer/org/**` routes + invite email + accept (identity-only)
- customer-web Team settings, `/invitations/[token]`, CompanyNamePrompt → PATCH org
- customer-mobile Team settings screen
- AUTH.md updated

Member hard-delete as decided; soft-delete remains Phase 4.
