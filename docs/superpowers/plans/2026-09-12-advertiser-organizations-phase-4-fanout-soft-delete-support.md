# Advertiser Organizations — Phase 4: Fan-out, Soft-delete, Deletion Guard, Support

> **For agentic workers:** Use subagent-driven-development or executing-plans.

**Goal:** Fix team-introduced defects: notify the whole org on campaign decisions/submits, soft-delete members, block sole-owner account deletion (with transfer / org delete), and scope support cases by org.

**Spec:** [2026-09-07-advertiser-organizations-design.md](../specs/2026-09-07-advertiser-organizations-design.md) §14.1–14.4. Branch: `feat/advertiser-orgs-phase-1-core-tenancy`.

**Out of scope:** §14.5 ops org view (Phase 5).

## Tasks

1. Schema: `AdvertiserMember.removed_at`, `SupportCase.org_id` (+ indexes/FKs); `db push` + migration SQL
2. Soft-delete: all membership lookups `removed_at: null`; DELETE member sets `removed_at`; invite accept reactivates; removed users get 403
3. Fan-out: `notifyOrgMembers(orgId, permission, …)` for review + submit inbox/push (email stays contact/author)
4. `POST /v1/customer/org/transfer-ownership`, `GET …/deletion-status`, `POST …/delete-organization`; account settings UI
5. Support create stamps `org_id`; list includes org cases when `support:read_all`
6. Docs AUTH.md

---

## Status addendum (2026-09-12)

Implemented on the Phase 1 branch:

1. Schema: `AdvertiserMember.removed_at`, `SupportCase.org_id` + migration `20260912210000_advertiser_orgs_phase_4`
2. Soft-delete membership across auth, member lists, org-name lookups; DELETE sets `removed_at`; invite accept reactivates
3. `fanOutCustomerCampaignNotice` on campaign submit + review (inbox/push; email stays contact)
4. `GET …/deletion-status`, `POST …/transfer-ownership`, `POST …/delete-organization`; account settings sole-owner guard + delete-org; Team “Make owner” on web + mobile
5. Support create stamps `org_id`; `support:read_all` sees org cases
6. AUTH.md updated

**Out of scope (Phase 5):** §14.5 ops advertiser-org list/detail.
