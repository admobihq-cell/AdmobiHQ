# TanStack Query Migration — ops-mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 4 remaining `apps/ops-mobile` screens that still hand-roll `useState`+`useEffect` data fetching (`activity.tsx`, `announcements/index.tsx`, `profile.tsx`, `support/[id].tsx`) to `@tanstack/react-query`, matching patterns already used elsewhere in this app.

**Architecture:** No new infrastructure — `QueryClientProvider` is already mounted in `apps/ops-mobile/app/_layout.tsx`. Each file imports `useQuery`/`useMutation`/`useInfiniteQuery`/`useQueryClient` directly from `@tanstack/react-query` (already a dependency) and converts its fetch/mutation block in place, one file at a time. `activity.tsx` and `profile.tsx` use plain `useQuery`; `announcements/index.tsx` uses `useInfiniteQuery` (matching `driver-applications/index.tsx`, `support/index.tsx`); `support/[id].tsx` uses `useQuery` + `useMutation` with dual invalidation (matching the web app's `case-detail-view.tsx`).

**Tech Stack:** Expo Router, React 19, TypeScript, `@tanstack/react-query` ^5.101.4 (already installed), no test runner in this app.

**Spec:** `docs/superpowers/specs/2026-08-21-ops-mobile-query-migration-design.md`

## Global Constraints

- Do not modify `apps/ops-mobile/app/_layout.tsx` or the `QueryClientProvider`/`queryClient` config — it's already correct (`staleTime: 30_000`, `retry: 1`).
- Do not touch `apps/ops-mobile/app/(ops)/notifications.tsx` or `apps/ops-mobile/app/(ops)/announcements/new.tsx` — both are out of scope (no page data to cache).
- Every converted file is either untouched or fully migrated in one commit — never a `useQuery` read next to a manual reload.
- No test runner exists in this app. Verification is `turbo typecheck --filter=ops-mobile` and `turbo lint --filter=ops-mobile`, run once after all 4 files are converted (Task 5) — not after each individual task.
- Query keys: `["activity", "list"]`, `["announcements", "list"]`, `["platform-flags"]`, `["support", "detail", caseId]` — the last two segments of `support` match the existing `["support", "list", ...]` key already used by `support/index.tsx`.

---

## Task 1: Convert `apps/ops-mobile/app/(ops)/activity.tsx`

**Files:**
- Modify: `apps/ops-mobile/app/(ops)/activity.tsx:1-50` (imports through the fetch effect)
- Modify: `apps/ops-mobile/app/(ops)/activity.tsx:111-119` (error banner JSX)

**Interfaces:**
- Consumes: `useOpsClient` from `@/lib/ops-client` (unchanged).
- Produces: query key `["activity", "list"]`.

- [ ] **Step 1: Update imports**

Replace line 1:

```ts
import { useCallback, useEffect, useMemo, useState } from "react"
```

with:

```ts
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block**

Replace lines 30-50:

```ts
  const [items, setItems] = useState<ActivityItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<ActivityCategory | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const result = await client.audit.list({ page: 1, pageSize: 50 })
      setItems(result.items.map(auditEventToActivityItem))
    } catch (err) {
      setError(formatOpsError(err, API_URL))
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void fetchActivity()
  }, [fetchActivity])
```

with:

```ts
  const [category, setCategory] = useState<ActivityCategory | null>(null)
  const [errorDismissed, setErrorDismissed] = useState(false)

  const activityQuery = useQuery({
    queryKey: ["activity", "list"],
    queryFn: async () => {
      const result = await client.audit.list({ page: 1, pageSize: 50 })
      return result.items.map(auditEventToActivityItem)
    },
  })
  const items = activityQuery.data ?? []
  const loading = activityQuery.isLoading
  const error =
    activityQuery.isError && !errorDismissed
      ? formatOpsError(activityQuery.error, API_URL)
      : null

  const onRetryActivity = () => {
    setErrorDismissed(false)
    void activityQuery.refetch()
  }
```

(this mirrors `support/index.tsx`'s `errorDismissed` pattern in the same app, since `error` is now derived from query state rather than settable directly.)

- [ ] **Step 3: Update the error banner JSX**

Replace lines 111-119:

```tsx
      {error ? (
        <View style={styles.errorWrap}>
          <ApiErrorBanner
            message={error}
            onRetry={() => void fetchActivity()}
            onDismiss={() => setError(null)}
          />
        </View>
      ) : null}
```

with:

```tsx
      {error ? (
        <View style={styles.errorWrap}>
          <ApiErrorBanner
            message={error}
            onRetry={onRetryActivity}
            onDismiss={() => setErrorDismissed(true)}
          />
        </View>
      ) : null}
```

- [ ] **Step 4: Commit**

```bash
git add "apps/ops-mobile/app/(ops)/activity.tsx"
git commit -m "refactor(ops-mobile): migrate activity.tsx to TanStack Query"
```

---

## Task 2: Convert `apps/ops-mobile/app/(ops)/announcements/index.tsx`

**Files:**
- Modify: `apps/ops-mobile/app/(ops)/announcements/index.tsx:1-227` (imports through mutation handlers)
- Modify: `apps/ops-mobile/app/(ops)/announcements/index.tsx:251-261` (list-header error banner)
- Modify: `apps/ops-mobile/app/(ops)/announcements/index.tsx:381,397` (ConfirmDialog `onConfirm` call sites)

**Interfaces:**
- Consumes: `useOpsClient` from `@/lib/ops-client` (unchanged).
- Produces: query key `["announcements", "list"]`, invalidated by both mutations in this file.

- [ ] **Step 1: Update imports**

Replace line 1:

```ts
import { useCallback, useEffect, useState } from "react"
```

with:

```ts
import { useMemo, useState } from "react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block**

Replace lines 137-185 (the state block through `onEndReached`):

```ts
  const [items, setItems] = useState<AnnouncementDto[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendTarget, setResendTarget] = useState<AnnouncementDto | null>(null)
  const [resending, setResending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchPage = useCallback(
    async (nextPage: number, replace = false) => {
      try {
        setError(null)
        const result = await client.notifications.list({
          page: nextPage,
          pageSize: 20,
        })
        setItems((current) =>
          replace ? result.items : [...current, ...result.items]
        )
        setPage(result.page)
        setTotalPages(result.totalPages)
      } catch (err) {
        setError(formatOpsError(err, API_URL))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [client]
  )

  useEffect(() => {
    setLoading(true)
    void fetchPage(1, true)
  }, [fetchPage])

  const onRefresh = () => {
    setRefreshing(true)
    void fetchPage(1, true)
  }

  const onEndReached = () => {
    if (loading || refreshing || page >= totalPages) return
    setLoading(true)
    void fetchPage(page + 1)
  }
```

with:

```ts
  const queryClient = useQueryClient()
  const [resendTarget, setResendTarget] = useState<AnnouncementDto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementDto | null>(null)

  const query = useInfiniteQuery({
    queryKey: ["announcements", "list"],
    queryFn: ({ pageParam }) =>
      client.notifications.list({ page: pageParam, pageSize: 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  })

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  )
  const error = query.isError ? formatOpsError(query.error, API_URL) : null
  const loading = query.isPending
  const refreshing = query.isRefetching && !query.isFetchingNextPage

  const onRefresh = () => void query.refetch()

  const onEndReached = () => {
    if (!query.isFetchingNextPage && query.hasNextPage) void query.fetchNextPage()
  }
```

- [ ] **Step 3: Convert mutations**

Replace lines 187-227 (`handleResend`, `handleDelete`):

```ts
  const handleResend = async () => {
    if (!resendTarget || resending) return
    setResending(true)
    try {
      await client.notifications.broadcast({
        title: resendTarget.title,
        body: resendTarget.body,
        category: (resendTarget.category ?? "announcement") as
          "announcement" | "campaign" | "billing" | "promo" | "system",
        target_apps: resendTarget.target_apps as ("customer-mobile" | "driver-mobile")[],
      })
      setResendTarget(null)
      setRefreshing(true)
      await fetchPage(1, true)
    } catch (err) {
      setError(formatOpsError(err, API_URL))
      setResendTarget(null)
    } finally {
      setResending(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await client.notifications.delete(deleteTarget.id)
      const deletedAt = new Date().toISOString()
      setDeleteTarget(null)
      setItems((current) =>
        current.map((item) =>
          item.id === deleteTarget.id ? { ...item, deleted_at: deletedAt } : item,
        ),
      )
    } catch (err) {
      setError(formatOpsError(err, API_URL))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }
```

with:

```ts
  const resendMutation = useMutation({
    mutationFn: (target: AnnouncementDto) =>
      client.notifications.broadcast({
        title: target.title,
        body: target.body,
        category: (target.category ?? "announcement") as
          "announcement" | "campaign" | "billing" | "promo" | "system",
        target_apps: target.target_apps as ("customer-mobile" | "driver-mobile")[],
      }),
    onSuccess: () => {
      setResendTarget(null)
      void queryClient.invalidateQueries({ queryKey: ["announcements", "list"] })
    },
    onError: () => setResendTarget(null),
  })
  const handleResend = () => {
    if (!resendTarget) return
    resendMutation.mutate(resendTarget)
  }
  const resending = resendMutation.isPending

  const deleteMutation = useMutation({
    mutationFn: (target: AnnouncementDto) => client.notifications.delete(target.id),
    onSuccess: () => {
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ["announcements", "list"] })
    },
    onError: () => setDeleteTarget(null),
  })
  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget)
  }
  const deleting = deleteMutation.isPending
```

(the previous `handleDelete` locally patched `deleted_at` on the item to avoid a refetch; invalidating `["announcements", "list"]` now re-fetches instead — the API already returns soft-deleted items marked `deleted_at`, so the rendered "Deleted" badge is unaffected, just arrives via network instead of a local patch.)

- [ ] **Step 4: Update JSX call sites**

Replace the list-header error banner's `onRetry` (originally lines 254-257):

```tsx
          onRetry={() => {
            setLoading(true)
            void fetchPage(1, true)
          }}
```

with:

```tsx
          onRetry={onRefresh}
```

Replace `onConfirm={() => void handleResend()}` with `onConfirm={handleResend}`.
Replace `onConfirm={() => void handleDelete()}` with `onConfirm={handleDelete}`.

- [ ] **Step 5: Commit**

```bash
git add "apps/ops-mobile/app/(ops)/announcements/index.tsx"
git commit -m "refactor(ops-mobile): migrate announcements/index.tsx to TanStack Query"
```

---

## Task 3: Convert `apps/ops-mobile/app/(ops)/profile.tsx`

**Files:**
- Modify: `apps/ops-mobile/app/(ops)/profile.tsx:1-93` (imports through the flags fetch effect)

**Interfaces:**
- Consumes: `useOpsClient` from `@/lib/ops-client` (unchanged).
- Produces: query key `["platform-flags"]`.

- [ ] **Step 1: Update imports**

Replace line 5:

```ts
import { useEffect, useMemo, useState } from "react"
```

with:

```ts
import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace the flags state/fetch block**

Replace lines 61-93 (`const opsClient = useOpsClient()` through the `toggleFlag` function):

```ts
  const opsClient = useOpsClient()
  const [flags, setFlags] = useState<PlatformFlagDto[] | null>(null)
  const [pendingFlagKey, setPendingFlagKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    opsClient.flags
      .list()
      .then((res) => {
        if (!cancelled) setFlags(res.items)
      })
      .catch(() => {
        // Best-effort — profile still works if flags fail to load.
      })
    return () => {
      cancelled = true
    }
  }, [opsClient])

  async function toggleFlag(flag: PlatformFlagDto) {
    setPendingFlagKey(flag.key)
    try {
      const updated = await opsClient.flags.update({
        key: flag.key as PlatformFlagKey,
        enabled: !flag.enabled,
      })
      setFlags((prev) => prev?.map((f) => (f.key === updated.key ? updated : f)) ?? prev)
    } catch {
      Alert.alert("Couldn't update flag", "Check your connection and try again.")
    } finally {
      setPendingFlagKey(null)
    }
  }
```

with:

```ts
  const opsClient = useOpsClient()
  const queryClient = useQueryClient()

  const flagsQuery = useQuery({
    queryKey: ["platform-flags"],
    queryFn: () => opsClient.flags.list(),
  })
  const flags = flagsQuery.data?.items ?? null

  const toggleFlagMutation = useMutation({
    mutationFn: (flag: PlatformFlagDto) =>
      opsClient.flags.update({
        key: flag.key as PlatformFlagKey,
        enabled: !flag.enabled,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-flags"] })
    },
    onError: () => {
      Alert.alert("Couldn't update flag", "Check your connection and try again.")
    },
  })
  function toggleFlag(flag: PlatformFlagDto) {
    toggleFlagMutation.mutate(flag)
  }
  const pendingFlagKey = toggleFlagMutation.isPending
    ? (toggleFlagMutation.variables?.key ?? null)
    : null
```

- [ ] **Step 3: No JSX changes needed**

`onValueChange={() => toggleFlag(flag)}` and `disabled={pendingFlagKey === flag.key}` already read from the renamed/derived variables above — no further edits needed.

- [ ] **Step 4: Commit**

```bash
git add "apps/ops-mobile/app/(ops)/profile.tsx"
git commit -m "refactor(ops-mobile): migrate profile.tsx to TanStack Query"
```

---

## Task 4: Convert `apps/ops-mobile/app/(ops)/support/[id].tsx`

**Files:**
- Modify: `apps/ops-mobile/app/(ops)/support/[id].tsx:1-143` (imports through mutation handlers)
- Modify: `apps/ops-mobile/app/(ops)/support/[id].tsx:287-301` (loading/not-found early returns)
- Modify: `apps/ops-mobile/app/(ops)/support/[id].tsx:332` (inline error banner)
- Modify: `apps/ops-mobile/app/(ops)/support/[id].tsx:354,362,475` (mutation call sites)

**Interfaces:**
- Consumes: `useOpsClient` from `@/lib/ops-client` (unchanged).
- Produces: query key `["support", "detail", caseId]`. Mutations invalidate both this key and `["support", "list"]` (the key already used by `support/index.tsx`), matching the web `case-detail-view.tsx` pattern.

- [ ] **Step 1: Update imports**

Replace line 1:

```ts
import { useCallback, useEffect, useState } from "react"
```

with:

```ts
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
```

- [ ] **Step 2: Replace state/fetch block**

Replace lines 57-85 (the state block through the `load` effect):

```ts
  const [data, setData] = useState<SupportCaseDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reply, setReply] = useState("")
  const [internalNote, setInternalNote] = useState(false)
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false)

  usePageHeader(data ? data.subject : "Support case", {
    showBack: true,
    backHref: "/(ops)/support",
  })

  const load = useCallback(async () => {
    try {
      const result = await client.support.get(caseId)
      setData(result)
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      setLoading(false)
    }
  }, [client, caseId])

  useEffect(() => {
    void load()
  }, [load])
```

with:

```ts
  const [reply, setReply] = useState("")
  const [internalNote, setInternalNote] = useState(false)
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const queryClient = useQueryClient()

  const caseQuery = useQuery({
    queryKey: ["support", "detail", caseId],
    queryFn: () => client.support.get(caseId),
  })
  const data = caseQuery.data ?? null
  const loading = caseQuery.isLoading
  const loadError = caseQuery.isError
    ? formatOpsError(caseQuery.error, API_URL)
    : null
  const error = mutationError ?? loadError

  usePageHeader(data ? data.subject : "Support case", {
    showBack: true,
    backHref: "/(ops)/support",
  })

  function invalidateCase() {
    void queryClient.invalidateQueries({ queryKey: ["support", "detail", caseId] })
    void queryClient.invalidateQueries({ queryKey: ["support", "list"] })
  }
```

- [ ] **Step 3: Convert mutations**

Replace lines 87-143 (`updateCase`, `assignToMe`, `unassign`, `handleSend`):

```ts
  async function updateCase(patch: { status?: string; priority?: string }) {
    setUpdating(true)
    try {
      await client.support.update(caseId, patch as never)
      await load()
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      setUpdating(false)
    }
  }

  async function assignToMe() {
    if (!user) return
    setUpdating(true)
    try {
      await client.support.update(caseId, {
        assigned_to_clerk_id: user.id,
        assigned_to_email: user.primaryEmailAddress?.emailAddress ?? null,
      })
      await load()
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      setUpdating(false)
    }
  }

  async function unassign() {
    setUpdating(true)
    try {
      await client.support.update(caseId, {
        assigned_to_clerk_id: null,
        assigned_to_email: null,
      } as never)
      await load()
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      setUpdating(false)
    }
  }

  async function handleSend() {
    if (sending || !reply.trim()) return
    setSending(true)
    try {
      await client.support.reply(caseId, { body: reply.trim(), internal_note: internalNote })
      setReply("")
      setInternalNote(false)
      await load()
    } catch (e) {
      setError(formatOpsError(e, API_URL))
    } finally {
      setSending(false)
    }
  }
```

with:

```ts
  const updateMutation = useMutation({
    mutationFn: (patch: {
      status?: string
      priority?: string
      assigned_to_clerk_id?: string | null
      assigned_to_email?: string | null
    }) => client.support.update(caseId, patch as never),
    onSuccess: invalidateCase,
    onError: (e) => setMutationError(formatOpsError(e, API_URL)),
  })
  const updating = updateMutation.isPending

  function updateCase(patch: { status?: string; priority?: string }) {
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
    mutationFn: (body: { body: string; internal_note: boolean }) =>
      client.support.reply(caseId, body),
    onSuccess: () => {
      setReply("")
      setInternalNote(false)
      invalidateCase()
    },
    onError: (e) => setMutationError(formatOpsError(e, API_URL)),
  })
  const sending = replyMutation.isPending

  function handleSend() {
    if (sending || !reply.trim()) return
    replyMutation.mutate({ body: reply.trim(), internal_note: internalNote })
  }
```

- [ ] **Step 4: Update the loading/not-found early returns**

Replace lines 287-301:

```tsx
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!data) {
    return (
      <View style={{ flex: 1, padding: spacing.lg }}>
        <ApiErrorBanner message={error ?? "Case not found."} onRetry={() => void load()} />
      </View>
    )
  }
```

with:

```tsx
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!data) {
    return (
      <View style={{ flex: 1, padding: spacing.lg }}>
        <ApiErrorBanner
          message={loadError ?? "Case not found."}
          onRetry={() => void caseQuery.refetch()}
        />
      </View>
    )
  }
```

- [ ] **Step 5: Update the inline error banner and remaining mutation call sites**

Replace line 332:

```tsx
          {error ? <ApiErrorBanner message={error} onDismiss={() => setError(null)} /> : null}
```

with:

```tsx
          {error ? <ApiErrorBanner message={error} onDismiss={() => setMutationError(null)} /> : null}
```

Replace `onPress={() => void unassign()}` with `onPress={unassign}`.
Replace `onPress={() => void assignToMe()}` with `onPress={assignToMe}`.
Replace `onPress={handleSend}` — no change needed, `handleSend` was already passed by reference, and it's still a plain (now sync) function.

In the two `BottomSheetPicker` `onSelect` handlers, `updateCase` is no longer async, so drop the now-meaningless `void`:

```tsx
        onSelect={(value) => {
          setStatusPickerOpen(false)
          void updateCase({ status: value })
        }}
```

becomes:

```tsx
        onSelect={(value) => {
          setStatusPickerOpen(false)
          updateCase({ status: value })
        }}
```

and the same edit (drop `void`) for the priority picker's `onSelect={(value) => { setPriorityPickerOpen(false); void updateCase({ priority: value }) }}`.

- [ ] **Step 6: Commit**

```bash
git add "apps/ops-mobile/app/(ops)/support/[id].tsx"
git commit -m "refactor(ops-mobile): migrate support/[id].tsx to TanStack Query"
```

---

## Task 5: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run: `turbo typecheck --filter=ops-mobile`
Expected: PASS. If it fails, fix the reported errors in the relevant file from Tasks 1-4 and re-run until it passes.

- [ ] **Step 2: Lint**

Run: `turbo lint --filter=ops-mobile`
Expected: PASS. If it fails, fix the reported errors and re-run until it passes.

- [ ] **Step 3: Commit any fixes**

If Steps 1-2 required changes, commit them:

```bash
git add "apps/ops-mobile/app/(ops)"
git commit -m "fix(ops-mobile): address typecheck/lint findings from query migration"
```

If no fixes were needed, skip this step — nothing to commit.
