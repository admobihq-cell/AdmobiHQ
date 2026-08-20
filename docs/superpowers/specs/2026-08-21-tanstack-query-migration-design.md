# TanStack Query Migration — ops, driver-web, customer-web

Date: 2026-08-21
Status: Approved

## Problem

`apps/ops`, `apps/driver-web`, and `apps/customer-web` all hand-roll client-side
data fetching: `useState` + `useEffect` + a manual fetch call, often guarded
by a `fetchSeq` ref to discard stale/out-of-order responses, with mutations
followed by a hand-written `reload()`/`refresh()` call. This shows up as:

- Duplicated stale-response-guard boilerplate (`fetchSeq` refs) in
  `entity-page.tsx`, `activity-view.tsx`, `support-view.tsx`,
  `platform-users-view.tsx`, and equivalents in driver-web/customer-web.
- The `react-hooks/set-state-in-effect` warnings seen throughout the ops
  table migration (`roles-view.tsx`, `platform-users-view.tsx`,
  `entity-page.tsx`, etc.) — the root cause is "fetch in an effect, then
  `setState` the result."
- No caching across navigation — leaving and returning to a route always
  re-fetches from scratch.
- Manual `reload()` calls sprinkled after every mutation (`team-view.tsx`'s
  invite/remove/role-change, `roles-view.tsx`'s save/delete,
  `announcements-view.tsx`'s send/resend/delete, and the driver-web/
  customer-web support/account/wallet equivalents).

`apps/ops-mobile` already uses `@tanstack/react-query` successfully
(`hooks/use-dashboard-stats.ts`, `EntityList.tsx`, etc.) — this migration
brings the three Next.js web apps in line with that pattern.

## Scope decisions (from brainstorming)

1. **Apps in scope**: `apps/ops`, `apps/driver-web`, `apps/customer-web` —
   the three Next.js App Router web apps, which share the same stack and
   hand-rolled-fetch pattern. `apps/web` is excluded (marketing site, no
   real client-side backend fetching — confirmed by survey). The two Expo
   mobile apps (`driver-mobile`, `customer-mobile`) are excluded — each is
   its own future project with its own constraints (offline behavior,
   AsyncStorage persistence) worth a dedicated design pass rather than
   folding into this one.
2. **Shared config package**: a new `packages/query-client` workspace
   package, following the existing `ops-contracts`/`ops-api-client`
   convention, owns the `QueryClient` defaults and the provider component.
   Apps import `useQuery`/`useMutation` directly from `@tanstack/react-query`
   itself (each app declares that dependency) — the shared package does not
   re-export the hooks, only the client factory and provider.
3. **Phasing**: queries and mutations are converted together, per file. A
   file is either untouched or fully migrated — never left with `useQuery`
   for reads but a manual `reload()` for writes.
4. **Order**: `apps/ops` first (most files, most context from the recent
   table migration), then `apps/driver-web`, then `apps/customer-web`.

## Architecture

```
packages/query-client/
  src/
    client.ts       -> createQueryClient(): QueryClient
    provider.tsx     -> <QueryProvider> (QueryClientProvider + dev-only Devtools)
    index.ts         -> re-exports both

apps/{ops,driver-web,customer-web}/app/layout.tsx
  -> <QueryProvider> added inside <TooltipProvider>, wrapping {children}
```

`createQueryClient()` sets shared defaults: `staleTime: 30_000`, `retry: 1`,
`gcTime: 5 * 60_000`, `refetchOnWindowFocus: true` (React Query's default,
stated explicitly so it's a deliberate choice, not an accident). No
per-app overrides in this iteration — if an app's data genuinely needs a
different staleTime, that's a follow-up, not part of this migration.

`<QueryProvider>` constructs its `QueryClient` via `useState(() =>
createQueryClient())` (the standard SSR-safe pattern — one client instance
per component tree, not per render) and renders
`<ReactQueryDevtools initialIsOpen={false} />` only when
`process.env.NODE_ENV === "development"`.

## Migration pattern

Every converted file follows the same shape. Before:

```ts
const [data, setData] = useState<T | null>(null)
const [loading, setLoading] = useState(true)
const fetchSeq = useRef(0)
const fetchData = useCallback(async () => {
  const seq = ++fetchSeq.current
  setLoading(true)
  try {
    const result = await client.thing.list(params)
    if (seq !== fetchSeq.current) return
    setData(result)
  } finally {
    if (seq === fetchSeq.current) setLoading(false)
  }
}, [client, ...params])
useEffect(() => { void fetchData() }, [fetchData])
// ...later, after a mutation:
await client.thing.update(id, body)
void fetchData()
```

After:

```ts
const queryClient = useQueryClient()
const { data, isLoading } = useQuery({
  queryKey: ["thing", params],
  queryFn: () => client.thing.list(params),
})
const updateMutation = useMutation({
  mutationFn: (body: UpdateInput) => client.thing.update(id, body),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["thing"] }),
})
```

Query keys include whatever filters/params currently retrigger the effect
(page, search, sortBy/sortDir, status filter, etc.) so that changing a
filter is itself what causes a refetch — no separate "reset page on filter
change" effect needed.

`fetchSeq` refs, manual `loading`/`error` state, and `reload()`/`refresh()`
helper functions are deleted entirely from converted files — they become
dead code once `useQuery`/`useMutation` own that state.

## Scope: files to convert

**apps/ops** (~10 files):
`components/entity-page.tsx` (backs `/leads`, `/fleet`, `/drivers`,
`/waitlist`, `/media-kit`), `components/team-view.tsx`,
`components/roles-view.tsx`, `components/admins-view.tsx`,
`components/platform-users-view.tsx`,
`app/(dashboard)/activity/activity-view.tsx`,
`app/(dashboard)/support/support-view.tsx`,
`app/(dashboard)/support/[id]/case-detail-view.tsx`,
`app/(dashboard)/announcements/announcements-view.tsx`,
`app/(dashboard)/driver-applications/driver-applications-view.tsx`.

**apps/driver-web** (~8-9 files):
`driver-verification-section.tsx`, `notification-bell.tsx`,
`case-thread-client.tsx`, `support-client.tsx`, `submitted-info-view.tsx`,
`document-upload-field.tsx`, `account-settings-view.tsx`, `greeting.tsx`.
(Exact paths confirmed during plan-writing — the survey located these by
filename, not full path.)

**apps/customer-web** (~6 files):
`support-client.tsx`, `case-thread-client.tsx`, `account-settings-view.tsx`,
`greeting.tsx`, `wallet-view.tsx`, `campaign-detail-view.tsx`. Files backed
only by `localStorage` (e.g. `campaigns-view.tsx`) are explicitly excluded —
there's no backend fetch to convert.

Exact current behavior (query keys, mutation call sites, polling intervals
like `notification-bell.tsx`'s 60s `setInterval`) is read from each file
during plan-writing, not assumed here.

## Testing

No test runner exists in any of these three apps today. Verification is
`turbo typecheck`/`turbo lint` per app after each file (or small batch),
plus manual verification: each converted list still loads, filters/search
still refetch, mutations update the list without a manual reload, and React
Query Devtools shows the expected cache entries in dev.

## Out of scope (this iteration)

- `apps/driver-mobile`, `apps/customer-mobile` — separate future project.
- `apps/web` — not a candidate (no real client-side backend fetching).
- Per-app staleTime/retry overrides — use the shared defaults; revisit only
  if a specific app's data genuinely needs different behavior.
- Optimistic updates — `useMutation` unlocks this, but adding optimistic UI
  is a follow-up enhancement per-mutation, not required for this migration
  to be complete.
- Restructuring driver-web/customer-web's ad-hoc fetch functions
  (`driver-profile-client.ts`, `support-client.ts`, etc.) into a typed
  client package like `ops-api-client` — out of scope; those functions are
  wrapped as-is inside `queryFn`/`mutationFn`, not redesigned.
