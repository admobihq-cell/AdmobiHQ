# Ops table consistency — design

Date: 2026-11-08
Status: draft, awaiting approval

## Why

Ops has two kinds of list page. Drivers, Fleet, Leads, Waitlist and Media Kit
are built on the shared `EntityPage` component
(`apps/ops/components/entity/entity-page.tsx`) and all get the same toolbar:
search, status filter, row checkboxes with bulk actions, and export to
CSV / PDF / Excel. Every other list page was hand-built and has some subset of
that, or none of it. Advertiser Orgs is the visible example: a loose search box
above a plain table, no filter, no select, no export.

The owner's ask: every ops table page should look and work like Drivers and
Leads. Success is opening any list page in ops and finding the same toolbar in
the same place, doing the same things.

## Goals

1. Every page below gets the Drivers/Leads toolbar and table treatment:
   - search box
   - filters (status at minimum, plus one or two obvious ones per page)
   - row checkboxes with a select-all-on-page header checkbox
   - export to CSV, PDF and Excel — whole visible page, or just the selected rows
   - the same pagination control (`TablePagination`) where the list is paginated
2. Review pages (Campaigns, Driver Applications) also get **bulk approve** and
   **bulk reject** on selected rows.
3. Drivers, Fleet, Leads, Waitlist and Media Kit keep working exactly as they do.

Pages in scope (all under `apps/ops`):

| Page | File | Has today |
|---|---|---|
| Advertiser Orgs | `app/(dashboard)/advertiser-orgs/advertiser-orgs-view.tsx` | search |
| Campaigns | `app/(dashboard)/campaigns/campaigns-view.tsx` | status filter |
| Driver Applications | `app/(dashboard)/driver-applications/driver-applications-view.tsx` | status filter |
| Announcements | `app/(dashboard)/announcements/announcements-view.tsx` | — |
| Activity | `app/(dashboard)/activity/activity-view.tsx` | filters |
| SOS | `app/(dashboard)/sos/sos-view.tsx` | search, filters |
| Support | `app/(dashboard)/support/support-view.tsx` | search, filters |
| Users (platform) | `components/users/platform-users-view.tsx` | search |
| Admins | `components/users/admins-view.tsx` | — |
| Team | `components/team/team-view.tsx` | — |
| Roles | `components/team/roles-view.tsx` | — |
| Notifications | `app/(dashboard)/notifications/notifications-view.tsx` | — |
| Integrations | `app/(dashboard)/settings/(prefs)/integrations/integrations-view.tsx` | — |
| Content drafts | `components/content/content-drafts-table.tsx` | — |

## Non-goals

- Driver dashboards and charts redesign. Separate project, brainstormed after this one.
- Server-side "export everything matching the filter" across all pages. Export
  stays what Drivers does today: the rows on screen, or the selected rows.
- Bulk delete on pages where single delete doesn't already exist.
- Changing what any detail page (`/campaigns/[id]`, `/driver-applications/[id]`, …) does.
- Ops-mobile.

## Anti-goals (failure even if it "works")

- A bulk action that skips the rules the single action enforces: reject without
  a reason, approving something that isn't in `submitted`, no audit row, no
  email/notification to the affected advertiser or driver.
- Bulk approve/reject without a confirm step showing how many rows it touches.
- Drivers/Leads behaviour or look changing as a side effect.
- Each page growing its own slightly-different copy of the toolbar again.

## Decided

- **Look:** match Drivers and Leads — one toolbar row (search, filters, export,
  and a bulk bar when rows are selected) above the table card, same spacing and
  components.
- **Export:** CSV, PDF and Excel, for the visible page or the selected rows,
  using the same helpers `EntityPage` uses today (`toCsv`/`downloadCsv`,
  `documents.exportPdf`, the Excel blob path, `exportFileName`).
- **Review pages:** select → export, bulk approve, bulk reject. Both bulk
  actions behind a confirm dialog that states the count.
- **Bulk reject takes one reason** typed once in the confirm dialog, applied to
  every selected row (the single-review endpoint requires a reason).

## How (builder's starting point)

### Shared pieces, not a forced migration (Claude's call)

Most in-scope pages can't just become `EntityPage`: it's built around
create/edit/delete with a modal form (`renderForm`) and a generic `bulk`
resource endpoint. Campaigns, Driver Applications, SOS and Support are review
queues whose rows open their own detail pages.

So: extract the toolbar, selection and export logic out of `EntityPage` into
reusable pieces (e.g. a toolbar component, a row-selection hook that adds the
checkbox column to the TanStack `DataTable`, and export helpers that take
column definitions with a `csv` accessor). `EntityPage` is refactored to use
those same pieces, so there is exactly one toolbar implementation. Then each
in-scope page adopts them.

Exact component boundaries are the builder's call.

### API work

- **Search:** some list endpoints don't accept `search` yet. Already supported:
  campaigns, advertiser-orgs, support. Missing at least: driver-applications,
  users, team, roles, notifications; check the rest (announcements, activity,
  SOS, admins, integrations, content) as you go. Add a case-insensitive
  `contains` search on the obvious text fields, matching how
  `app/v1/campaigns/route.ts` does it.
- **Small, unpaginated lists** (Roles, Team, Integrations, likely Admins) may
  search/filter client-side instead of adding API params — builder's call per page.
- **Bulk review endpoints:** add bulk approve/reject for campaigns and driver
  applications. Move the body of each single review route
  (`app/v1/campaigns/[id]/review/route.ts`,
  `app/v1/driver-applications/[id]/review/route.ts`) into a shared function
  and have both the single and bulk routes call it per id, so status checks,
  reason requirement, audit, notifications/emails and (for campaigns) the
  credit-release on reject stay identical. Rows not in a reviewable state are
  skipped, not failed; the response reports `{ updated, skipped }` and the UI
  toasts both counts.
- **Bulk only acts on `submitted` rows (Claude's call).** The single route
  also allows walking back an already-approved item; bulk does not — approved
  rows are skipped. Walk-backs stay a one-at-a-time action on the detail page.
- **No bulk "request changes" (Claude's call).** Only approve and reject were
  asked for; request-changes stays on the detail page.
- **Same permission as the single route** (`campaigns` /
  `driver_applications`), and the bulk body is capped at 100 ids (the largest
  page size) since each row sends an email.
- Contracts for any new params/endpoints go in `packages/ops-contracts`, and
  client methods in the ops API client, following existing patterns.

### Filters per page (Claude's guesses — builder can adjust)

- Campaigns: status, market
- Driver Applications: status
- Advertiser Orgs: none beyond search unless the DTO has an obvious one
- Support: status, priority (already present — move into the toolbar)
- SOS: status (already present — move into the toolbar)
- Activity: keep its existing filters, move into the toolbar
- Users/Admins/Team: role or status if the data has it
- Others: status if the data has one, otherwise search only

## Testing

- Unit tests for the extracted shared function behind single + bulk review
  (skipped rows, reason required on reject, audit written per row).
- Route tests for the new bulk endpoints and any new `search` params,
  following existing `*.test.ts` patterns in `apps/api`.
- Manual pass: every in-scope page shows the toolbar; export produces a file in
  all three formats; Drivers and Leads unchanged.

## Docs

Per CLAUDE.md: document the bulk review endpoints and new `search` params in
`docs/api`, and the shared ops table toolbar behaviour in `docs/ops`, in the
same change.

## Left to the builder

- Component/hook names and file layout for the extracted pieces.
- Which text fields each new `search` param matches.
- Client-side vs server-side search/filter for small unpaginated lists.
- Order of page migration.

## Addendum — 2026-11-08 (planning findings)

- Already accept `search`: campaigns, advertiser-orgs, support, safety-incidents, audit, users (as `query`). Only driver-applications and announcements (`/v1/notifications`) needed it added.
- Team and Roles are small unpaginated lists, so they search and filter client-side. Integrations and Content drafts do the same (their data comes in as props).
- Notifications is a feed (`NotificationFeed`), not a table, so it's out of scope.
- Campaigns "market" filter dropped: campaign search already matches `market`.
- PDF export authorises on `entity: OpsPermission`. The admin-only pages (Users, Admins, Team, Roles, Integrations) use a new `"admin"` entity. Advertiser Orgs uses `"campaigns"`.
