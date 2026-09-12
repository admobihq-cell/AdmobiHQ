# Advertiser Organizations — Phase 3: Ops Joins & Activity Feed

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stop reading advertiser company names from Clerk metadata (join `AdvertiserOrg` instead), and ship the org-scoped activity feed read API + settings UI.

**Architecture:** Ops campaign/user DTOs resolve `company` / `company_name` via `AdvertiserMember → AdvertiserOrg`. Activity is a fail-closed allowlisted projection over `AuditEvent` — never `toAuditEventDto`. Cursor pagination on `(created_at, id)`.

**Tech Stack:** Same as Phase 1–2. Branch: `feat/advertiser-orgs-phase-1-core-tenancy`.

**Spec:** [docs/superpowers/specs/2026-09-07-advertiser-organizations-design.md](../specs/2026-09-07-advertiser-organizations-design.md) §8 (ops joins), §11 steps 8–9, §13.3–13.6.

## Global Constraints

- Activity DTO must **never** include `actor_email`, `actor_user_id`, or raw `summary`.
- Allowlist only — unknown triples are invisible.
- `ops_user` actors render as `"Admobi review team"`.
- Campaign review labels use `Campaign.review_reason`, not audit summary.
- `activity:read` required (Owner + Manager via starter roles / owner bypass).
- Keep Clerk `companyName` write at advertiser sign-up only as bootstrap seed for `getCustomerCompanyName` during lazy org create; delete `apps/customer-web/lib/company-name.ts` if unused. Ops must not read Clerk for company display.
- Soft-delete / fan-out / ops org page remain Phase 4–5.

---

### Task 1: Resolve org name helpers + wire ops/campaign reads

**Files:**
- Create: `apps/api/lib/advertiser-org-name.ts` — `getOrgNameForClerkUser`, `getOrgNameForOrgId`, `getOrgNamesForClerkUsers(ids)`
- Modify: `apps/api/lib/platform-users.ts`, `apps/api/app/v1/campaigns/[id]/route.ts`, `apps/api/app/v1/campaigns/[id]/review/route.ts`
- Update `toCampaignDto` comment

### Task 2: Delete unused `company-name.ts` if nothing imports it

### Task 3: Activity contracts + allowlist + DTO builder

**Files:**
- `packages/ops-contracts/src/advertiser-activity.ts` — `AdvertiserActivityItemDto`, cursor query schema
- `apps/api/lib/advertiser-activity.ts` — allowlist, `toAdvertiserActivityItem`, cursor encode/decode

Allowlist triples (actor_type, action, entity_type):
- customer/create/campaign
- customer/update/campaign (includes submit — same action today)
- ops_user/update/campaign (review)
- customer/create/campaign_creative
- customer/delete/campaign_creative
- customer/create/advertiser_invitation
- customer/delete/advertiser_invitation
- customer/update/advertiser_member
- customer/delete/advertiser_member
- customer/update/advertiser_org
- customer/update/advertiser_invitation (accept)

### Task 4: `GET /v1/customer/org/activity`

Cursor: `created_at` desc, `id` desc. Query `?cursor=&limit=20`.

### Task 5: customer-web + customer-mobile Activity UI in settings

### Task 6: Docs (AUTH.md activity note)

---

**Plan complete.** Implement on the current branch.

---

## Status addendum (2026-09-12)

Phase 3 implemented on `feat/advertiser-orgs-phase-1-core-tenancy`:

- Ops/campaign company name from `AdvertiserOrg` join (not Clerk)
- Deleted unused `apps/customer-web/lib/company-name.ts`
- `GET /v1/customer/org/activity` allowlist + advertiser DTO
- Settings → Activity on customer-web and customer-mobile
- AUTH.md updated
