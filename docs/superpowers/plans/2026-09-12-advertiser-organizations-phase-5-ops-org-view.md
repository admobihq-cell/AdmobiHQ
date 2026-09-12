# Advertiser Organizations — Phase 5: Ops org view

> **For agentic workers:** Use subagent-driven-development or executing-plans.

**Goal:** Ops list + detail for advertiser orgs (members/roles, campaigns, activity) per design §14.5.

**Spec:** [2026-09-07-advertiser-organizations-design.md](../specs/2026-09-07-advertiser-organizations-design.md) §14.5. Branch: `feat/advertiser-orgs-phase-1-core-tenancy`.

**Permission decision:** Gate on existing ops permission `campaigns` (not a new `advertisers` entry). Campaign reviewers are the primary audience for “who else is on this account?”; avoids role-seed churn.

## Tasks

1. Contracts: ops list item + detail DTOs (`packages/ops-contracts`)
2. API: `GET /v1/advertiser-orgs`, `GET /v1/advertiser-orgs/[id]` (`requireOpsPermissionAccess("campaigns")`)
3. `ops-api-client` + ops web list/detail pages + nav
4. Optional: `org_id` on campaign DTO so detail can link to the org
5. Docs: `docs/ops/OPS-ADMIN.md`, `docs/api/API.md`, AUTH.md if needed

---

## Status addendum (2026-09-12)

Implemented on the Phase 1 branch:

1. Contracts: `OpsAdvertiserOrgListItemDto` / `OpsAdvertiserOrgDetailDto`; campaign DTO gains `org_id`
2. API: `GET /v1/advertiser-orgs`, `GET /v1/advertiser-orgs/[id]` (`campaigns` permission)
3. Ops web: sidebar **Advertiser orgs**, list + detail; campaign Company links to org
4. Docs: API.md, OPS-ADMIN.md, AUTH.md
5. Tests: `advertiser-orgs.test.ts`

**Permission:** reused `campaigns` (not a new `advertisers` OpsPermission).
