# Ops "Users" Page — Drivers / Customers / Admins

Date: 2026-08-21
Status: Approved

## Problem

The ops console has no single place to see everyone who has an account
across the platform's three separate Clerk instances (ops, driver,
customer). `/team` exists but only covers ops staff. There is no way
to browse driver-app or customer-app accounts from ops today.

## Context

Three fully isolated Clerk applications exist, each with its own keys
and no shared session (`docs/shared/AUTH.md` §2):

- **Ops** — `apps/ops`, keys already present in ops (`CLERK_SECRET_KEY`,
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_ORG_ID`).
- **Driver** — separate instance; `apps/api` already holds
  `DRIVER_CLERK_SECRET_KEY` and a `driverClerkClient`
  (`apps/api/lib/driver-clerk.ts`).
- **Customer** — separate instance; keys (`CUSTOMER_CLERK_SECRET_KEY`,
  `NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY`) currently only used by
  `apps/customer-web`. No admin client for this instance exists yet
  anywhere in the repo.

No code in the repo today calls `clerkClient.users.getUserList()` for
listing/pagination — the only precedents are `apps/api/app/v1/team/route.ts`
(org membership list, ops instance) and `driverClerkClient.users.getUser(id)`
(single lookup, driver instance).

Role representation is fragmented: ops has Clerk org roles
(`org:admin`/`org:member`) plus a DB-backed `OpsRole`/`OpsRoleAssignment`.
Driver and Customer have no role field — "driver" vs "customer" is
determined by which Clerk instance the account lives in, not a metadata
flag. Neither `Driver` nor `Customer` Prisma models have a populated
link to a Clerk user id (per `AUTH.md`), so this page is Clerk-account
data only, not joined against CRM records.

## Decisions

1. **Credential boundary**: `apps/api` is the only place that holds
   driver/customer Clerk secret keys. `apps/ops` never gets
   `DRIVER_CLERK_SECRET_KEY` or `CUSTOMER_CLERK_SECRET_KEY` directly —
   it calls `apps/api` like it already does for other resources.
2. **Admins tab**: reuses the existing `/team` data source
   (`GET /v1/team`, ops org members) rather than a separate query. No
   changes to `/team` itself; it keeps its invite/remove/role controls.
   The new Admins tab here is read-only.
3. **Scope**: view-only. No ban/unban/impersonate actions from this
   page in this iteration.
4. **Location & UX**: new top-level route `/users`, sibling to `/team`,
   with search (by name/email) and cursor-based pagination on the
   Drivers and Customers tabs.

## Architecture

```
Browser (ops)
  -> useOpsClient()  [attaches ops Clerk session token]
     -> apps/api  GET /v1/users?type=drivers|customers&query=&cursor=
          -> requireOpsAccess()  [verifies ops-instance token]
          -> driverClerkClient.users.getUserList(...)   (type=drivers)
             customerClerkClient.users.getUserList(...) (type=customers)
          -> mapped DTO -> { users, nextCursor }
     -> apps/api  GET /v1/team  [existing, unchanged]      (Admins tab)
```

All three Clerk secret keys stay server-side; only `apps/api` holds the
driver and customer ones. `apps/ops` continues to hold only its own
ops-instance keys.

## Backend (apps/api)

- **New** `apps/api/lib/customer-clerk.ts` — mirrors
  `apps/api/lib/driver-clerk.ts:1-11`:
  `createClerkClient({ secretKey: process.env.CUSTOMER_CLERK_SECRET_KEY })`,
  exported as `customerClerkClient`. Include the same kind of
  "never cross instances" comment the driver client has.
- **New** `apps/api/app/v1/users/route.ts` — `GET` only.
  - Gate: `requireOpsAccess()` (same as `v1/team/route.ts:15`).
  - Query params: `type` (`"drivers" | "customers"`, required),
    `query` (optional search string, forwarded to Clerk's
    `getUserList({ query })`), `cursor`/`limit` (optional, pagination).
  - Dispatches to `driverClerkClient.users.getUserList(...)` or
    `customerClerkClient.users.getUserList(...)` based on `type`.
  - Maps Clerk's `User` objects to a shared DTO: `id`, `name`
    (from first/last name, falling back to email local-part), `email`
    (primary email address), `phone` (primary phone number if any),
    `createdAt` (ISO string), `status` (`"active" | "banned" | "locked"`
    derived from Clerk's `banned`/`locked` fields).
  - Returns `{ users: PlatformUserDto[], nextCursor: string | null }`.
  - On Clerk API failure: catch, log (matching
    `driver-clerk.ts`'s catch-and-log style), return
    `jsonError("Failed to load users", 502)`.
- **New env var** `CUSTOMER_CLERK_SECRET_KEY` added to `apps/api`'s env
  (the driver equivalent already exists there); add to `apps/api`'s
  env-check script if one exists, mirroring how ops checks
  `CLERK_ORG_ID` in `apps/ops/scripts/check-env.ts`.
- **New DTO types** in `@workspace/ops-contracts` (co-located with
  `TeamDto`): `PlatformUserDto`, `PlatformUserListDto`.

## Frontend (apps/ops)

- `app/(dashboard)/users/layout.tsx` — `requireOpsAdmin()` gate
  (redirect to `/home` on failure, matching `team/layout.tsx:6-11`) +
  `<UsersTabs />` + page heading.
- `components/users-tabs.tsx` — same shape as `components/team-tabs.tsx`:
  `{ href: "/users", label: "Drivers" }`,
  `{ href: "/users/customers", label: "Customers" }`,
  `{ href: "/users/admins", label: "Admins" }`.
- `app/(dashboard)/users/page.tsx` (Drivers),
  `app/(dashboard)/users/customers/page.tsx`,
  `app/(dashboard)/users/admins/page.tsx` — each renders a table with
  columns: name, email, phone, joined date, status.
  - Drivers/Customers pages: search input (debounced, filters via
    `query` param) + "load more" pagination using `nextCursor`. Call
    `apps/api`'s `GET /v1/users?type=...` via `useOpsClient()`.
  - Admins page: reuses the existing team-members fetch (`client.team`
    / `GET /v1/team`), renders the `members` list read-only — no
    invite/remove/role-edit controls (those remain exclusive to
    `/team`).
  - Per-tab inline error state (not a full page crash) if the fetch
    fails.
- Extend `apps/ops/lib/ops-client.ts`'s `resolveOpsResource` /
  `@workspace/ops-api-client` with a `/v1/users` path mapping if the
  generated client requires manual registration (confirm exact
  mechanism during implementation — same pattern as the existing
  `/v1/leads`, `/v1/drivers`, etc. entries).

## Testing

- Unit test the DTO mapping in `apps/api/app/v1/users/route.ts` (Clerk
  `User` -> `PlatformUserDto`, including the `status` derivation).
- Unit test the `type`-based dispatch (drivers -> driver client,
  customers -> customer client, invalid `type` -> 400).
- Manual verification: load all three tabs against real Clerk data in
  dev, confirm search and pagination behave, confirm ops-admin gate
  redirects non-admins.

## Out of scope (this iteration)

- Ban/unban, impersonation, or any other mutating action from this
  page.
- Joining Clerk accounts against the `Driver`/`Customer` Prisma CRM
  records (no reliable `clerk_user_id` link exists yet for drivers;
  customer link is present but unpopulated).
- Changes to `/team`'s existing functionality.
