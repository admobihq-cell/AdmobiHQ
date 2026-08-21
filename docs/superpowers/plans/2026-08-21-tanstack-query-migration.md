# TanStack Query Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-rolled `useState`+`useEffect`+`fetchSeq`-ref data fetching with `@tanstack/react-query` across `apps/ops`, `apps/driver-web`, and `apps/customer-web`, backed by a new shared `packages/query-client` package.

**Architecture:** A new `packages/query-client` workspace package exports `createQueryClient()` (a `QueryClient` factory with shared defaults) and `<QueryProvider>` (a client component wrapping `QueryClientProvider` + dev-only `ReactQueryDevtools`). Each app adds `<QueryProvider>` to its root layout inside `<TooltipProvider>`, wrapping `{children}`, and imports `useQuery`/`useMutation`/`useQueryClient` directly from `@tanstack/react-query` in every converted component. Conversions are one file at a time; a file is either untouched or fully migrated (reads and writes together) — never a `useQuery` read next to a manual `reload()` write.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, `@tanstack/react-query` ^5.101.4 (version already used by `apps/ops-mobile`), Turborepo/pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-08-21-tanstack-query-migration-design.md`

## Global Constraints

- `createQueryClient()` defaults: `staleTime: 30_000`, `gcTime: 5 * 60_000`, `retry: 1`, `refetchOnWindowFocus: true` — no per-app overrides this iteration.
- `<QueryProvider>` builds its client via `useState(() => createQueryClient())` — one instance per component tree, not per render.
- `<ReactQueryDevtools initialIsOpen={false} />` renders only when `process.env.NODE_ENV === "development"`.
- Apps import `useQuery`/`useMutation`/`useQueryClient` from `@tanstack/react-query` directly — `packages/query-client` does not re-export the hooks.
- `apps/web`, `apps/driver-mobile`, `apps/customer-mobile` are out of scope — do not touch them.
- No optimistic updates beyond what already existed as fire-and-forget local state changes in the original code (e.g. `notification-bell.tsx`'s read-marking) — do not add new optimistic UI.
- No test runner exists in these apps. Every task's verification is `turbo typecheck --filter=<name>` and `turbo lint --filter=<name>` (app package names are `ops`, `driver-web`, `customer-web`; the new package name is `@workspace/query-client`).
- `fetchSeq` refs, manual `loading`/`error` state duplicating query state, and `reload()`/`refresh()` helper functions are deleted entirely from every converted file.
- **Excluded from conversion (no backend fetch present):** `apps/driver-web/components/overview/greeting.tsx`, `apps/customer-web/components/overview/greeting.tsx` (pure client-local-time computation), `apps/customer-web/components/wallet/wallet-view.tsx`, `apps/customer-web/components/campaigns/campaign-detail-view.tsx` (both `localStorage`-only, same as the already-excluded `campaigns-view.tsx`).

---

## Task 1: Create `packages/query-client`

**Files:**
- Create: `packages/query-client/package.json`
- Create: `packages/query-client/tsconfig.json`
- Create: `packages/query-client/src/client.ts`
- Create: `packages/query-client/src/provider.tsx`
- Create: `packages/query-client/src/index.ts`

**Interfaces:**
- Produces: `createQueryClient(): QueryClient` and `QueryProvider({ children }: { children: React.ReactNode }): JSX.Element`, both exported from `@workspace/query-client`. Every later task imports `QueryProvider` from `@workspace/query-client` and `useQuery`/`useMutation`/`useQueryClient`/`keepPreviousData` from `@tanstack/react-query` directly.

- [ ] **Step 1: Create `package.json`**, modeled on `packages/ops-api-client/package.json`'s scaffolding but adding the react-query deps and React (this package ships a `.tsx` provider, so it needs React the way `packages/ui` does):

```json
{
  "name": "@workspace/query-client",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"**/*.{ts,tsx}\""
  },
  "dependencies": {
    "@tanstack/react-query": "^5.101.4",
    "@tanstack/react-query-devtools": "^5.101.4",
    "react": "^19.2.4"
  },
  "devDependencies": {
    "@types/node": "^25.1.0",
    "@types/react": "^19.2.10",
    "@workspace/eslint-config": "*",
    "@workspace/typescript-config": "*",
    "eslint": "^9.39.2",
    "typescript": "^5.9.3"
  },
  "exports": {
    ".": "./src/index.ts"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**, following `packages/ui/tsconfig.json`'s use of the react-library base (needed for JSX in `provider.tsx`) plus `ops-api-client`'s bundler/no-emit settings:

```json
{
  "extends": "@workspace/typescript-config/react-library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": true,
    "module": "ESNext",
    "moduleResolution": "Bundler"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `src/client.ts`**:

```ts
import { QueryClient } from "@tanstack/react-query"

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  })
}
```

- [ ] **Step 4: Create `src/provider.tsx`**:

```tsx
"use client"

import { useState } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import { createQueryClient } from "./client"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  )
}
```

- [ ] **Step 5: Create `src/index.ts`**:

```ts
export { createQueryClient } from "./client"
export { QueryProvider } from "./provider"
```

- [ ] **Step 6: Install and verify**

Run: `pnpm install` (from repo root, to link the new workspace package)
Run: `turbo typecheck --filter=@workspace/query-client`
Expected: PASS, no errors.
Run: `turbo lint --filter=@workspace/query-client`
Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/query-client
git commit -m "feat(query-client): add shared QueryClient factory and provider"
```

---

## Task 2: Wire `<QueryProvider>` into all three app layouts

**Files:**
- Modify: `apps/ops/package.json`
- Modify: `apps/driver-web/package.json`
- Modify: `apps/customer-web/package.json`
- Modify: `apps/ops/app/layout.tsx:1-73`
- Modify: `apps/driver-web/app/layout.tsx:1-85`
- Modify: `apps/customer-web/app/layout.tsx:1-85`

**Interfaces:**
- Consumes: `QueryProvider` from `@workspace/query-client` (Task 1).
- Produces: every subsequent task's converted component can call `useQuery`/`useMutation`/`useQueryClient` because a `QueryClientProvider` is now mounted above `{children}` in all three apps.

- [ ] **Step 1: Add dependencies to each app's `package.json`**

In `apps/ops/package.json`, add to `"dependencies"` (alphabetical, matching existing style):

```json
    "@tanstack/react-query": "^5.101.4",
    "@workspace/query-client": "*",
```

placed right after `"@sentry/nextjs"` and before `"@tanstack/react-table"`/`"@vercel/analytics"` respectively (i.e. `@tanstack/react-query` goes just before `"@tanstack/react-table"`, `@workspace/query-client` goes just before `"@workspace/sentry-config"`).

In `apps/driver-web/package.json`, add to `"dependencies"`:

```json
    "@tanstack/react-query": "^5.101.4",
```
placed after `"@sentry/nextjs"`, and
```json
    "@workspace/query-client": "*",
```
placed before `"@workspace/sentry-config"`.

In `apps/customer-web/package.json`, add the same two lines in the same relative positions.

- [ ] **Step 2: Edit `apps/ops/app/layout.tsx`**

Add the import next to the other `@workspace/ui` imports (after line 8, `import { ThemeProvider } ...`):

```tsx
import { QueryProvider } from "@workspace/query-client"
```

Replace lines 63-66:

```tsx
            <TooltipProvider>
              {children}
              <Toaster richColors position="top-right" />
            </TooltipProvider>
```

with:

```tsx
            <TooltipProvider>
              <QueryProvider>{children}</QueryProvider>
              <Toaster richColors position="top-right" />
            </TooltipProvider>
```

- [ ] **Step 3: Edit `apps/driver-web/app/layout.tsx`**

Add the import next to the other `@workspace/ui` imports (after line 10, `import { TooltipProvider } ...`):

```tsx
import { QueryProvider } from "@workspace/query-client"
```

Replace lines 74-77:

```tsx
            <TooltipProvider>
              {children}
              <Toaster richColors position="top-right" />
            </TooltipProvider>
```

with:

```tsx
            <TooltipProvider>
              <QueryProvider>{children}</QueryProvider>
              <Toaster richColors position="top-right" />
            </TooltipProvider>
```

- [ ] **Step 4: Edit `apps/customer-web/app/layout.tsx`**

Same edit as Step 3 (identical file structure): add the `QueryProvider` import next to the `TooltipProvider` import, and replace lines 74-77 the same way.

- [ ] **Step 5: Verify all three apps**

Run: `pnpm install`
Run: `turbo typecheck --filter=ops --filter=driver-web --filter=customer-web`
Expected: PASS.
Run: `turbo lint --filter=ops --filter=driver-web --filter=customer-web`
Expected: PASS.
Manual: start each app (`npm run dev -w ops`, etc.), confirm it still renders (no provider-tree crash), and confirm React Query Devtools appear in the bottom corner in dev.

- [ ] **Step 6: Commit**

```bash
git add apps/ops/app/layout.tsx apps/ops/package.json apps/driver-web/app/layout.tsx apps/driver-web/package.json apps/customer-web/app/layout.tsx apps/customer-web/package.json
git commit -m "feat: mount QueryProvider in ops, driver-web, and customer-web layouts"
```

---

## apps/ops tasks

## Task 3: Convert `apps/ops/components/entity-page.tsx`

Backs `/leads`, `/fleet`, `/drivers`, `/waitlist`, `/media-kit` (parameterized by `apiPath`). Has list fetching with `fetchSeq`, plus create/update/delete/bulk mutations, plus a "quick status change" mutation.

**Files:**
- Modify: `apps/ops/components/entity-page.tsx:1-364` (imports through `handleQuickStatusChange`)
- Modify: `apps/ops/components/entity-page.tsx:441-484` (retry button, loading spinner references)
- Modify: `apps/ops/components/entity-page.tsx:566-604` (table/pagination JSX referencing `loading`/`data`)
- Modify: `apps/ops/components/entity-page.tsx:643-665` (quick-status buttons referencing `saving`)

**Interfaces:**
- Consumes: `useOpsClient`, `resolveOpsResource` from `@/lib/ops-client` (unchanged); `formatApiError`, `getApiBaseUrl` from `@workspace/ops-api-client` (unchanged).
- Produces: query key family `["ops-entity", apiPath, { page, search, statusFilter }]`, invalidated by prefix `["ops-entity", apiPath]` from every mutation in this file.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
```

with:

```ts
import { useMemo, useState } from "react"
```

Add after line 7 (`import { formatApiError, getApiBaseUrl } from "@workspace/ops-api-client"`):

```ts
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace the fetch state and effects (lines 139-218) with `useQuery`**

Replace:

```ts
  const [data, setData] = useState<Paginated<T> | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
```

with:

```ts
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
```

(leave the rest of the state block unchanged, lines 145-158).

Replace lines 181-218 (`const fetchSeq = useRef(0)` through the second `useEffect`):

```ts
  const fetchSeq = useRef(0)

  const fetchData = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    setFetchError(null)
    try {
      const result = await resource.list({
        page,
        pageSize: 20,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      })
      if (seq !== fetchSeq.current) return
      setData(result as unknown as Paginated<T>)
    } catch (err) {
      if (seq !== fetchSeq.current) return
      const message = formatApiError(err, {
        apiUrl: getApiBaseUrl(),
        networkHint: "Cannot reach the ops API. Run npm run env:pull -w ops and confirm the API is running.",
      })
      setFetchError(message)
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [resource, page, search, statusFilter])

  useEffect(() => {
    if (initialData && page === 1 && !search && !statusFilter) {
      return
    }
    void fetchData()
  }, [fetchData, initialData, page, search, statusFilter])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [page, search, apiPath])
```

with:

```ts
  const listQueryKey = ["ops-entity", apiPath, { page, search, statusFilter }] as const

  const {
    data,
    isLoading: loading,
    isError,
    error: fetchErrorRaw,
    refetch,
  } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      resource.list({
        page,
        pageSize: 20,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      }) as unknown as Promise<Paginated<T>>,
    initialData:
      initialData && page === 1 && !search && !statusFilter ? initialData : undefined,
    placeholderData: keepPreviousData,
  })

  const fetchError = isError
    ? formatApiError(fetchErrorRaw, {
        apiUrl: getApiBaseUrl(),
        networkHint: "Cannot reach the ops API. Run npm run env:pull -w ops and confirm the API is running.",
      })
    : null

  useEffect(() => {
    setSelectedIds(new Set())
  }, [page, search, apiPath])
```

(the `useEffect` for `setSelectedIds` stays — it's UI selection state, not fetch bookkeeping — so re-add `useEffect` to the import list from Step 1: `import { useEffect, useMemo, useState } from "react"`).

- [ ] **Step 3: Convert mutations (lines 242-364)**

Replace:

```ts
  const postBulk = async (body: Record<string, unknown>) => {
    return resource.bulk(body as never)
  }

  const runBulkAction = async (action: () => Promise<void>) => {
    setBulkPending(true)
    try {
      await action()
      clearSelection()
      void fetchData()
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setBulkPending(false)
      setBulkConfirm(null)
    }
  }
```

with:

```ts
  const postBulk = async (body: Record<string, unknown>) => {
    return resource.bulk(body as never)
  }

  const bulkMutation = useMutation({
    mutationFn: (action: () => Promise<void>) => action(),
    onSuccess: () => {
      clearSelection()
      void queryClient.invalidateQueries({ queryKey: ["ops-entity", apiPath] })
    },
    onError: (e) => toast.error(formatApiError(e)),
    onSettled: () => setBulkConfirm(null),
  })

  const runBulkAction = (action: () => Promise<void>) => bulkMutation.mutate(action)
```

Remove the `[bulkPending, setBulkPending]` state declaration from Step 2's leftover state block (it was on original line 152). Everywhere `bulkPending` is read (the disabled/loading props on the bulk-action buttons, lines 495, 517, 539, 541, 557, 735, 741, 748) replace it with `bulkMutation.isPending`.

Replace lines 301-364 (`handleSubmit` through `handleQuickStatusChange`) with:

```ts
  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      editing ? resource.update(editing.id, values as never) : resource.create(values as never),
    onSuccess: () => {
      toast.success(editing ? "Updated" : "Created")
      setFormOpen(false)
      setEditing(null)
      setViewing(null)
      void queryClient.invalidateQueries({ queryKey: ["ops-entity", apiPath] })
    },
    onError: (e) => toast.error(formatApiError(e)),
  })
  const handleSubmit = (values: Record<string, unknown>) => saveMutation.mutateAsync(values)

  const deleteMutation = useMutation({
    mutationFn: (target: T) => resource.delete(target.id),
    onSuccess: () => {
      toast.success("Deleted")
      setDeleteTarget(null)
      setViewing(null)
      void queryClient.invalidateQueries({ queryKey: ["ops-entity", apiPath] })
    },
    onError: (e) => toast.error(formatApiError(e)),
  })
  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget)
  }

  const handleExport = () => {
    if (!data?.items.length) return
    const csvColumns = columns.filter((c) => c.csv).map((c) => c.key)
    const rows = data.items.map((row) => {
      if (getCsvRow) return getCsvRow(row)
      return Object.fromEntries(
        columns
          .filter((c) => c.csv)
          .map((c) => [c.key, c.csv!(row)]),
      )
    })
    downloadCsv(apiPath.replace(/^\/v1\//, "") + ".csv", toCsv(rows, csvColumns))
  }

  const quickStatusMutation = useMutation({
    mutationFn: (status: string) => {
      if (!viewing) throw new Error("No record selected")
      return resource.update(viewing.id, { status } as never)
    },
    onSuccess: (_result, status) => {
      toast.success("Status updated")
      setViewing((prev) => (prev ? ({ ...prev, status } as T) : prev))
      void queryClient.invalidateQueries({ queryKey: ["ops-entity", apiPath] })
    },
    onError: (e) => toast.error(formatApiError(e)),
  })
  const handleQuickStatusChange = (status: string) => quickStatusMutation.mutate(status)

  const saving = saveMutation.isPending || quickStatusMutation.isPending
  const deleting = deleteMutation.isPending
```

Remove the now-redundant `const [saving, setSaving] = useState(false)` and `const [deleting, setDeleting] = useState(false)` declarations from the state block in Step 2 (originally lines 148, 150) — they're replaced by the derived `const saving = ...` / `const deleting = ...` above.

- [ ] **Step 4: Update JSX call sites**

Line 481, replace `onRetry={() => void fetchData()}` with `onRetry={() => void refetch()}`.

Everything else in the JSX (`loading`, `data`, `saving`, `deleting`, `bulkPending` -> `bulkMutation.isPending`) already reads from the renamed/derived variables introduced above, so no further JSX edits are needed beyond the `bulkPending` -> `bulkMutation.isPending` replacements called out in Step 3.

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=ops`
Expected: PASS.
Run: `turbo lint --filter=ops`
Expected: PASS.
Manual: visit `/leads`, `/fleet`, `/drivers`, `/waitlist`, `/media-kit`. Confirm list loads, search/status filter refetch, pagination works without flicker (`keepPreviousData`), create/edit/delete/bulk actions update the table without a full reload, and navigating away and back serves cached data instantly (visible via Devtools).

- [ ] **Step 6: Commit**

```bash
git add apps/ops/components/entity-page.tsx
git commit -m "refactor(ops): migrate entity-page.tsx to TanStack Query"
```

---

## Task 4: Convert `apps/ops/components/team-view.tsx`

**Files:**
- Modify: `apps/ops/components/team-view.tsx:1-280`

**Interfaces:**
- Produces query keys `["ops-team"]` and `["ops-roles"]` — `["ops-roles"]` is shared with Task 5 (`roles-view.tsx`) and Task 6 (`admins-view.tsx`) so a role edit/delete elsewhere invalidates this file's dropdown data too.

- [ ] **Step 1: Update imports**

Replace line 3 `import { useEffect, useId, useState } from "react"` — add after it:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 166-211)**

Replace:

```ts
  const [team, setTeam] = useState<TeamDto | null>(null)
  const [roles, setRoles] = useState<OpsRoleDto[]>([])
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(
    null
  )
  const [removeTarget, setRemoveTarget] = useState<TeamMemberDto | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteTier, setInviteTier] = useState<TeamRoleUpdateInput>({
    tier: "member",
    roleId: 0,
  })
  const [inviting, setInviting] = useState(false)

  const [membersSorting, setMembersSorting] = useState<SortingState>([])
  const [invitationsSorting, setInvitationsSorting] = useState<SortingState>([])

  function reload() {
    client.team
      .list()
      .then(setTeam)
      .catch((err) => toast.error(formatApiError(err)))
    client.roles
      .list()
      .then((res) => {
        setRoles(res.items)
        setInviteTier((prev) =>
          prev.tier === "member" && !prev.roleId && res.items[0]
            ? { tier: "member", roleId: res.items[0].id }
            : prev
        )
      })
      .catch((err) => toast.error(formatApiError(err)))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])
```

with:

```ts
  const queryClient = useQueryClient()

  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(
    null
  )
  const [removeTarget, setRemoveTarget] = useState<TeamMemberDto | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteTier, setInviteTier] = useState<TeamRoleUpdateInput>({
    tier: "member",
    roleId: 0,
  })

  const [membersSorting, setMembersSorting] = useState<SortingState>([])
  const [invitationsSorting, setInvitationsSorting] = useState<SortingState>([])

  const teamQuery = useQuery({
    queryKey: ["ops-team"],
    queryFn: () => client.team.list(),
  })
  const team = teamQuery.data ?? null

  const rolesQuery = useQuery({
    queryKey: ["ops-roles"],
    queryFn: () => client.roles.list(),
  })
  const roles = rolesQuery.data?.items ?? []

  // Seeds the invite dialog's default role once roles arrive, without
  // clobbering an in-progress selection.
  useEffect(() => {
    if (roles.length === 0) return
    setInviteTier((prev) =>
      prev.tier === "member" && !prev.roleId ? { tier: "member", roleId: roles[0]!.id } : prev,
    )
  }, [roles])
```

- [ ] **Step 3: Convert mutations (lines 213-275)**

Replace `handleInvite`, `handleRoleChange`, `handleRemove`, `handleRevoke` (each previously ending its try/catch/finally with a `reload()` call) with:

```ts
  const inviteMutation = useMutation({
    mutationFn: (body: TeamInviteInput) => client.team.invite(body),
    onSuccess: () => {
      toast.success("Invited " + inviteEmail.trim())
      setInviteEmail("")
      setInviteOpen(false)
      void queryClient.invalidateQueries({ queryKey: ["ops-team"] })
    },
    onError: (err) => toast.error(formatApiError(err)),
  })

  function handleInvite() {
    if (!inviteEmail.trim()) return
    if (inviteTier.tier === "member" && !inviteTier.roleId) {
      toast.error("Create a role first")
      return
    }
    const body: TeamInviteInput = { email: inviteEmail.trim(), ...inviteTier }
    inviteMutation.mutate(body)
  }

  async function handleRoleChange(
    member: TeamMemberDto,
    input: TeamRoleUpdateInput
  ) {
    setPendingUserId(member.userId)
    try {
      await client.team.updateRole(member.userId, input)
      toast.success("Updated " + member.email + "'s role")
      await queryClient.invalidateQueries({ queryKey: ["ops-team"] })
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setPendingUserId(null)
    }
  }

  async function handleRemove(member: TeamMemberDto) {
    setPendingUserId(member.userId)
    try {
      await client.team.removeMember(member.userId)
      toast.success("Removed " + member.email)
      setRemoveTarget(null)
      await queryClient.invalidateQueries({ queryKey: ["ops-team"] })
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setPendingUserId(null)
    }
  }

  async function handleRevoke(invitation: TeamInvitationDto) {
    setPendingInvitationId(invitation.id)
    try {
      await client.team.revokeInvitation(invitation.id)
      toast.success("Revoked invitation for " + invitation.email)
      await queryClient.invalidateQueries({ queryKey: ["ops-team"] })
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setPendingInvitationId(null)
    }
  }
```

(`handleRoleChange`/`handleRemove`/`handleRevoke` keep their `async`/`try`/`finally` shape since they drive per-row `pendingUserId`/`pendingInvitationId` state used across two different tables in the same render — only `reload()` calls become `queryClient.invalidateQueries`. `handleInvite` becomes sync-dispatching since its "inviting" affordance is fully owned by `inviteMutation.isPending` now.)

- [ ] **Step 4: Update JSX call sites**

Replace the invite dialog's submit button:

```tsx
                      onClick={() => void handleInvite()}
                      loading={inviting}
```

with:

```tsx
                      onClick={handleInvite}
                      loading={inviteMutation.isPending}
```

Replace both remaining `disabled={inviting}` occurrences (the email input and the tier select) with `disabled={inviteMutation.isPending}`. The `team === null` / `roles` reads elsewhere in the JSX already resolve correctly from Step 2's derived `team`/`roles` constants — no further changes needed.

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=ops`
Run: `turbo lint --filter=ops`
Manual: visit `/team`, invite a member, change a role, remove a member, revoke an invitation — confirm the table updates without a full page reload and the roles dropdown stays in sync.

- [ ] **Step 6: Commit**

```bash
git add apps/ops/components/team-view.tsx
git commit -m "refactor(ops): migrate team-view.tsx to TanStack Query"
```

---

## Task 5: Convert `apps/ops/components/roles-view.tsx`

**Files:**
- Modify: `apps/ops/components/roles-view.tsx:1-262`

**Interfaces:**
- Consumes/produces the same `["ops-roles"]` query key as Task 4 and Task 6 — mutations here invalidate it so `team-view.tsx`'s role dropdown and `admins-view.tsx` stay consistent.

- [ ] **Step 1: Update imports**

Replace line 3 `import { useEffect, useState } from "react"` — add after it:

```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 154-188)**

Replace:

```ts
  const client = useOpsClient()
  const [roles, setRoles] = useState<OpsRoleDto[] | null>(null)
  const [edits, setEdits] = useState<Record<number, RoleEdit>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OpsRoleDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRolePermissions, setNewRolePermissions] = useState<OpsPermission[]>([])
  const [creating, setCreating] = useState(false)

  function reload() {
    client.roles
      .list()
      .then((res) => setRoles(res.items))
      .catch((err) => toast.error(formatApiError(err)))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client])

  // Seeds edits for new roles without clobbering in-progress edits on reload.
  useEffect(() => {
    if (!roles) return
    setEdits((prev) => {
      const next: Record<number, RoleEdit> = {}
      for (const role of roles) {
        next[role.id] = prev[role.id] ?? { name: role.name, permissions: role.permissions }
      }
      return next
    })
  }, [roles])
```

with:

```ts
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const [edits, setEdits] = useState<Record<number, RoleEdit>>({})
  const [deleteTarget, setDeleteTarget] = useState<OpsRoleDto | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [newRolePermissions, setNewRolePermissions] = useState<OpsPermission[]>([])

  const rolesQuery = useQuery({
    queryKey: ["ops-roles"],
    queryFn: () => client.roles.list(),
  })
  const roles = rolesQuery.data?.items ?? null

  // Seeds edits for new roles without clobbering in-progress edits on refetch.
  useEffect(() => {
    if (!roles) return
    setEdits((prev) => {
      const next: Record<number, RoleEdit> = {}
      for (const role of roles) {
        next[role.id] = prev[role.id] ?? { name: role.name, permissions: role.permissions }
      }
      return next
    })
  }, [roles])
```

- [ ] **Step 3: Convert mutations (lines 215-261)**

Replace `handleSave`, `handleDelete`, `handleCreate` with:

```ts
  const saveMutation = useMutation({
    mutationFn: (role: OpsRoleDto) => {
      const edit = edits[role.id]!
      return client.roles.update(role.id, { name: edit.name.trim(), permissions: edit.permissions })
    },
    onSuccess: (_result, role) => {
      toast.success("Updated \"" + edits[role.id]!.name.trim() + "\"")
      void queryClient.invalidateQueries({ queryKey: ["ops-roles"] })
    },
    onError: (err) => toast.error(formatApiError(err)),
  })
  function handleSave(role: OpsRoleDto) {
    const edit = edits[role.id]
    if (!edit || !edit.name.trim()) return
    saveMutation.mutate(role)
  }
  const savingId = saveMutation.isPending ? saveMutation.variables?.id ?? null : null

  const deleteMutation = useMutation({
    mutationFn: (role: OpsRoleDto) => client.roles.delete(role.id),
    onSuccess: (_result, role) => {
      toast.success("Deleted \"" + role.name + "\"")
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ["ops-roles"] })
    },
    onError: (err) => toast.error(formatApiError(err)),
  })
  function handleDelete(role: OpsRoleDto) {
    deleteMutation.mutate(role)
  }
  const deleting = deleteMutation.isPending

  const createMutation = useMutation({
    mutationFn: () => client.roles.create({ name: newRoleName.trim(), permissions: newRolePermissions }),
    onSuccess: () => {
      toast.success("Created \"" + newRoleName.trim() + "\"")
      resetNewRole()
      setCreateOpen(false)
      void queryClient.invalidateQueries({ queryKey: ["ops-roles"] })
    },
    onError: (err) => toast.error(formatApiError(err)),
  })
  function handleCreate() {
    if (!newRoleName.trim()) return
    createMutation.mutate()
  }
  const creating = createMutation.isPending
```

- [ ] **Step 4: Update JSX call sites**

Replace `onClick={() => void handleSave(role)}` with `onClick={() => handleSave(role)}`.
Replace `onClick={() => void handleCreate()}` with `onClick={handleCreate}`.
Replace `onClick={() => deleteTarget && void handleDelete(deleteTarget)}` with `onClick={() => deleteTarget && handleDelete(deleteTarget)}`.
All other JSX reads of `savingId`, `deleting`, `creating` need no change since they now resolve to the derived `const`s from Step 3.

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=ops`
Run: `turbo lint --filter=ops`
Manual: visit `/team` -> Roles tab, rename a role, toggle a permission and save, create a role, delete a role (with zero members). Confirm the matrix updates without a full reload and `/team`'s Members tab role dropdown reflects the change on next visit.

- [ ] **Step 6: Commit**

```bash
git add apps/ops/components/roles-view.tsx
git commit -m "refactor(ops): migrate roles-view.tsx to TanStack Query"
```

---

## Task 6: Convert `apps/ops/components/admins-view.tsx`

Read-only — no mutations, shares the `["ops-team"]` key with `team-view.tsx`.

**Files:**
- Modify: `apps/ops/components/admins-view.tsx:1-133`

**Interfaces:**
- Consumes: `["ops-team"]` query key (Task 4).

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useEffect, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace the fetch block (lines 101-111)**

Replace:

```ts
export function AdminsView() {
  const client = useOpsClient()
  const [team, setTeam] = useState<TeamDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  useEffect(() => {
    client.team
      .list()
      .then(setTeam)
      .catch((err) => setError(formatApiError(err)))
  }, [client])
```

with:

```ts
export function AdminsView() {
  const client = useOpsClient()
  const [sorting, setSorting] = useState<SortingState>([])

  const teamQuery = useQuery({
    queryKey: ["ops-team"],
    queryFn: () => client.team.list(),
  })
  const team = teamQuery.data ?? null
  const error = teamQuery.isError ? formatApiError(teamQuery.error) : null
```

- [ ] **Step 3: No mutation changes needed** — this file has no writes.

- [ ] **Step 4: Verify**

Run: `turbo typecheck --filter=ops`
Run: `turbo lint --filter=ops`
Manual: visit the Admins view, confirm it still lists team members, and that inviting/removing a member from `/team` (Task 4) is reflected here after `["ops-team"]` invalidates (may require a navigation/refetch since this view doesn't poll).

- [ ] **Step 5: Commit**

```bash
git add apps/ops/components/admins-view.tsx
git commit -m "refactor(ops): migrate admins-view.tsx to TanStack Query"
```

---

## Task 7: Convert `apps/ops/components/platform-users-view.tsx`

**Files:**
- Modify: `apps/ops/components/platform-users-view.tsx:1-215`

**Interfaces:**
- Produces query key `["ops-platform-users", type, { search, page, sortBy, sortDir }]`.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useRef, useState } from "react"
```

with:

```ts
import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 127-174)**

Replace:

```ts
export function PlatformUsersView({ type }: { type: PlatformUserType }) {
  const client = useOpsClient()

  const [users, setUsers] = useState<PlatformUserDto[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sort = sorting[0]
  const sortBy = sort && SORTABLE_FIELDS.includes(sort.id as SortableField) ? (sort.id as SortableField) : undefined
  const sortDir = sort?.desc ? "desc" : "asc"

  const fetchSeq = useRef(0)

  const fetchPage = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    setError(null)
    try {
      const result = await client.users.list({
        type,
        query: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        sortBy,
        sortDir,
      })
      if (seq !== fetchSeq.current) return
      setUsers(result.users)
      setTotal(result.total)
    } catch (err) {
      if (seq !== fetchSeq.current) return
      setError(formatApiError(err))
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [client, type, search, page, sortBy, sortDir])

  useEffect(() => {
    void fetchPage()
  }, [fetchPage])

  useEffect(() => {
    setPage(1)
  }, [search, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
```

with:

```ts
export function PlatformUsersView({ type }: { type: PlatformUserType }) {
  const client = useOpsClient()

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([])

  const sort = sorting[0]
  const sortBy = sort && SORTABLE_FIELDS.includes(sort.id as SortableField) ? (sort.id as SortableField) : undefined
  const sortDir = sort?.desc ? "desc" : "asc"

  const usersQuery = useQuery({
    queryKey: ["ops-platform-users", type, { search, page, sortBy, sortDir }],
    queryFn: () =>
      client.users.list({
        type,
        query: search || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        sortBy,
        sortDir,
      }),
    placeholderData: keepPreviousData,
  })
  const users = usersQuery.data?.users ?? []
  const total = usersQuery.data?.total ?? 0
  const loading = usersQuery.isLoading
  const error = usersQuery.isError ? formatApiError(usersQuery.error) : null

  useEffect(() => {
    setPage(1)
  }, [search, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
```

- [ ] **Step 3: No mutation changes needed** — this file has no writes.

- [ ] **Step 4: Verify**

Run: `turbo typecheck --filter=ops`
Run: `turbo lint --filter=ops`
Manual: visit the platform users pages, confirm search/sort/pagination refetch without full-page flicker (`keepPreviousData`), and that navigating away and back is instant within 30s (cache hit, visible in Devtools).

- [ ] **Step 5: Commit**

```bash
git add apps/ops/components/platform-users-view.tsx
git commit -m "refactor(ops): migrate platform-users-view.tsx to TanStack Query"
```

---

## Task 8: Convert `apps/ops/app/(dashboard)/activity/activity-view.tsx`

**Files:**
- Modify: `apps/ops/app/(dashboard)/activity/activity-view.tsx:1-249`

**Interfaces:**
- Produces query key `["ops-activity", { entityType, action, app, page, sortDir }]`.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useRef, useState } from "react"
```

with:

```ts
import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 103-145)**

Replace:

```ts
export function ActivityView() {
  const client = useOpsClient()
  const [data, setData] = useState<Paginated<AuditEventDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState<string>(ALL)
  const [action, setAction] = useState<string>(ALL)
  const [app, setApp] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchSeq = useRef(0)
  const sortDir = sorting[0]?.desc === false ? "asc" : "desc"

  const refresh = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    try {
      const result = await client.audit.list({
        page,
        pageSize: 50,
        entity_type: entityType === ALL ? undefined : entityType,
        action: action === ALL ? undefined : action,
        app: app === ALL ? undefined : app,
        sortBy: "created_at",
        sortDir,
      })
      if (seq !== fetchSeq.current) return
      setData(result)
    } catch (e) {
      if (seq !== fetchSeq.current) return
      toast.error(formatApiError(e))
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [client, entityType, action, app, page, sortDir])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    setPage(1)
  }, [entityType, action, app, sortDir])
```

with:

```ts
export function ActivityView() {
  const client = useOpsClient()
  const [entityType, setEntityType] = useState<string>(ALL)
  const [action, setAction] = useState<string>(ALL)
  const [app, setApp] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([])

  const sortDir = sorting[0]?.desc === false ? "asc" : "desc"

  const activityQuery = useQuery({
    queryKey: ["ops-activity", { entityType, action, app, page, sortDir }],
    queryFn: () =>
      client.audit.list({
        page,
        pageSize: 50,
        entity_type: entityType === ALL ? undefined : entityType,
        action: action === ALL ? undefined : action,
        app: app === ALL ? undefined : app,
        sortBy: "created_at",
        sortDir,
      }),
    placeholderData: keepPreviousData,
  })
  const data = activityQuery.data ?? null
  const loading = activityQuery.isLoading
  const refresh = () => activityQuery.refetch()

  useEffect(() => {
    if (activityQuery.isError) toast.error(formatApiError(activityQuery.error))
  }, [activityQuery.isError, activityQuery.error])

  useEffect(() => {
    setPage(1)
  }, [entityType, action, app, sortDir])
```

- [ ] **Step 3: No mutation changes needed** — this file has no writes. The Refresh button already calls `refresh()`, which now maps to `activityQuery.refetch()`.

- [ ] **Step 4: Update JSX call sites**

No textual change needed at the Refresh button — `onClick={() => void refresh()}` remains valid since `refresh` now returns `Promise<QueryObserverResult>`.

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=ops`
Run: `turbo lint --filter=ops`
Manual: visit `/activity`, confirm filters/sort/pagination refetch, and the Refresh button re-fetches the current page.

- [ ] **Step 6: Commit**

```bash
git add "apps/ops/app/(dashboard)/activity/activity-view.tsx"
git commit -m "refactor(ops): migrate activity-view.tsx to TanStack Query"
```

---

## Task 9: Convert `apps/ops/app/(dashboard)/support/support-view.tsx`

**Files:**
- Modify: `apps/ops/app/(dashboard)/support/support-view.tsx:1-324`

**Interfaces:**
- Produces query key `["ops-support", { search: debouncedSearch, status, category, page, sortBy, sortDir }]`.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useRef, useState } from "react"
```

with:

```ts
import { useEffect, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 167-214)**

Replace:

```ts
export function SupportView() {
  const client = useOpsClient()
  const [data, setData] = useState<Paginated<SupportCaseDto> | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [category, setCategory] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([])

  const fetchSeq = useRef(0)
  const sort = sorting[0]
  const sortBy = sort?.id === "status" ? "status" : "created_at"
  const sortDir = sort?.desc === false ? "asc" : "desc"

  const refresh = useCallback(async () => {
    const seq = ++fetchSeq.current
    setLoading(true)
    setFetchError(null)
    try {
      const result = await client.support.list({
        page,
        pageSize: 50,
        search: search || undefined,
        status: status === ALL ? undefined : status,
        category: category === ALL ? undefined : category,
        sortBy,
        sortDir,
      })
      if (seq !== fetchSeq.current) return
      setData(result)
    } catch (e) {
      if (seq !== fetchSeq.current) return
      setFetchError(formatApiError(e))
    } finally {
      if (seq === fetchSeq.current) setLoading(false)
    }
  }, [client, search, status, category, page, sortBy, sortDir])

  useEffect(() => {
    const timeout = setTimeout(() => void refresh(), search ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [refresh, search])

  useEffect(() => {
    setPage(1)
  }, [search, status, category, sortBy, sortDir])
```

with:

```ts
export function SupportView() {
  const client = useOpsClient()
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [status, setStatus] = useState<string>(ALL)
  const [category, setCategory] = useState<string>(ALL)
  const [page, setPage] = useState(1)
  const [sorting, setSorting] = useState<SortingState>([])

  const sort = sorting[0]
  const sortBy = sort?.id === "status" ? "status" : "created_at"
  const sortDir = sort?.desc === false ? "asc" : "desc"

  // Debounce the search box before it feeds the query key, same 300ms the
  // original hand-rolled refresh() used — an empty search applies instantly.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), search ? 300 : 0)
    return () => clearTimeout(timeout)
  }, [search])

  const supportQuery = useQuery({
    queryKey: ["ops-support", { search: debouncedSearch, status, category, page, sortBy, sortDir }],
    queryFn: () =>
      client.support.list({
        page,
        pageSize: 50,
        search: debouncedSearch || undefined,
        status: status === ALL ? undefined : status,
        category: category === ALL ? undefined : category,
        sortBy,
        sortDir,
      }),
    placeholderData: keepPreviousData,
  })
  const data = supportQuery.data ?? null
  const loading = supportQuery.isLoading
  const fetchError = supportQuery.isError ? formatApiError(supportQuery.error) : null
  const refresh = () => supportQuery.refetch()

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, category, sortBy, sortDir])
```

- [ ] **Step 3: No mutation changes needed** — this file has no writes.

- [ ] **Step 4: Update JSX call sites**

No textual change needed — `onRetry={() => void refresh()}` remains valid since `refresh` remains a callable returning a promise.

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=ops`
Run: `turbo lint --filter=ops`
Manual: visit `/support`, type in the search box (confirm the 300ms debounce still applies before refetching), change status/category filters, sort, and paginate.

- [ ] **Step 6: Commit**

```bash
git add "apps/ops/app/(dashboard)/support/support-view.tsx"
git commit -m "refactor(ops): migrate support-view.tsx to TanStack Query"
```

---

## Task 10: Convert `apps/ops/app/(dashboard)/support/[id]/case-detail-view.tsx`

**Files:**
- Modify: `apps/ops/app/(dashboard)/support/[id]/case-detail-view.tsx:1-131`

**Interfaces:**
- Produces query key `["ops-support-case", caseId]`. Mutations here also invalidate `["ops-support"]` (Task 9's list) so status/priority/assignee edits show up when navigating back to the list.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 46-71)**

Replace:

```ts
export function CaseDetailView({ caseId }: { caseId: number }) {
  const client = useOpsClient()
  const { user } = useUser()

  const [data, setData] = useState<SupportCaseDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [internalNote, setInternalNote] = useState(false)
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await client.support.get(caseId)
      setData(result)
    } catch (e) {
      toast.error(formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [client, caseId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])
```

with:

```ts
export function CaseDetailView({ caseId }: { caseId: number }) {
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const { user } = useUser()

  const [reply, setReply] = useState("")
  const [internalNote, setInternalNote] = useState(false)

  const caseQuery = useQuery({
    queryKey: ["ops-support-case", caseId],
    queryFn: () => client.support.get(caseId),
  })
  const data = caseQuery.data ?? null
  const loading = caseQuery.isLoading

  function invalidateCase() {
    void queryClient.invalidateQueries({ queryKey: ["ops-support-case", caseId] })
    void queryClient.invalidateQueries({ queryKey: ["ops-support"] })
  }
```

- [ ] **Step 3: Convert mutations (lines 73-131)**

Replace `handleUpdate`, `assignToMe`, `unassign`, `handleSend` (each previously calling `await load()` at the end) with:

```ts
  const updateMutation = useMutation({
    mutationFn: (patch: SupportCaseUpdateInput) => client.support.update(caseId, patch),
    onSuccess: invalidateCase,
    onError: (e) => toast.error(formatApiError(e)),
  })
  const updating = updateMutation.isPending

  function handleUpdate(patch: Pick<SupportCaseUpdateInput, "status" | "priority">) {
    updateMutation.mutate(patch)
  }

  function assignToMe() {
    if (!user) return
    updateMutation.mutate({
      assigned_to_clerk_id: user.id,
      assigned_to_email: user.primaryEmailAddress?.emailAddress ?? null,
    })
  }

  function unassign() {
    updateMutation.mutate({ assigned_to_clerk_id: null, assigned_to_email: null })
  }

  const replyMutation = useMutation({
    mutationFn: (body: SupportMessageCreateInput) => client.support.reply(caseId, body),
    onSuccess: () => {
      setReply("")
      setInternalNote(false)
      invalidateCase()
    },
    onError: (e) => toast.error(formatApiError(e)),
  })
  const sending = replyMutation.isPending

  function handleSend() {
    if (sending || !reply.trim()) return
    replyMutation.mutate({ body: reply.trim(), internal_note: internalNote })
  }
```

- [ ] **Step 4: Update JSX call sites**

Replace every `void handleUpdate(...)`, `void assignToMe()`, `void unassign()`, `void handleSend()` occurrence with the non-`void`-prefixed call, since these handlers are no longer `async`:

- `onValueChange={(value) => void handleUpdate({ status: value as SupportCaseUpdateInput["status"] })}` -> `onValueChange={(value) => handleUpdate({ status: value as SupportCaseUpdateInput["status"] })}`
- `onValueChange={(value) => void handleUpdate({ priority: value as SupportCaseUpdateInput["priority"] })}` -> `onValueChange={(value) => handleUpdate({ priority: value as SupportCaseUpdateInput["priority"] })}`
- `onClick={() => void unassign()}` -> `onClick={unassign}`
- `onClick={() => void assignToMe()}` -> `onClick={assignToMe}`
- `onClick={() => void handleSend()}` -> `onClick={handleSend}`

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=ops`
Run: `turbo lint --filter=ops`
Manual: open a case from `/support`, change status/priority, assign/unassign, send a reply and an internal note. Confirm the thread updates without a full reload, and navigating back to `/support` shows the updated status without a hard refresh.

- [ ] **Step 6: Commit**

```bash
git add "apps/ops/app/(dashboard)/support/[id]/case-detail-view.tsx"
git commit -m "refactor(ops): migrate case-detail-view.tsx to TanStack Query"
```

---

## Task 11: Convert `apps/ops/app/(dashboard)/announcements/announcements-view.tsx`

**Files:**
- Modify: `apps/ops/app/(dashboard)/announcements/announcements-view.tsx:1-150`

**Interfaces:**
- Produces query key `["ops-announcements", { page, sortDir }]`.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useEffect, useRef, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 76-101)**

Replace:

```ts
export function AnnouncementsView({ initialData }: AnnouncementsViewProps) {
  const client = useOpsClient()
  const [data, setData] = useState(initialData)
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState<PendingBroadcast | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AnnouncementDto | null>(null)
  const [viewing, setViewing] = useState<AnnouncementDto | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const sortDir = sorting[0]?.desc === false ? "asc" : "desc"

  const refresh = async (targetPage = 1) => {
    const result = await client.notifications.list({ page: targetPage, pageSize: 20, sortDir })
    setData(result)
  }

  const isFirstSort = useRef(true)
  useEffect(() => {
    if (isFirstSort.current) {
      isFirstSort.current = false
      return
    }
    void refresh(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortDir])
```

with:

```ts
export function AnnouncementsView({ initialData }: AnnouncementsViewProps) {
  const client = useOpsClient()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(initialData.page)
  const [formOpen, setFormOpen] = useState(false)
  const [pending, setPending] = useState<PendingBroadcast | null>(null)
  const [pendingDelete, setPendingDelete] = useState<AnnouncementDto | null>(null)
  const [viewing, setViewing] = useState<AnnouncementDto | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const sortDir = sorting[0]?.desc === false ? "asc" : "desc"

  const announcementsQuery = useQuery({
    queryKey: ["ops-announcements", { page, sortDir }],
    queryFn: () => client.notifications.list({ page, pageSize: 20, sortDir }),
    initialData: page === initialData.page && sortDir === "desc" ? initialData : undefined,
    placeholderData: keepPreviousData,
  })
  const data = announcementsQuery.data ?? initialData

  function changeSort(nextSorting: SortingState) {
    setSorting(nextSorting)
    setPage(1)
  }
```

(this replaces the `isFirstSort` ref with `initialData` seeding, mirroring `entity-page.tsx`'s pattern — the server-rendered `initialData` was fetched with the default `sortDir: "desc"`, so a fresh query for `{page: initialData.page, sortDir: "desc"}` reuses it instead of refetching. `changeSort` resets to page 1 whenever the sort changes, replacing the old "refetch page 1 on sort change" effect.)

- [ ] **Step 3: Convert mutations (lines 103-150)**

Replace `handleDelete` and `handleSend` (each previously calling `await refresh()`) with:

```ts
  const deleteMutation = useMutation({
    mutationFn: (announcement: AnnouncementDto) => client.notifications.delete(announcement.id),
    onSuccess: () => {
      toast.success("Announcement deleted")
      setPendingDelete(null)
      setPage(1)
      void queryClient.invalidateQueries({ queryKey: ["ops-announcements"] })
    },
    onError: (e) => toast.error(formatApiError(e)),
  })
  const deleting = deleteMutation.isPending
  const handleDelete = () => {
    if (!pendingDelete) return
    deleteMutation.mutate(pendingDelete)
  }

  const sendMutation = useMutation({
    mutationFn: async (broadcast: PendingBroadcast) => {
      let imageUrl = broadcast.image_url ?? undefined
      if (broadcast.imageBlob) {
        const uploaded = await client.notifications.uploadImage(
          new File([broadcast.imageBlob], "announcement.jpg", { type: "image/jpeg" }),
        )
        imageUrl = uploaded.url
      }
      return client.notifications.broadcast({
        title: broadcast.title,
        body: broadcast.body,
        category: broadcast.category as
          | "announcement"
          | "campaign"
          | "billing"
          | "promo"
          | "system",
        target_apps: broadcast.targetApps as ("customer-mobile" | "driver-mobile")[],
        image_url: imageUrl ?? null,
      })
    },
    onSuccess: (_result, broadcast) => {
      toast.success(broadcast.mode === "resend" ? "Announcement resent" : "Announcement sent")
      setPending(null)
      setFormOpen(false)
      setPage(1)
      void queryClient.invalidateQueries({ queryKey: ["ops-announcements"] })
    },
    onError: (e) => toast.error(formatApiError(e)),
  })
  const saving = sendMutation.isPending
  const handleSend = () => {
    if (!pending) return
    sendMutation.mutate(pending)
  }
```

- [ ] **Step 4: Update JSX call sites**

- `onSortingChange={setSorting}` -> `onSortingChange={changeSort}`.
- `onPageChange={(nextPage) => void refresh(nextPage)}` -> `onPageChange={setPage}`.
- `onClick={(e) => { e.preventDefault(); void handleSend() }}` -> `onClick={(e) => { e.preventDefault(); handleSend() }}`.
- `onClick={(e) => { e.preventDefault(); void handleDelete() }}` -> `onClick={(e) => { e.preventDefault(); handleDelete() }}`.

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=ops`
Run: `turbo lint --filter=ops`
Manual: visit `/announcements`, send a new announcement, resend an existing one, delete one, sort by date, and paginate. Confirm the table updates without a manual reload.

- [ ] **Step 6: Commit**

```bash
git add "apps/ops/app/(dashboard)/announcements/announcements-view.tsx"
git commit -m "refactor(ops): migrate announcements-view.tsx to TanStack Query"
```

---

## Task 12: Convert `apps/ops/app/(dashboard)/driver-applications/driver-applications-view.tsx`

**Files:**
- Modify: `apps/ops/app/(dashboard)/driver-applications/driver-applications-view.tsx:1-163`

**Interfaces:**
- Produces query key `["ops-driver-applications", { page, status }]`.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 90-122)**

Replace:

```ts
export function DriverApplicationsView({
  initialData,
}: {
  initialData: PaginatedResponse<DriverApplicationListItemDto>
}) {
  const client = useOpsClient()
  const [data, setData] = useState(initialData)
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all")
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (page: number, statusFilter: string) => {
      setLoading(true)
      try {
        const result = await client.driverApplications.list({
          page,
          status: statusFilter === "all" ? undefined : statusFilter,
        })
        setData(result)
      } catch (e) {
        toast.error(formatApiError(e))
      } finally {
        setLoading(false)
      }
    },
    [client],
  )

  useEffect(() => {
    if (status === "all" && data.page === initialData.page) return
    void load(1, status)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])
```

with:

```ts
export function DriverApplicationsView({
  initialData,
}: {
  initialData: PaginatedResponse<DriverApplicationListItemDto>
}) {
  const client = useOpsClient()
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all")
  const [page, setPage] = useState(initialData.page)

  const applicationsQuery = useQuery({
    queryKey: ["ops-driver-applications", { page, status }],
    queryFn: () =>
      client.driverApplications.list({
        page,
        status: status === "all" ? undefined : status,
      }),
    initialData: page === initialData.page && status === "all" ? initialData : undefined,
    placeholderData: keepPreviousData,
  })
  const data = applicationsQuery.data ?? initialData
  const loading = applicationsQuery.isLoading

  function changeStatus(next: (typeof STATUS_FILTERS)[number]) {
    setStatus(next)
    setPage(1)
  }
```

(mirrors Task 11: `initialData` handles the "don't refetch page 1 with no filter" case that the old effect special-cased, and `changeStatus` folds in the "reset to page 1 on filter change" behavior instead of a separate effect. `formatApiError`/`toast` are no longer called directly here since this file currently has no error UI, matching its original silent-toast-only behavior; if a toast on error is still desired, add: `useEffect(() => { if (applicationsQuery.isError) toast.error(formatApiError(applicationsQuery.error)) }, [applicationsQuery.isError, applicationsQuery.error])` and re-add `useEffect` to the Step 1 import list.)

- [ ] **Step 3: No mutation changes needed** — this file has no writes.

- [ ] **Step 4: Update JSX call sites**

Replace `<Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>` with `<Select value={status} onValueChange={(v) => changeStatus(v as typeof status)}>`.
Replace `onPageChange={(page) => void load(page, status)}` with `onPageChange={setPage}`.

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=ops`
Run: `turbo lint --filter=ops`
Manual: visit `/driver-applications`, filter by status, paginate. Confirm the table updates without a manual reload and initial SSR data isn't re-fetched unnecessarily on first paint.

- [ ] **Step 6: Commit**

```bash
git add "apps/ops/app/(dashboard)/driver-applications/driver-applications-view.tsx"
git commit -m "refactor(ops): migrate driver-applications-view.tsx to TanStack Query"
```

---

## apps/driver-web tasks

## Task 13: Convert `apps/driver-web/components/settings/driver-verification-section.tsx`

**Files:**
- Modify: `apps/driver-web/components/settings/driver-verification-section.tsx:1-181`

**Interfaces:**
- Produces query key `["driver-profile"]`. Task 17 (`submitted-info-view.tsx`) and Task 15 (`document-upload-field.tsx`) read the `profile` this query produces via props, not via their own query for the profile itself (only for per-document previews).

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 63-80)**

Replace:

```ts
export function DriverVerificationSection() {
  const { getToken } = useAuth()
  const [profile, setProfile] = useState<DriverProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [stepperOpen, setStepperOpen] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchDriverProfileClient(getToken)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  if (loading || !profile) {
    return <DriverVerificationSectionSkeleton />
  }
```

with:

```ts
export function DriverVerificationSection() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [stepperOpen, setStepperOpen] = useState(false)
  const [showInfo, setShowInfo] = useState(false)

  const profileQuery = useQuery({
    queryKey: ["driver-profile"],
    queryFn: () => fetchDriverProfileClient(getToken),
  })
  const profile = profileQuery.data ?? null

  if (profileQuery.isLoading || !profile) {
    return <DriverVerificationSectionSkeleton />
  }
```

(matches the original's "swallow the error, stay on the skeleton" behavior since `profile` stays `null` on error either way.)

- [ ] **Step 3: Update the stepper's completion callback**

Replace:

```tsx
              onSubmitted={(updated) => {
                setProfile(updated)
                setStepperOpen(false)
              }}
```

with:

```tsx
              onSubmitted={(updated) => {
                queryClient.setQueryData(["driver-profile"], updated)
                setStepperOpen(false)
              }}
```

- [ ] **Step 4: Verify**

Run: `turbo typecheck --filter=driver-web`
Run: `turbo lint --filter=driver-web`
Manual: visit driver Settings, confirm the verification card loads, complete/continue the profile stepper, confirm the card updates immediately after submission without a manual reload.

- [ ] **Step 5: Commit**

```bash
git add apps/driver-web/components/settings/driver-verification-section.tsx
git commit -m "refactor(driver-web): migrate driver-verification-section.tsx to TanStack Query"
```

---

## Task 14: Convert `apps/driver-web/components/shell/notification-bell.tsx`

Replaces manual `setInterval` polling with `refetchInterval`.

**Files:**
- Modify: `apps/driver-web/components/shell/notification-bell.tsx:1-107`

**Interfaces:**
- Produces query key `["driver-notifications"]`, polled every `POLL_INTERVAL_MS` (60,000ms) via `refetchInterval`.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

`DriverNotificationDto` is already imported and needed for the `setQueryData` generic — no change to that import.

- [ ] **Step 2: Replace state/fetch block (lines 35-61)**

Replace:

```ts
export function NotificationBell() {
  const { getToken } = useAuth()
  const [notifications, setNotifications] = useState<DriverNotificationDto[]>([])
  const [open, setOpen] = useState(false)

  const load = useCallback(() => {
    fetchDriverNotifications(getToken)
      .then(setNotifications)
      .catch(() => {})
  }, [getToken])

  useEffect(() => {
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && unreadCount > 0) {
      const readAt = new Date().toISOString()
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? readAt })))
      markDriverNotificationsRead(getToken).catch(() => {})
    }
  }
```

with:

```ts
export function NotificationBell() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const notificationsQuery = useQuery({
    queryKey: ["driver-notifications"],
    queryFn: () => fetchDriverNotifications(getToken),
    refetchInterval: POLL_INTERVAL_MS,
  })
  const notifications = notificationsQuery.data ?? []

  const markReadMutation = useMutation({
    mutationFn: () => markDriverNotificationsRead(getToken),
  })

  const unreadCount = notifications.filter((n) => !n.read_at).length

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && unreadCount > 0) {
      const readAt = new Date().toISOString()
      queryClient.setQueryData<DriverNotificationDto[]>(["driver-notifications"], (prev) =>
        prev?.map((n) => ({ ...n, read_at: n.read_at ?? readAt })) ?? prev,
      )
      markReadMutation.mutate()
    }
  }
```

(`markReadMutation.mutate()` is fire-and-forget with no `onError` handler, matching the original's `.catch(() => {})` — a failed mark-as-read silently leaves the optimistic local state as-is, same as before.)

- [ ] **Step 3: Verify**

Run: `turbo typecheck --filter=driver-web`
Run: `turbo lint --filter=driver-web`
Manual: confirm the bell polls every 60s (visible via Devtools' query refetch), opening it with unread notifications marks them read immediately in the UI, and the count clears.

- [ ] **Step 4: Commit**

```bash
git add apps/driver-web/components/shell/notification-bell.tsx
git commit -m "refactor(driver-web): migrate notification-bell.tsx to TanStack Query"
```

---

## Task 15: Convert `apps/driver-web/components/profile-setup/document-upload-field.tsx`

**Files:**
- Modify: `apps/driver-web/components/profile-setup/document-upload-field.tsx:1-143`

**Interfaces:**
- Produces/shares query key `["driver-document-preview", documentId]` with Task 17's `SubmittedInfoView`/`DocumentThumb` — both components preview the same uploaded documents, so sharing the key means a preview fetched in one place is reused in the other.

- [ ] **Step 1: Update imports**

Replace line 3 `import { useEffect, useRef, useState } from "react"` — add after it:

```ts
import { useMutation, useQuery } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace the preview-fetch effect (lines 33-60) with `useQuery`**

Replace:

```ts
  const { getToken } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    if (document) {
      fetchDriverDocumentObjectUrl(getToken, document.id)
        .then((url) => {
          if (cancelled) return
          objectUrl = url
          setPreviewUrl(url)
        })
        .catch(() => {
          if (!cancelled) setPreviewUrl(null)
        })
    } else {
      setPreviewUrl(null)
    }

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [document?.id])
```

with:

```ts
  const { getToken } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const previewQuery = useQuery({
    queryKey: ["driver-document-preview", document?.id],
    queryFn: () => fetchDriverDocumentObjectUrl(getToken, document!.id),
    enabled: Boolean(document),
  })
  const previewUrl = previewQuery.data ?? null

  // Object URLs aren't cache-safe across query-key changes — revoke the
  // previous one whenever the URL this component is showing changes or it
  // unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])
```

- [ ] **Step 3: Convert the upload handler (lines 62-82) to `useMutation`**

Replace:

```ts
  async function handleFile(file: File) {
    setError(null)
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size > MAX_BYTES) {
      setError("File must be under 8MB.")
      return
    }

    setUploading(true)
    try {
      const doc = await uploadDriverDocument(getToken, type, file)
      onUploaded(doc)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }
```

with:

```ts
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDriverDocument(getToken, type, file),
    onSuccess: (doc) => onUploaded(doc),
    onError: (err) => setError(err instanceof Error ? err.message : "Upload failed"),
  })
  const uploading = uploadMutation.isPending

  function handleFile(file: File) {
    setError(null)
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size > MAX_BYTES) {
      setError("File must be under 8MB.")
      return
    }
    uploadMutation.mutate(file)
  }
```

- [ ] **Step 4: Update JSX call site**

Replace `if (file) void handleFile(file)` with `if (file) handleFile(file)`.

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=driver-web`
Run: `turbo lint --filter=driver-web`
Manual: in the profile setup stepper, upload a document, confirm the preview thumbnail appears, replace it, confirm error messages appear for oversized/wrong-type files.

- [ ] **Step 6: Commit**

```bash
git add apps/driver-web/components/profile-setup/document-upload-field.tsx
git commit -m "refactor(driver-web): migrate document-upload-field.tsx to TanStack Query"
```

---

## Task 16: Convert `apps/driver-web/app/(shell)/settings/support/[id]/case-thread-client.tsx`

Replaces manual `setInterval` polling with `refetchInterval`.

**Files:**
- Modify: `apps/driver-web/app/(shell)/settings/support/[id]/case-thread-client.tsx:1-77`

**Interfaces:**
- Produces query key `["driver-support-case", caseId]`, polled every 15,000ms.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 28-63)**

Replace:

```ts
export function CaseThreadClient({ caseId }: { caseId: number }) {
  const [subject, setSubject] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [contactName, setContactName] = useState<string>("You")
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(caseId)) return
    const data = await getSupportCase(caseId)
    if (data) {
      setSubject(data.subject)
      setStatus(data.status)
      setCategory(data.category)
      setCreatedAt(data.created_at)
      setContactName(data.contact_name)
      setMessages(data.messages)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }, [caseId])

  useEffect(() => {
    // Initial fetch plus poll — syncing from the API, an external system, is
    // exactly what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  async function handleSend() {
    if (sending || !reply.trim()) return
    setSending(true)
    try {
      await replyToSupportCase(caseId, reply.trim())
      setReply("")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your reply.")
    } finally {
      setSending(false)
    }
  }
```

with:

```ts
export function CaseThreadClient({ caseId }: { caseId: number }) {
  const queryClient = useQueryClient()
  const [reply, setReply] = useState("")

  const caseQuery = useQuery({
    queryKey: ["driver-support-case", caseId],
    queryFn: () => getSupportCase(caseId),
    enabled: Number.isFinite(caseId),
    refetchInterval: POLL_INTERVAL_MS,
  })
  const loading = caseQuery.isLoading
  const notFound = !caseQuery.isLoading && caseQuery.data === null
  const subject = caseQuery.data?.subject ?? null
  const status = caseQuery.data?.status ?? null
  const category = caseQuery.data?.category ?? null
  const createdAt = caseQuery.data?.created_at ?? null
  const contactName = caseQuery.data?.contact_name ?? "You"
  const messages: SupportMessage[] = caseQuery.data?.messages ?? []

  const replyMutation = useMutation({
    mutationFn: (body: string) => replyToSupportCase(caseId, body),
    onSuccess: () => {
      setReply("")
      void queryClient.invalidateQueries({ queryKey: ["driver-support-case", caseId] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't send your reply."),
  })
  const sending = replyMutation.isPending

  function handleSend() {
    if (sending || !reply.trim()) return
    replyMutation.mutate(reply.trim())
  }
```

- [ ] **Step 3: No JSX changes needed** — `onClick={handleSend}` already passes the function reference, and `handleSend` is no longer `async` but is still a valid `() => void` handler.

- [ ] **Step 4: Verify**

Run: `turbo typecheck --filter=driver-web`
Run: `turbo lint --filter=driver-web`
Manual: open a support case thread, confirm it polls every 15s for ops replies, send a reply, confirm it appears immediately.

- [ ] **Step 5: Commit**

```bash
git add "apps/driver-web/app/(shell)/settings/support/[id]/case-thread-client.tsx"
git commit -m "refactor(driver-web): migrate case-thread-client.tsx to TanStack Query"
```

---

## Task 17: Convert `apps/driver-web/components/settings/submitted-info-view.tsx`

**Files:**
- Modify: `apps/driver-web/components/settings/submitted-info-view.tsx:1-91` (the `DocumentThumb` subcomponent only — `SubmittedInfoView` itself has no fetch)

**Interfaces:**
- Consumes/produces the same `["driver-document-preview", documentId]` key as Task 15.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useEffect, useState } from "react"
```

with:

```ts
import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace `DocumentThumb`'s fetch effect (lines 37-61)**

Replace:

```ts
function DocumentThumb({ doc, getToken }: { doc: DriverDocumentDto; getToken: GetToken }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setFailed(false)
    fetchDriverDocumentObjectUrl(getToken, doc.id)
      .then((u) => {
        if (cancelled) return
        objectUrl = u
        setUrl(u)
      })
      .catch((error) => {
        console.error("[SubmittedInfoView] failed to load document preview:", error)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, attempt])

  const label = DOCUMENT_LABELS[doc.type] ?? doc.type
```

with:

```ts
function DocumentThumb({ doc, getToken }: { doc: DriverDocumentDto; getToken: GetToken }) {
  const previewQuery = useQuery({
    queryKey: ["driver-document-preview", doc.id],
    queryFn: () => fetchDriverDocumentObjectUrl(getToken, doc.id),
  })
  const url = previewQuery.data ?? null
  const failed = previewQuery.isError

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  const label = DOCUMENT_LABELS[doc.type] ?? doc.type
```

- [ ] **Step 3: Update JSX retry button**

Replace:

```tsx
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="flex h-36 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted"
        >
```

with:

```tsx
        <button
          type="button"
          onClick={() => void previewQuery.refetch()}
          className="flex h-36 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted"
        >
```

- [ ] **Step 4: Verify**

Run: `turbo typecheck --filter=driver-web`
Run: `turbo lint --filter=driver-web`
Manual: expand "View your submitted information" in driver Settings, confirm document thumbnails load (and reuse the cache from Task 15's upload field previews for the same document id), and the retry button works on a forced failure.

- [ ] **Step 5: Commit**

```bash
git add apps/driver-web/components/settings/submitted-info-view.tsx
git commit -m "refactor(driver-web): migrate submitted-info-view.tsx's DocumentThumb to TanStack Query"
```

---

## Task 18: Convert `apps/driver-web/app/(shell)/settings/support/support-client.tsx`

**Files:**
- Modify: `apps/driver-web/app/(shell)/settings/support/support-client.tsx:1-100`

**Interfaces:**
- Produces query key `["driver-support-cases"]`.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useEffect, useState } from "react"
```

with:

```ts
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 32-71)**

Replace:

```ts
export function SupportClient() {
  const session = useDriverSession()

  const [cases, setCases] = useState<SupportCase[]>([])
  const [loadingCases, setLoadingCases] = useState(true)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState<(typeof SUPPORT_CATEGORIES)[number]["value"]>(
    "driver",
  )
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (session.status !== "anonymous") return
    // Hydrating form defaults from localStorage — an external system — is
    // exactly what this effect is for; it can only run client-side, once,
    // after the session hook resolves.
    const identity = getStoredIdentity()
    if (identity) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(identity.name)
      setEmail(identity.email)
      void refreshCases()
    } else {
      setLoadingCases(false)
    }
  }, [session.status])

  async function refreshCases() {
    setLoadingCases(true)
    try {
      const items = await listMySupportCases()
      setCases(items)
    } finally {
      setLoadingCases(false)
    }
  }
```

with:

```ts
export function SupportClient() {
  const session = useDriverSession()
  const queryClient = useQueryClient()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState<(typeof SUPPORT_CATEGORIES)[number]["value"]>(
    "driver",
  )
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  // getStoredIdentity() guards its own localStorage access for SSR/private
  // browsing, so it's safe to call during render — memoized on session
  // status so it's not re-parsed (and re-triggering the effect below) every
  // render.
  const identity = useMemo(
    () => (session.status === "anonymous" ? getStoredIdentity() : null),
    [session.status],
  )

  useEffect(() => {
    if (!identity) return
    setName(identity.name)
    setEmail(identity.email)
  }, [identity])

  const casesQuery = useQuery({
    queryKey: ["driver-support-cases"],
    queryFn: listMySupportCases,
    enabled: Boolean(identity),
  })
  const cases = casesQuery.data ?? []
  const loadingCases = Boolean(identity) && casesQuery.isLoading
```

- [ ] **Step 3: Convert the submit handler (lines 73-100) to `useMutation`**

Replace:

```ts
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || session.status !== "anonymous") return
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Fill in your name, email, subject, and message.")
      return
    }

    setSubmitting(true)
    try {
      const created = await createSupportCase({
        contact_name: name.trim(),
        contact_email: email.trim(),
        anonymous_device_id: session.deviceId,
        category,
        subject: subject.trim(),
        message: message.trim(),
      })
      setSubject("")
      setMessage("")
      toast.success("Request sent")
      await refreshCases()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your request.")
    } finally {
      setSubmitting(false)
    }
  }
```

with:

```ts
  const createCaseMutation = useMutation({
    mutationFn: (input: Parameters<typeof createSupportCase>[0]) => createSupportCase(input),
    onSuccess: (created) => {
      setSubject("")
      setMessage("")
      toast.success("Request sent - case #" + created.id)
      void queryClient.invalidateQueries({ queryKey: ["driver-support-cases"] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't send your request."),
  })
  const submitting = createCaseMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || session.status !== "anonymous") return
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Fill in your name, email, subject, and message.")
      return
    }
    createCaseMutation.mutate({
      contact_name: name.trim(),
      contact_email: email.trim(),
      anonymous_device_id: session.deviceId,
      category,
      subject: subject.trim(),
      message: message.trim(),
    })
  }
```

(the original toast text is `` `Request sent — case #${created.id}` `` — an em dash before "case #"; preserve that exact copy, the ASCII hyphen above is only for heredoc-safety in this plan document.)

- [ ] **Step 4: Verify**

Run: `turbo typecheck --filter=driver-web`
Run: `turbo lint --filter=driver-web`
Manual: visit driver Settings -> Help & contact, submit a new request, confirm it appears in "My requests" without a manual reload, and that returning identities see their case list load.

- [ ] **Step 5: Commit**

```bash
git add "apps/driver-web/app/(shell)/settings/support/support-client.tsx"
git commit -m "refactor(driver-web): migrate support-client.tsx to TanStack Query"
```

---

## Task 19: Convert `apps/driver-web/components/settings/account-settings-view.tsx`

**Files:**
- Modify: `apps/driver-web/components/settings/account-settings-view.tsx:1-178`

**Interfaces:**
- Produces query key `["driver-clerk-sessions", userId, sessionId]`.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useEffect, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 106-149)**

Replace:

```ts
export function AccountSettingsView() {
  const { user, isLoaded } = useUserIfEnabled()
  const { sessionId, signOut } = useAuthIfEnabled()

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [saving, setSaving] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  const email = user?.primaryEmailAddress?.emailAddress
  const emailVerified = user?.primaryEmailAddress?.verification?.status === "verified"
  const googleAccount = user?.externalAccounts?.find((account) => account.provider === "google")
  const initials = getInitials(fullName)
  const memberSince = formatMemberSince(user?.createdAt)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    user
      .getSessions()
      .then((list) => {
        if (cancelled) return
        setSessions(
          list.map((session) => ({
            id: session.id,
            isCurrent: session.id === sessionId,
            label: sessionDeviceLabel(session.latestActivity),
            location: sessionLocation(session.latestActivity),
            lastActiveAt: session.lastActiveAt,
            revoke: () => session.revoke(),
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setSessions([])
      })
    return () => {
      cancelled = true
    }
  }, [user, sessionId])

  if (!isLoaded) return <AccountSettingsSkeleton />
```

with:

```ts
export function AccountSettingsView() {
  const { user, isLoaded } = useUserIfEnabled()
  const { sessionId, signOut } = useAuthIfEnabled()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [signOutOpen, setSignOutOpen] = useState(false)

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  const email = user?.primaryEmailAddress?.emailAddress
  const emailVerified = user?.primaryEmailAddress?.verification?.status === "verified"
  const googleAccount = user?.externalAccounts?.find((account) => account.provider === "google")
  const initials = getInitials(fullName)
  const memberSince = formatMemberSince(user?.createdAt)

  const sessionsQueryKey = ["driver-clerk-sessions", user?.id, sessionId] as const
  const sessionsQuery = useQuery({
    queryKey: sessionsQueryKey,
    queryFn: async () => {
      const list = await user!.getSessions()
      return list.map(
        (session): SessionRow => ({
          id: session.id,
          isCurrent: session.id === sessionId,
          label: sessionDeviceLabel(session.latestActivity),
          location: sessionLocation(session.latestActivity),
          lastActiveAt: session.lastActiveAt,
          revoke: () => session.revoke(),
        }),
      )
    },
    enabled: Boolean(user),
  })
  const sessions = sessionsQuery.data ?? null

  if (!isLoaded) return <AccountSettingsSkeleton />
```

(the original's `.catch(() => setSessions([]))` fallback becomes `sessionsQuery.data` staying `undefined`, so `sessions` renders as `null` and the skeleton stays visible on error rather than showing an empty list. This is an intentional, minor behavior improvement — an error state showing "empty" as if there truly are zero sessions was misleading; if exact parity is required instead, add `placeholderData: []` to the query. Flag this to reviewers rather than silently diverging.)

- [ ] **Step 3: Convert `handleSave` and `handleRevoke` to `useMutation`**

Replace:

```ts
  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(row: SessionRow) {
    setRevokingId(row.id)
    try {
      await row.revoke()
      setSessions((prev) => prev?.filter((s) => s.id !== row.id) ?? prev)
    } finally {
      setRevokingId(null)
    }
  }
```

with:

```ts
  const updateProfileMutation = useMutation({
    mutationFn: (input: { firstName: string; lastName: string }) => user!.update(input),
    onSuccess: () => setEditing(false),
  })
  const saving = updateProfileMutation.isPending
  function handleSave() {
    if (!user) return
    updateProfileMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim() })
  }

  const revokeMutation = useMutation({
    mutationFn: (row: SessionRow) => row.revoke(),
    onSuccess: (_result, row) => {
      queryClient.setQueryData<SessionRow[]>(sessionsQueryKey, (prev) =>
        prev?.filter((s) => s.id !== row.id) ?? prev,
      )
    },
  })
  const revokingId = revokeMutation.isPending ? (revokeMutation.variables?.id ?? null) : null
  function handleRevoke(row: SessionRow) {
    revokeMutation.mutate(row)
  }
```

- [ ] **Step 4: Update JSX call sites**

Replace `onClick={() => void handleSave()}` with `onClick={handleSave}`.
Replace `onClick={() => void handleRevoke(session)}` with `onClick={() => handleRevoke(session)}`.

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=driver-web`
Run: `turbo lint --filter=driver-web`
Manual: visit driver Settings -> Account, edit and save first/last name, view active sessions, revoke a non-current session and confirm it disappears immediately, sign out.

- [ ] **Step 6: Commit**

```bash
git add apps/driver-web/components/settings/account-settings-view.tsx
git commit -m "refactor(driver-web): migrate account-settings-view.tsx to TanStack Query"
```

---

## apps/customer-web tasks

## Task 20: Convert `apps/customer-web/app/(shell)/settings/support/support-client.tsx`

**Files:**
- Modify: `apps/customer-web/app/(shell)/settings/support/support-client.tsx:1-56`

**Interfaces:**
- Produces query key `["customer-support-cases"]`.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useState } from "react"
```

with:

```ts
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 27-56)**

Replace:

```ts
export function SupportClient() {
  const router = useRouter()
  const session = useCustomerSession()

  const [cases, setCases] = useState<SupportCase[]>([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [newRequestOpen, setNewRequestOpen] = useState(false)

  const refreshCases = useCallback(async () => {
    setLoadingCases(true)
    try {
      const items = await listMySupportCases()
      setCases(items)
    } finally {
      setLoadingCases(false)
    }
  }, [])

  useEffect(() => {
    if (session.status !== "anonymous") return
    // Hydrating from localStorage — an external system — is exactly what
    // this effect is for; it can only run client-side, once, after the
    // session hook resolves.
    if (getStoredIdentity()) {
      void refreshCases()
    } else {
      setLoadingCases(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status])

  function handleCreated(caseId: number) {
    setNewRequestOpen(false)
    router.push(`/settings/support/${caseId}`)
  }
```

with:

```ts
export function SupportClient() {
  const router = useRouter()
  const session = useCustomerSession()
  const [newRequestOpen, setNewRequestOpen] = useState(false)

  // getStoredIdentity() guards its own localStorage access, so it's safe to
  // call during render — memoized on session status so its result stays
  // referentially stable across re-renders.
  const hasIdentity = useMemo(
    () => session.status === "anonymous" && Boolean(getStoredIdentity()),
    [session.status],
  )

  const casesQuery = useQuery({
    queryKey: ["customer-support-cases"],
    queryFn: listMySupportCases,
    enabled: hasIdentity,
  })
  const cases = casesQuery.data ?? []
  const loadingCases = hasIdentity && casesQuery.isLoading

  function handleCreated(caseId: number) {
    setNewRequestOpen(false)
    router.push(`/settings/support/${caseId}`)
  }
```

- [ ] **Step 3: No mutation changes needed** — case creation happens in `NewSupportRequestForm` (out of scope; not one of the target files), and the original code already only navigated away after creation without refreshing the list, so behavior is unchanged.

- [ ] **Step 4: Verify**

Run: `turbo typecheck --filter=customer-web`
Run: `turbo lint --filter=customer-web`
Manual: visit customer Settings -> Help & contact, confirm the case list loads for a returning identity and stays empty (no infinite skeleton) for a first-time anonymous visitor.

- [ ] **Step 5: Commit**

```bash
git add "apps/customer-web/app/(shell)/settings/support/support-client.tsx"
git commit -m "refactor(customer-web): migrate support-client.tsx to TanStack Query"
```

---

## Task 21: Convert `apps/customer-web/app/(shell)/settings/support/[id]/case-thread-client.tsx`

Identical structure to Task 16 (driver-web), different query key prefix.

**Files:**
- Modify: `apps/customer-web/app/(shell)/settings/support/[id]/case-thread-client.tsx:1-77`

**Interfaces:**
- Produces query key `["customer-support-case", caseId]`, polled every 15,000ms.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useCallback, useEffect, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 28-63)**

Replace:

```ts
export function CaseThreadClient({ caseId }: { caseId: number }) {
  const [subject, setSubject] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [contactName, setContactName] = useState<string>("You")
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    if (!Number.isFinite(caseId)) return
    const data = await getSupportCase(caseId)
    if (data) {
      setSubject(data.subject)
      setStatus(data.status)
      setCategory(data.category)
      setCreatedAt(data.created_at)
      setContactName(data.contact_name)
      setMessages(data.messages)
    } else {
      setNotFound(true)
    }
    setLoading(false)
  }, [caseId])

  useEffect(() => {
    // Initial fetch plus poll — syncing from the API, an external system, is
    // exactly what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [load])

  async function handleSend() {
    if (sending || !reply.trim()) return
    setSending(true)
    try {
      await replyToSupportCase(caseId, reply.trim())
      setReply("")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your reply.")
    } finally {
      setSending(false)
    }
  }
```

with:

```ts
export function CaseThreadClient({ caseId }: { caseId: number }) {
  const queryClient = useQueryClient()
  const [reply, setReply] = useState("")

  const caseQuery = useQuery({
    queryKey: ["customer-support-case", caseId],
    queryFn: () => getSupportCase(caseId),
    enabled: Number.isFinite(caseId),
    refetchInterval: POLL_INTERVAL_MS,
  })
  const loading = caseQuery.isLoading
  const notFound = !caseQuery.isLoading && caseQuery.data === null
  const subject = caseQuery.data?.subject ?? null
  const status = caseQuery.data?.status ?? null
  const category = caseQuery.data?.category ?? null
  const createdAt = caseQuery.data?.created_at ?? null
  const contactName = caseQuery.data?.contact_name ?? "You"
  const messages: SupportMessage[] = caseQuery.data?.messages ?? []

  const replyMutation = useMutation({
    mutationFn: (body: string) => replyToSupportCase(caseId, body),
    onSuccess: () => {
      setReply("")
      void queryClient.invalidateQueries({ queryKey: ["customer-support-case", caseId] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't send your reply."),
  })
  const sending = replyMutation.isPending

  function handleSend() {
    if (sending || !reply.trim()) return
    replyMutation.mutate(reply.trim())
  }
```

- [ ] **Step 3: No JSX changes needed** — `onClick={handleSend}` already passes the function reference and remains valid with `handleSend` no longer being `async`.

- [ ] **Step 4: Verify**

Run: `turbo typecheck --filter=customer-web`
Run: `turbo lint --filter=customer-web`
Manual: open a customer support case thread, confirm 15s polling, send a reply, confirm it appears immediately.

- [ ] **Step 5: Commit**

```bash
git add "apps/customer-web/app/(shell)/settings/support/[id]/case-thread-client.tsx"
git commit -m "refactor(customer-web): migrate case-thread-client.tsx to TanStack Query"
```

---

## Task 22: Convert `apps/customer-web/components/settings/account-settings-view.tsx`

Identical structure to Task 19 (driver-web), different query key prefix, plus the extra two-factor-auth display row (no fetch impact).

**Files:**
- Modify: `apps/customer-web/components/settings/account-settings-view.tsx:1-179`

**Interfaces:**
- Produces query key `["customer-clerk-sessions", userId, sessionId]`.

- [ ] **Step 1: Update imports**

Replace line 3:

```ts
import { useEffect, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block (lines 106-151)**

Replace:

```ts
export function AccountSettingsView() {
  const { user, isLoaded } = useUserIfEnabled()
  const { sessionId, signOut } = useAuthIfEnabled()

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [saving, setSaving] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  const email = user?.primaryEmailAddress?.emailAddress
  const emailVerified = user?.primaryEmailAddress?.verification?.status === "verified"
  const googleAccount = user?.externalAccounts?.find((account) => account.provider === "google")
  const initials = getInitials(fullName)
  const memberSince = formatMemberSince(user?.createdAt)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    user
      .getSessions()
      .then((list) => {
        if (cancelled) return
        setSessions(
          list.map((session) => ({
            id: session.id,
            isCurrent: session.id === sessionId,
            label: sessionDeviceLabel(session.latestActivity),
            location: sessionLocation(session.latestActivity),
            lastActiveAt: session.lastActiveAt,
            revoke: () => session.revoke(),
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setSessions([])
      })
    return () => {
      cancelled = true
    }
  }, [user, sessionId])

  if (!isLoaded) return <AccountSettingsSkeleton />
```

with:

```ts
export function AccountSettingsView() {
  const { user, isLoaded } = useUserIfEnabled()
  const { sessionId, signOut } = useAuthIfEnabled()
  const queryClient = useQueryClient()

  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [signOutOpen, setSignOutOpen] = useState(false)

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  const email = user?.primaryEmailAddress?.emailAddress
  const emailVerified = user?.primaryEmailAddress?.verification?.status === "verified"
  const googleAccount = user?.externalAccounts?.find((account) => account.provider === "google")
  const initials = getInitials(fullName)
  const memberSince = formatMemberSince(user?.createdAt)

  const sessionsQueryKey = ["customer-clerk-sessions", user?.id, sessionId] as const
  const sessionsQuery = useQuery({
    queryKey: sessionsQueryKey,
    queryFn: async () => {
      const list = await user!.getSessions()
      return list.map(
        (session): SessionRow => ({
          id: session.id,
          isCurrent: session.id === sessionId,
          label: sessionDeviceLabel(session.latestActivity),
          location: sessionLocation(session.latestActivity),
          lastActiveAt: session.lastActiveAt,
          revoke: () => session.revoke(),
        }),
      )
    },
    enabled: Boolean(user),
  })
  const sessions = sessionsQuery.data ?? null

  if (!isLoaded) return <AccountSettingsSkeleton />
```

- [ ] **Step 3: Convert `handleSave` and `handleRevoke` to `useMutation`**

Replace:

```ts
  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleRevoke(row: SessionRow) {
    setRevokingId(row.id)
    try {
      await row.revoke()
      setSessions((prev) => prev?.filter((s) => s.id !== row.id) ?? prev)
    } finally {
      setRevokingId(null)
    }
  }
```

with:

```ts
  const updateProfileMutation = useMutation({
    mutationFn: (input: { firstName: string; lastName: string }) => user!.update(input),
    onSuccess: () => setEditing(false),
  })
  const saving = updateProfileMutation.isPending
  function handleSave() {
    if (!user) return
    updateProfileMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim() })
  }

  const revokeMutation = useMutation({
    mutationFn: (row: SessionRow) => row.revoke(),
    onSuccess: (_result, row) => {
      queryClient.setQueryData<SessionRow[]>(sessionsQueryKey, (prev) =>
        prev?.filter((s) => s.id !== row.id) ?? prev,
      )
    },
  })
  const revokingId = revokeMutation.isPending ? (revokeMutation.variables?.id ?? null) : null
  function handleRevoke(row: SessionRow) {
    revokeMutation.mutate(row)
  }
```

- [ ] **Step 4: Update JSX call sites**

Replace `onClick={() => void handleSave()}` with `onClick={handleSave}`.
Replace `onClick={() => void handleRevoke(session)}` with `onClick={() => handleRevoke(session)}`.

- [ ] **Step 5: Verify**

Run: `turbo typecheck --filter=customer-web`
Run: `turbo lint --filter=customer-web`
Manual: visit customer Settings -> Account, edit and save first/last name, view active sessions, revoke a non-current session and confirm it disappears immediately, sign out.

- [ ] **Step 6: Commit**

```bash
git add apps/customer-web/components/settings/account-settings-view.tsx
git commit -m "refactor(customer-web): migrate account-settings-view.tsx to TanStack Query"
```

---

## Self-Review

**1. Spec coverage.**

- "Problem" section's four symptoms (`fetchSeq` refs, `set-state-in-effect` warnings, no cross-navigation caching, manual `reload()`) — every task removes the `fetchSeq` ref/manual loading state/`reload()` call from its file and replaces it with `useQuery`/`useMutation`, which caches by `queryKey` across navigations (Tasks 3-22 all).
- "Scope decisions" #1 (three apps in scope, `apps/web`/mobile apps out) — covered; no task touches those apps.
- "Scope decisions" #2 (shared `packages/query-client`, apps import hooks directly from `@tanstack/react-query`) — Task 1 creates the package with only `createQueryClient`/`QueryProvider` exported; every later task imports `useQuery`/`useMutation`/`useQueryClient` from `@tanstack/react-query` itself, never from `@workspace/query-client`.
- "Scope decisions" #3 (queries and mutations converted together, per file) — every task converts a file's reads and writes in the same pass; none leaves a `useQuery` read next to a manual `reload()`.
- "Scope decisions" #4 (order: ops, then driver-web, then customer-web) — Tasks 3-12 (ops), 13-19 (driver-web), 20-22 (customer-web).
- "Architecture" (`packages/query-client` shape, `<QueryProvider>` insertion point) — Task 1 matches the exact file layout (`client.ts`/`provider.tsx`/`index.ts`); Task 2 inserts `<QueryProvider>` inside `<TooltipProvider>` wrapping `{children}` in all three layouts, confirmed against each layout's actual current JSX.
- "Architecture" (`createQueryClient()` defaults, `useState(() => createQueryClient())`, dev-only Devtools) — Task 1, Step 3-4, verbatim.
- "Migration pattern" (before/after shape, query keys include filters/params, dead code deleted) — every task's query key includes the params that drove the original effect's re-fetch (page/search/status/sort/etc.), and every task explicitly removes the `fetchSeq` ref, manual loading/error state, and `reload()`/`refresh()` helper.
- "Scope: files to convert" — all 10 named `apps/ops` files got a task (Tasks 3-12). All `apps/driver-web` files from the survey list were located and got a task, except `greeting.tsx` (excluded, justified in Global Constraints, no backend fetch exists to convert). All `apps/customer-web` files from the survey list were located; `support-client.tsx`, `case-thread-client.tsx`, `account-settings-view.tsx` got tasks (Tasks 20-22); `greeting.tsx`, `wallet-view.tsx`, `campaign-detail-view.tsx` are excluded with the same "no backend fetch" justification the spec already applies to `campaigns-view.tsx`.
- "Scope: files to convert" note about polling intervals (`notification-bell.tsx`'s 60s) — Task 14 replaces the manual `setInterval` with `refetchInterval: POLL_INTERVAL_MS`; Tasks 16 and 21 do the same for the two `case-thread-client.tsx` files' 15s polling.
- "Testing" section — every task's verification step is `turbo typecheck --filter=<app>` / `turbo lint --filter=<app>` (or `--filter=@workspace/query-client` for Task 1), never a fabricated unit test, plus a manual verification checklist matching the spec's "list still loads, filters refetch, mutations update without manual reload, Devtools shows cache entries."
- "Out of scope" section — no task adds optimistic updates beyond what already existed (`notification-bell.tsx`'s pre-existing local-state-then-fire-and-forget pattern is preserved, not expanded), no task touches `driver-profile-client.ts`/`support-client.ts` internals (they're wrapped as-is inside `queryFn`/`mutationFn`, per Tasks 13-22), no task adds per-app `staleTime`/`retry` overrides.

**2. Placeholder scan.** No task contains "TBD," "implement later," "add appropriate error handling," or "similar to Task N." Every step shows the literal before/after code read from the actual files, not a description of the change. The one place behavior intentionally diverges slightly from the original (Task 19/22's `sessions` staying `null` on a Clerk `getSessions()` failure, rather than becoming `[]`) is called out explicitly as a flagged, deliberate change, not left implicit.

**3. Type consistency.**
- `useQuery`/`useMutation`/`useQueryClient` imports are consistent across every task (all from `@tanstack/react-query`, never from `@workspace/query-client`).
- Query key naming is consistent and collision-free: `ops-*` prefix for all `apps/ops` keys, `driver-*` for `apps/driver-web`, `customer-*` for `apps/customer-web`. Shared keys are intentional and match: `["ops-team"]` (Tasks 4, 6), `["ops-roles"]` (Tasks 4, 5), `["driver-document-preview", id]` (Tasks 15, 17).
- `SessionRow`'s shape (`{ id, isCurrent, label, location, lastActiveAt, revoke }`) is identical between Task 19 and Task 22, matching each file's pre-existing local type.
- `formatApiError`/`toast.error` call signatures are used consistently with their existing import sources (`@workspace/ops-api-client` for ops tasks, `sonner`'s `toast` for all).
- Every `onError`/`onSuccess` mutation callback matches the `mutationFn`'s declared parameter/return type (e.g. Task 3's `saveMutation.mutationFn: (values: Record<string, unknown>) => ...` matches `handleSubmit`'s `(values: Record<string, unknown>) => saveMutation.mutateAsync(values)`).

---

## Execution Handoff

Plan complete. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in-session using `executing-plans`, batch execution with checkpoints.
