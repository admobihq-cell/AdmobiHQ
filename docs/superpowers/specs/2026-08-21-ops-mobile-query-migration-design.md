# TanStack Query Migration — ops-mobile remaining screens

Date: 2026-08-21
Status: Approved

## Problem

`apps/ops-mobile` already uses `@tanstack/react-query` as its data-fetching
layer — `QueryClientProvider` is mounted in `app/_layout.tsx`, and most
screens (`EntityList.tsx`, `EntityDetail.tsx`, `driver-applications/index.tsx`,
`support/index.tsx`, `team/*`, `hooks/use-dashboard-stats.ts`,
`hooks/use-recent-submissions.ts`) already fetch through `useQuery`/
`useInfiniteQuery`. Four screens were missed and still hand-roll fetching with
`useState`+`useEffect` (`activity.tsx`, `announcements/index.tsx`,
`profile.tsx`) or `useState`+`useCallback` (`support/[id].tsx`), each
re-fetching from scratch on every mount with mutations followed by a manual
reload — no caching, and inconsistent with the rest of the app.

This is a follow-up to the completed
`docs/superpowers/specs/2026-08-21-tanstack-query-migration-design.md`
(ops/driver-web/customer-web), which explicitly left mobile apps out of
scope. `apps/ops-mobile` isn't greenfield the way `driver-mobile`/
`customer-mobile` are — it already has the dependency and the provider — so
this is a small mop-up, not a new infrastructure project.

## Scope decisions (from brainstorming)

1. **Files in scope** (4): `app/(ops)/activity.tsx`,
   `app/(ops)/announcements/index.tsx`, `app/(ops)/profile.tsx`,
   `app/(ops)/support/[id].tsx`.
2. **Excluded — no page data to cache**: `app/(ops)/notifications.tsx` (a
   local QA tool for previewing push notification styles; no backend list
   fetch, only a one-off permission-status check) and
   `app/(ops)/announcements/new.tsx` (a create-only form — its backend calls
   are POSTs with nothing to read/cache).
3. **No new infrastructure**: `QueryClientProvider` already wraps the app in
   `app/_layout.tsx` with `staleTime: 30_000`, `retry: 1`. This migration
   only touches the 4 screens above — it does not touch the provider, and
   does not introduce a shared `packages/query-client`-style package (unlike
   the web migration, ops-mobile's provider/client setup is already fine as
   inline config in `_layout.tsx`).
4. **Pattern source**: rather than inventing a new shape, each file is
   converted to match a pattern already proven *elsewhere in this same app*:
   - `activity.tsx`, `profile.tsx` → plain `useQuery` (mirrors
     `EntityDetail.tsx`'s read pattern).
   - `announcements/index.tsx` → `useInfiniteQuery` (mirrors
     `driver-applications/index.tsx` and `support/index.tsx`, which already
     paginate this way).
   - `support/[id].tsx` → `useQuery` + `useMutation` with invalidation
     (mirrors the now-completed web `case-detail-view.tsx`: one detail query,
     each mutation invalidates it).

## Architecture

No new files, no provider changes. Each of the 4 screens converts its
existing manual fetch/mutation block in place, importing
`useQuery`/`useMutation`/`useInfiniteQuery`/`useQueryClient` from
`@tanstack/react-query` (already a dependency).

## Migration pattern

Same shape as the web migration: `fetchSeq`/`useCallback` fetch wrappers and
manual `loading`/`error` state are replaced by `useQuery`/`useInfiniteQuery`
return values; mutation functions that previously ended with `await load()`
or `setState` become `useMutation` with `onSuccess: () =>
queryClient.invalidateQueries(...)`.

### `activity.tsx`

Currently: `useCallback` `fetchActivity()` fetching `client.audit.list({
page: 1, pageSize: 50 })` on mount via `useEffect`, `category` is a
client-side filter over the full result set (not sent to the API).

After: `useQuery({ queryKey: ["activity", "list"], queryFn: () =>
client.audit.list({ page: 1, pageSize: 50 }) })`. The `category` filter stays
a client-side `useMemo` over `query.data` — it doesn't belong in the query
key since it's never sent to the server.

### `announcements/index.tsx`

Currently: `useCallback` `fetchPage(nextPage, replace)` appending pages into
local `items` state, driven by `onEndReached`/pull-to-refresh; `resend` and
`delete` mutations each end with a manual re-fetch or local `setState` splice.

After: `useInfiniteQuery({ queryKey: ["announcements", "list"], queryFn:
({ pageParam }) => client.notifications.list({ page: pageParam, pageSize: 20 }),
initialPageParam: 1, getNextPageParam: ... })` — same shape as
`driver-applications/index.tsx`. `resend` (→ `client.notifications.broadcast`)
and `delete` (→ `client.notifications.delete`) become `useMutation`s whose
`onSuccess` invalidates `["announcements", "list"]`.

### `profile.tsx`

Currently: one-shot `useEffect` fetching `opsClient.flags.list()` into
`flags` state (best-effort, swallows errors); `toggleFlag` mutates via
`opsClient.flags.update` and manually patches local state.

After: `useQuery({ queryKey: ["platform-flags"], queryFn: () =>
opsClient.flags.list() })`, reading `.data?.items`. `toggleFlag` becomes a
`useMutation` whose `onSuccess` invalidates `["platform-flags"]` (dropping
the manual `setFlags` splice — the refetch is cheap and this isn't a
latency-sensitive toggle).

### `support/[id].tsx`

Currently: `useCallback` `load()` fetching `client.support.get(caseId)`;
`updateCase`, `assignToMe`, `unassign`, `handleSend` each `await load()` at
the end.

After: `useQuery({ queryKey: ["support", "detail", caseId], queryFn: () =>
client.support.get(caseId) })`. The four write paths become `useMutation`s
(one `updateMutation` covering status/priority/assign/unassign patches, one
`replyMutation` for `client.support.reply`), each invalidating
`["support", "detail", caseId]` and `["support", "list"]` — the same
double-invalidation the web `case-detail-view.tsx` uses, so returning to the
support list reflects the change.

## Testing

No test runner in this app. Verification is `turbo typecheck --filter=ops-mobile`
and `turbo lint --filter=ops-mobile`, plus manual verification in Expo Go/a
dev build: each screen still loads and shows data, mutations update the UI
without a full manual reload, and navigating away and back within the
30s staleTime serves cached data instantly.

## Out of scope (this iteration)

- `driver-mobile`, `customer-mobile` — separate sub-projects, each starting
  from zero (`@tanstack/react-query` isn't even a dependency yet); to be
  designed after this one lands.
- `notifications.tsx`, `announcements/new.tsx` — no page data to cache (see
  Scope decisions above).
- Any change to `app/_layout.tsx`'s `QueryClientProvider`/`queryClient`
  config — it's already correctly set up.
