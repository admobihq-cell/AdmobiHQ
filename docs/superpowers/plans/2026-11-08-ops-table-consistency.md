# Ops Table Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every hand-built ops list page gets the Drivers/Leads toolbar (search, filters, row checkboxes, CSV/PDF/Excel export), and Campaigns + Driver Applications get bulk approve/reject.

**Architecture:** Pull the toolbar, row-selection and export logic out of `EntityPage` into three shared pieces, move `EntityPage` onto them (no visible change), then adopt them page by page. Bulk review reuses the single-review logic, moved into a shared function per entity that both the single and bulk routes call.

**Tech Stack:** Next.js App Router (apps/api, apps/ops), TanStack Table + Query, Prisma, zod (`@workspace/ops-contracts`), vitest (api + contracts only; apps/ops has no test runner).

**Spec:** `docs/superpowers/specs/2026-11-08-ops-table-consistency-design.md`

**Branch:** stay on `feat/paystack-payments` (owner's call). Another agent may share the worktree: stage by explicit path, never `git add -A`.

## Global Constraints

- Look and behaviour match Drivers/Leads: one toolbar row (search, filters, export) above the table card; a bulk bar appears when rows are selected.
- Export: CSV, PDF, Excel; scope is the rows on screen, or the selected rows. No full-dataset export.
- Bulk approve/reject only on Campaigns and Driver Applications, each behind a confirm dialog that states the count. Bulk reject takes one reason applied to every row.
- Bulk acts only on `submitted` rows; anything else is skipped, not failed. No bulk "request changes".
- Bulk endpoints: same permission as the single route (`campaigns` / `driver_applications`); max 100 ids.
- Every bulk row gets the same status checks, audit row, notification + email, and (campaigns) credit release on reject as a single review.
- Drivers, Fleet, Leads, Waitlist, Media Kit must not change in look or behaviour.
- Commits: no Co-Authored-By trailer (CLAUDE.md).
- Docs: update `docs/api/API.md` and `docs/ops/OPS-ADMIN.md` in the task that changes the behaviour.
- After code changes run `graphify update .`.

## Facts found while planning (differences from the spec)

- Already accept `search`: campaigns, advertiser-orgs, support, safety-incidents, audit, users (as `query`). **Only driver-applications and announcements (`/v1/notifications` → `listAnnouncementBroadcasts`) need it added.**
- Team and Roles are small unpaginated lists, so they search and filter client-side. Integrations and Content drafts also do this (they receive their data as props).
- **Notifications is a feed (`NotificationFeed`), not a table. It's out of scope.**
- Campaigns "market" filter dropped: campaign `search` already matches `market`. Status is the only filter.
- PDF export (`/v1/ops/documents/export`) authorises on `entity: OpsPermission`. Users, Admins, Team, Roles and Integrations are admin-only pages with no matching permission, so Task 2 adds an `"admin"` entity. Advertiser Orgs uses `"campaigns"` (its list route requires that permission).

## Review Focus

1. **Bulk reject with an empty or whitespace reason** should give a 400 before any row changes. Test in Task 3.
2. **A mixed selection (submitted + approved + already rejected)** should update the submitted rows, skip the rest with a reason each, and leave approved rows approved (no walk-back). Tests in Tasks 3 and 4.
3. **101 ids, or duplicate ids** should give a 400 for 101; duplicates are deduped and each row is reviewed once (one email). Test in Task 3.
4. **One row whose email send throws** should not stop the remaining rows from being updated (notifications stay fire-and-forget per row). Test in Task 3.
5. **Search or filter changes while rows are selected** should clear the selection, so no hidden rows get exported or approved. This is handled in `useRowSelection` (Task 1) and checked manually in Task 6.

---

### Task 1: Extract shared toolbar, selection and export; move EntityPage onto them

**Files:**
- Create: `apps/ops/lib/table-export.ts`
- Create: `apps/ops/lib/use-row-selection.tsx`
- Create: `apps/ops/components/ui/table-toolbar.tsx`
- Modify: `apps/ops/components/entity/entity-page.tsx` (export handlers ~L298–431, select column ~L451–471, toolbar JSX ~L509–640)
- Modify: `docs/ops/OPS-ADMIN.md` (short "List page toolbar" section)
- Modify: `docs/superpowers/specs/2026-11-08-ops-table-consistency-design.md` (append a dated addendum with the "Facts found while planning" list above)

**Interfaces:**
- Produces:
  - `type ExportFormat = "csv" | "pdf" | "xlsx"`
  - `type ExportColumn<T> = { key: string; header: string; value: (row: T) => string | number | null }`
  - `async function exportTableRows<T>(opts: { format: ExportFormat; title: string; scope: "selected" | null; columns: ExportColumn<T>[]; rows: T[]; entity: DocumentExportRequest["entity"]; client: ReturnType<typeof useOpsClient> }): Promise<void>`. It contains the CSV/PDF/Excel logic now inlined in EntityPage (`toCsv`/`downloadCsv`, `client.documents.exportPdf` + `downloadPdf`, `buildStyledXlsx` + `downloadBlob`, `exportFileName`). It toasts errors via `formatApiError` and toasts `Exported N record(s)` when `scope === "selected"`, exactly as today.
  - `function useRowSelection<T extends { id: number }>(rows: T[], resetKey: unknown): { selectedIds: Set<number>; selectedRows: T[]; count: number; clear: () => void; selectColumn: ColumnDef<T, any> }`. `selectColumn` is the existing checkbox column (header select-all-on-page with indeterminate state, cell with `stopPropagation`). The selection clears whenever `JSON.stringify(resetKey)` changes.
  - `function TableToolbar(props: { search?: { value: string; onChange: (v: string) => void; placeholder?: string }; filters?: React.ReactNode; onExport: (f: ExportFormat) => void; exportDisabled?: boolean; actions?: React.ReactNode })`. This is the existing toolbar row: search input with icon, then `filters`, then the Export dropdown (Excel / PDF / CSV, same order and labels), then `actions`.
  - `function BulkBar(props: { count: number; onExport: (f: ExportFormat) => void; busy?: boolean; children?: React.ReactNode })`. This is the existing "N selected" bar: `children` (bulk action buttons) go before the "Export selected" dropdown.
  - `function FilterSelect(props: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; allLabel: string })`. This is the existing Radix Select, using the `__all__` sentinel so `""` means "all".

- [ ] **Step 1: Create the three files** with the interfaces above, moving code out of `entity-page.tsx` instead of rewriting it.
- [ ] **Step 2: Refactor `EntityPage`** to use them. Its `ColumnDef.csv` maps to `ExportColumn.value`; pass `entity: apiPathToPermission(apiPath)`; `resetKey = [page, pageSize, search, statusFilter, apiPath]`. Note this adds `statusFilter` to the reset key; today a status change doesn't clear the selection, which is Review Focus #5. Keep the "Add" button and the status-bulk dropdown as `actions`/`children`.
- [ ] **Step 3: Verify.** Run `npm run typecheck -w ops && npm run lint -w ops`. Expected: no errors.
- [ ] **Step 4: Manual check.** Run `npm run dev -w ops`. On Drivers and Leads: search, the status filter, select all, export page and export selected in all three formats, and bulk status all behave as before. Changing the status filter now clears the selection.
- [ ] **Step 5: Docs.** Add a "List page toolbar" section to `OPS-ADMIN.md` (what search/filter/select/export do, export scope = page or selection). Append the dated addendum to the spec.
- [ ] **Step 6: Commit.**

```bash
git add apps/ops/lib/table-export.ts apps/ops/lib/use-row-selection.tsx apps/ops/components/ui/table-toolbar.tsx apps/ops/components/entity/entity-page.tsx docs/ops/OPS-ADMIN.md docs/superpowers/specs/2026-11-08-ops-table-consistency-design.md docs/superpowers/plans/2026-11-08-ops-table-consistency.md
git commit -m "refactor(ops): extract shared table toolbar, selection and export from EntityPage"
```

---

### Task 2: PDF export for admin-only pages

**Files:**
- Modify: `packages/ops-contracts/src/schemas.ts:311` (`documentExportRequestSchema`)
- Modify: `apps/api/app/v1/ops/documents/export/route.tsx:16`
- Test: `apps/api/app/v1/ops/documents/export/route.test.ts`
- Modify: `docs/api/API.md` (export route row)

**Interfaces:**
- Produces: `documentExportRequestSchema.entity` becomes `z.enum([...OPS_PERMISSIONS, "admin"])`, so `DocumentExportRequest["entity"]` accepts `"admin"`.

- [ ] **Step 1: Failing tests** in `route.test.ts`, following its existing mocks:
  - `it("lets an ops admin export with entity 'admin'")`: with `requireOpsAdminAccess` mocked to allow, a POST with `{ entity: "admin", title: "Team", headers: ["Name"], rows: [["A"]] }` returns 200 and `content-type` `application/pdf`.
  - `it("refuses entity 'admin' to a non-admin")`: with `requireOpsAdminAccess` mocked to return a 403 error, the POST returns 403.
- [ ] **Step 2: Run** `npm test -w api -- documents/export`. Expected: both new tests FAIL (schema rejects `"admin"`).
- [ ] **Step 3: Implement.** Extend the enum. In the route, use `entity === "admin" ? await requireOpsAdminAccess() : await requireOpsPermissionAccess(entity)`.
- [ ] **Step 4: Run** `npm test -w api -- documents/export && npm run typecheck -w @workspace/ops-contracts`. Expected: PASS.
- [ ] **Step 5: Docs + commit.**

```bash
git add packages/ops-contracts/src/schemas.ts apps/api/app/v1/ops/documents/export/route.tsx apps/api/app/v1/ops/documents/export/route.test.ts docs/api/API.md
git commit -m "feat(api): allow admin-only pages to export PDFs"
```

---

### Task 3: Shared campaign review + bulk endpoint

**Files:**
- Create: `apps/api/lib/campaigns/review-campaign.ts`
- Modify: `apps/api/app/v1/campaigns/[id]/review/route.ts` (body moves into the shared function; route becomes auth → parse → call → map result)
- Create: `apps/api/app/v1/campaigns/bulk-review/route.ts`
- Test: `apps/api/app/v1/campaigns/bulk-review/route.test.ts`
- Modify: `packages/ops-contracts/src/schemas.ts` (next to `campaignReviewSchema`)
- Modify: `packages/ops-api-client/src/index.ts` (`campaigns` type ~L236 and impl ~L678)
- Modify: `docs/api/API.md` (campaigns table ~L205)

**Interfaces:**
- Produces (contracts):
  - `bulkReviewSchema = z.object({ ids: z.array(z.number().int().positive()).min(1).max(100), decision: z.enum(["approved", "rejected"]), reason: z.string().trim().min(1).max(2000).optional() }).refine(b => b.decision === "approved" || !!b.reason, { message: "A reason is required to reject", path: ["reason"] })`
  - `type BulkReviewInput = z.infer<typeof bulkReviewSchema>`
  - `type BulkReviewResult = { updated: number[]; skipped: { id: number; error: string }[] }`
- Produces (api): `async function reviewCampaign(access: <the `access` type requireOpsPermissionAccess returns — reuse its exported type or `Extract<Awaited<ReturnType<typeof requireOpsPermissionAccess>>, { access: unknown }>["access"]`>, id: number, input: { decision: "approved" | "rejected" | "changes_requested"; reason?: string }, opts?: { allowUnapprove?: boolean }): Promise<{ ok: true; campaign: CampaignDto } | { ok: false; status: 404 | 409 | 400; error: string }>`. `allowUnapprove` defaults to `true` (single route unchanged). The error strings are the existing ones verbatim. Notifications, email and credit release stay inside it, wrapped in try/catch exactly as now.
- Produces (route): `POST /v1/campaigns/bulk-review` with body `BulkReviewInput`, returning `200 BulkReviewResult`. It dedupes ids and calls `reviewCampaign(..., { allowUnapprove: false })` sequentially. `ok: false` goes to `skipped` with its `error`.
- Produces (client): `campaigns.bulkReview(body: BulkReviewInput) => Promise<BulkReviewResult>`

- [ ] **Step 1: Failing tests** in `bulk-review/route.test.ts`. Copy the live-DB setup from `apps/api/app/v1/ops/finance/transactions/route.test.ts` (`testDatabaseUrl`, `describe.skipIf`, mocked `requireOpsPermissionAccess`, mocked `@/lib/email/send-email` and `@/lib/advertiser/advertiser-notify`, tagged rows cleaned up in `afterAll`). Seed one org and four campaigns: two `submitted`, one `approved`, one `rejected`, each with a tagged `contact_email` so the email path runs.
  - `"approves only submitted campaigns and skips the rest"`: POST `{ ids: [s1, s2, approved, rejected], decision: "approved" }` returns `updated` equal to `[s1, s2]`, and `skipped.map(s => s.id)` equal to `[approved, rejected]`. The DB shows s1 and s2 `approved` and `rejected` still `rejected`.
  - `"never walks back an approved campaign"`: POST `{ ids: [approved], decision: "rejected", reason: "x" }` puts that id in `skipped`, and the DB status stays `approved`.
  - `"requires a reason to reject"`: `{ ids: [s1], decision: "rejected" }` and `{ ..., reason: "   " }` both return 400, and s1's status is unchanged.
  - `"rejects more than 100 ids"`: 101 ids returns 400.
  - `"dedupes ids"`: `{ ids: [s1, s1], decision: "approved" }` gives `updated` `[s1]`, and `sendEmail` was called once.
  - `"keeps going when one email fails"`: `sendEmail` mocked to throw on its first call. Two submitted ids approved means both are in `updated`.
  - `"writes one audit row per updated campaign"`: count `auditLog` rows for the ids before and after (or mock `auditFromOpsUser` and assert the call count equals `updated.length`).
  - `"requires the campaigns permission"`: with the permission mock denying, the response is 403.
- [ ] **Step 2: Run** `npm test -w api -- bulk-review`. Expected: FAIL (route missing). If there's no local DB URL the suite skips; run `npm run env:pull -w api` first.
- [ ] **Step 3: Implement** the schema, `reviewCampaign`, the slimmed single route, the bulk route and the client method.
- [ ] **Step 4: Run** `npm test -w api -- campaigns` (also runs `lifecycle.test.ts`, which covers the single route). Expected: all PASS.
- [ ] **Step 5: Docs + commit.**

```bash
git add apps/api/lib/campaigns/review-campaign.ts "apps/api/app/v1/campaigns/[id]/review/route.ts" apps/api/app/v1/campaigns/bulk-review packages/ops-contracts/src/schemas.ts packages/ops-api-client/src/index.ts docs/api/API.md
git commit -m "feat(api): bulk approve/reject campaigns"
```

---

### Task 4: Shared driver-application review + bulk endpoint + search

**Files:**
- Create: `apps/api/lib/driver/review-driver-application.ts`
- Modify: `apps/api/app/v1/driver-applications/[id]/review/route.ts`
- Create: `apps/api/app/v1/driver-applications/bulk-review/route.ts`
- Modify: `apps/api/app/v1/driver-applications/route.ts` (add `search`)
- Test: `apps/api/app/v1/driver-applications/bulk-review/route.test.ts`
- Modify: `packages/ops-api-client/src/index.ts` (`driverApplications` type ~L225 and impl ~L657)
- Modify: `docs/api/API.md` (row ~L39)

**Interfaces:**
- Consumes: `bulkReviewSchema`, `BulkReviewInput`, `BulkReviewResult` (Task 3).
- Produces: `async function reviewDriverApplication(access, id, input, opts?: { allowUnapprove?: boolean })`, with the same result shape as `reviewCampaign` but carrying `profile: DriverProfileDto`.
- Produces: `POST /v1/driver-applications/bulk-review`, which works the same way as Task 3.
- Produces: `GET /v1/driver-applications?search=` matches `full_name`, `phone` and `city`, case-insensitive `contains`, using `OR` the same way as `app/v1/campaigns/route.ts:28-35`.
- Produces (client): `driverApplications.bulkReview(body)`, and `driverApplications.list` passes `params.search` through `buildListQueryParams`.

- [ ] **Step 1: Failing tests.** Use the same seed pattern as Task 3, but with `driverProfile` rows. Cover the same mixed-selection, no-walk-back, reason-required and permission cases, plus:
  - `"notifies each approved driver"`: two submitted ids approved creates 2 `driverNotification` rows with type `application_approved` for those `clerk_user_id`s.
  - `"list search matches name, phone and city"`: GET `?search=<unique tag in full_name>` returns only that row, and the same works for a tagged `city`.
- [ ] **Step 2: Run** `npm test -w api -- driver-applications`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test -w api -- driver-applications`. Expected: PASS.
- [ ] **Step 5: Docs + commit.**

```bash
git add apps/api/lib/driver/review-driver-application.ts "apps/api/app/v1/driver-applications/[id]/review/route.ts" apps/api/app/v1/driver-applications/bulk-review apps/api/app/v1/driver-applications/route.ts packages/ops-api-client/src/index.ts docs/api/API.md
git commit -m "feat(api): bulk review and search for driver applications"
```

---

### Task 5: Bulk review UI on Campaigns and Driver Applications

**Files:**
- Create: `apps/ops/components/review/bulk-review-actions.tsx`
- Modify: `apps/ops/app/(dashboard)/campaigns/campaigns-view.tsx`
- Modify: `apps/ops/app/(dashboard)/driver-applications/driver-applications-view.tsx`
- Modify: `docs/ops/OPS-ADMIN.md` (bulk review paragraph)

**Interfaces:**
- Consumes: `TableToolbar`, `BulkBar`, `FilterSelect`, `useRowSelection`, `exportTableRows` (Task 1); `campaigns.bulkReview`, `driverApplications.bulkReview`, `driverApplications.list({ search })` (Tasks 3–4).
- Produces: `function BulkReviewActions(props: { count: number; noun: string; onApprove: () => Promise<BulkReviewResult>; onReject: (reason: string) => Promise<BulkReviewResult>; onDone: () => void })`. It renders "Approve" and "Reject" buttons. Each opens an AlertDialog: approve says `Approve ${count} ${noun}?`, and reject says `Reject ${count} ${noun}?` with a required reason Textarea (confirm is disabled while the trimmed reason is empty). On success it toasts `${updated.length} approved` / `${updated.length} rejected`, plus `, ${skipped.length} skipped (not in review)` when any were skipped, then calls `onDone`, which clears the selection and invalidates the list query.

- [ ] **Step 1: Build `BulkReviewActions`.**
- [ ] **Step 2: Campaigns view.** Add `TableToolbar` with a debounced search (250 ms, like `advertiser-orgs-view.tsx:89-95`), `FilterSelect` for the existing `STATUS_FILTERS`, and export (`entity: "campaigns"`, with `ExportColumn`s for submitted, name, advertiser, market, flight, budget, creatives and status). Prepend `selectColumn`, and put a `BulkBar` containing `BulkReviewActions noun="campaigns"` above the table. Reset key: `[page, pageSize, status, debouncedSearch]`.
- [ ] **Step 3: Driver Applications view.** Do the same, with `noun="applications"` and `entity: "driver_applications"`.
- [ ] **Step 4: Verify.** Run `npm run typecheck -w ops && npm run lint -w ops`. Expected: clean.
- [ ] **Step 5: Manual check against local API + dev DB.** Bulk approve two submitted rows plus one approved row: the toast reads "2 approved, 1 skipped (not in review)". Reject with an empty reason: the confirm button stays disabled. Changing search or the filter clears the selection. Export works in all three formats.
- [ ] **Step 6: Docs + commit.**

```bash
git add apps/ops/components/review/bulk-review-actions.tsx "apps/ops/app/(dashboard)/campaigns/campaigns-view.tsx" "apps/ops/app/(dashboard)/driver-applications/driver-applications-view.tsx" docs/ops/OPS-ADMIN.md
git commit -m "feat(ops): toolbar and bulk approve/reject on campaigns and driver applications"
```

---

### Task 6: Toolbar on server-paginated pages

**Files (all under `apps/ops`):**
- Modify: `app/(dashboard)/advertiser-orgs/advertiser-orgs-view.tsx` (search only; export `entity: "campaigns"`)
- Modify: `app/(dashboard)/activity/activity-view.tsx` (move existing filters into `filters`; search via `client.audit.list({ search })`; export `entity: "activity"`)
- Modify: `app/(dashboard)/sos/sos-view.tsx` (move existing search + filters in; export `entity: "safety"`)
- Modify: `app/(dashboard)/support/support-view.tsx` (move existing search + filters in; export `entity: "support"`)
- Modify: `components/users/platform-users-view.tsx` (move existing search in; export `entity: "admin"`)

**Interfaces:**
- Consumes: Task 1 pieces; `"admin"` entity (Task 2).

- [ ] **Step 1: Convert each page.** Use the existing search/filter state (don't change query params or debounce timings that already exist). Replace the loose inputs with `TableToolbar`/`FilterSelect`, prepend `selectColumn`, add `BulkBar` (export only, no children), and pass the page's current filters plus search plus page into `resetKey`. `ExportColumn`s mirror each page's visible columns.
- [ ] **Step 2: Verify.** Run `npm run typecheck -w ops && npm run lint -w ops`. Expected: clean.
- [ ] **Step 3: Manual check.** On each of the 5 pages, the toolbar sits in the same place as on Drivers, search and filters still narrow the list, and export works for the page and for the selection.
- [ ] **Step 4: Commit.**

```bash
git add "apps/ops/app/(dashboard)/advertiser-orgs/advertiser-orgs-view.tsx" "apps/ops/app/(dashboard)/activity/activity-view.tsx" "apps/ops/app/(dashboard)/sos/sos-view.tsx" "apps/ops/app/(dashboard)/support/support-view.tsx" apps/ops/components/users/platform-users-view.tsx
git commit -m "feat(ops): shared toolbar on advertiser orgs, activity, SOS, support and users"
```

---

### Task 7: Announcements search + toolbar

**Files:**
- Modify: `apps/api/app/v1/notifications/route.ts` (read `search`)
- Modify: `apps/api/lib/queries/entities.ts` (`listAnnouncementBroadcasts`: case-insensitive `contains` on the title and body fields)
- Test: `apps/api/app/v1/notifications/route.test.ts` (create, using the live-DB pattern)
- Modify: `packages/ops-api-client/src/index.ts` (`notifications.list` passes `search`)
- Modify: `apps/ops/app/(dashboard)/announcements/announcements-view.tsx`
- Modify: `docs/api/API.md`

**Interfaces:**
- Consumes: Task 1 pieces.
- Produces: `GET /v1/notifications?search=`

- [ ] **Step 1: Failing test.** `"search narrows broadcasts by title"`: seed two broadcasts with tagged titles, then GET `?search=<tag-a>` returns only the first.
- [ ] **Step 2: Run** `npm test -w api -- notifications`. Expected: FAIL.
- [ ] **Step 3: Implement** the API and client changes.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Convert the announcements view** (debounced search, select, export `entity: "announcements"`). The existing per-row delete stays as it is, and there's no bulk delete (non-goal).
- [ ] **Step 6: Verify.** Run `npm run typecheck -w ops && npm run lint -w ops`, then do a manual check.
- [ ] **Step 7: Docs + commit.**

```bash
git add apps/api/app/v1/notifications/route.ts apps/api/app/v1/notifications/route.test.ts apps/api/lib/queries/entities.ts packages/ops-api-client/src/index.ts "apps/ops/app/(dashboard)/announcements/announcements-view.tsx" docs/api/API.md
git commit -m "feat: search and shared toolbar on announcements"
```

---

### Task 8: Toolbar on client-side lists

**Files (all under `apps/ops`):**
- Modify: `components/users/admins-view.tsx`
- Modify: `components/team/team-view.tsx`
- Modify: `components/team/roles-view.tsx`
- Modify: `app/(dashboard)/settings/(prefs)/integrations/integrations-view.tsx`
- Modify: `components/content/content-drafts-table.tsx`

**Interfaces:**
- Consumes: Task 1 pieces; `"admin"` entity (Task 2). Content drafts export uses `entity: "content"`.

- [ ] **Step 1: Convert each page.** Search filters the in-memory rows with a case-insensitive `includes` on the visible text columns (`useMemo`). Add a `FilterSelect` only where the row has a status or role field. Selection, export and the reset key work the same as in Task 6. Keep existing sort headers (`DataTableSortHeader`) and per-row actions as they are.
- [ ] **Step 2: Verify.** Run `npm run typecheck -w ops && npm run lint -w ops`. Expected: clean.
- [ ] **Step 3: Manual check** on all 5 pages, then run `graphify update .`.
- [ ] **Step 4: Commit.**

```bash
git add apps/ops/components/users/admins-view.tsx apps/ops/components/team/team-view.tsx apps/ops/components/team/roles-view.tsx "apps/ops/app/(dashboard)/settings/(prefs)/integrations/integrations-view.tsx" apps/ops/components/content/content-drafts-table.tsx
git commit -m "feat(ops): shared toolbar on admins, team, roles, integrations and content drafts"
```
