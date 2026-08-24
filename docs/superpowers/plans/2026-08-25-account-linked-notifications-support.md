# Account-linked Notifications & Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tie push notifications and support cases to the signed-in Clerk account (both mobile apps), personalize ops announcements per recipient, extend announcements to the web apps, and scope what a recipient sees to only what was sent while they were an eligible recipient.

**Architecture:** Prisma schema grows a `clerk_user_id` on the two mobile push-token tables and a new `AnnouncementDelivery` table (one row per broadcast per recipient, across all four target apps). `broadcastAnnouncement()` resolves recipients per target app, personalizes `{{first_name}}` via a batched Clerk lookup, sends Expo push for the two mobile apps, and writes a delivery row for all four. Mobile and web clients read "my deliveries" (authenticated) instead of "everything broadcast to this app" (unauthenticated). Support cases gain the same account link via `customer_id` (already scaffolded) and a new `driver_clerk_user_id` column, with the create/list routes accepting an optional bearer token from whichever of the three separate Clerk instances (customer or driver) matches the request's channel.

**Tech Stack:** Next.js (`apps/api`) + Prisma/Postgres, `@clerk/backend` (`verifyToken`, `createClerkClient`), Expo Router + `@clerk/clerk-expo` (`driver-mobile`, `customer-mobile`), Next.js + `@clerk/nextjs` (`driver-web`, `customer-web`), Zod (`packages/ops-contracts`), TanStack Query, Vitest (`packages/ops-contracts` only).

**Spec:** `docs/superpowers/specs/2026-08-25-account-linked-notifications-support-design.md`

## Global Constraints

- Three Clerk instances exist and must never be crossed: ops (`CLERK_SECRET_KEY`), driver (`DRIVER_CLERK_SECRET_KEY`), customer (`CUSTOMER_CLERK_SECRET_KEY`). A customer request is always verified against the customer instance; a driver request always against the driver instance.
- Push/announcement copy stays capped at 65 chars (title) / 178 chars (body) — this is the iOS push-banner truncation point, shared across all four target apps for this pass (per spec Non-goals).
- `apps/web/prisma/schema.prisma` is the one Prisma schema for the whole monorepo (`apps/api` reads the same generated client). Migrations run from `apps/web` via `pnpm --filter web db:migrate`.
- This codebase has no automated tests for `apps/api` routes or for the mobile/web app code — only `packages/ops-contracts` runs Vitest (`pnpm --filter @workspace/ops-contracts test`). Follow that existing split: new pure logic that belongs in `ops-contracts` gets a Vitest case; `apps/api` route/business-logic changes and app-level UI changes are verified with `typecheck` (`pnpm --filter <app> typecheck`) plus the manual steps each task lists — do not invent a new test harness for a layer that has never had one.
- `anonymous_device_id` is never removed from any push-token or support-case path — it stays as the fallback for the pre-auth window and for anyone who never signs in.
- Client `postJson`/`getJson` helpers already accept an optional `headers` record — use that for `Authorization: Bearer <token>`, don't add new fetch wrappers.
- AsyncStorage/localStorage reads in this codebase are always wrapped in try/catch with a safe fallback (see `apps/customer-web/lib/support-client.ts`) — match that when touching storage code.

---

## File Structure

**New files:**
- `apps/api/lib/customer-auth.ts` — verifies a bearer token against the customer Clerk instance (mirrors `apps/api/lib/driver-auth.ts`).
- `apps/api/lib/push/recipient-names.ts` — batched Clerk `firstName` lookup per audience, used by `broadcastAnnouncement()`.
- `apps/api/app/v1/customer/announcements/route.ts` — `GET` a signed-in customer's `AnnouncementDelivery` rows.
- `apps/api/app/v1/customer/announcements/read/route.ts` — `PATCH` marks them read.
- `apps/api/app/v1/driver/announcements/route.ts` — `GET` a signed-in driver's `AnnouncementDelivery` rows.
- `apps/api/app/v1/driver/announcements/read/route.ts` — `PATCH` marks them read.
- `apps/customer-mobile/lib/announcements-client.ts` / `apps/driver-mobile/lib/announcements-client.ts` — thin authenticated fetch wrappers, replacing the direct `getJson("/v1/public/announcements...")` call in each app's `use-live-announcements.ts`.
- `apps/driver-web/lib/announcements-client.ts` — fetch wrapper for `/v1/driver/announcements`.
- `apps/customer-web/lib/announcements-client.ts` — fetch wrapper for `/v1/customer/announcements`.
- `apps/customer-web/components/shell/notification-bell.tsx` — new bell, modeled on `apps/driver-web/components/shell/notification-bell.tsx`.

**Modified files** (grouped by concern — see each task for the exact diff):
- Schema: `apps/web/prisma/schema.prisma`.
- Contracts: `packages/ops-contracts/src/enums.ts`, `src/schemas.ts`, `src/contracts.test.ts`.
- Push registration (API): `apps/api/app/v1/public/push-tokens/route.ts`, `apps/api/app/v1/public/driver-push-tokens/route.ts`, `apps/api/lib/validation/push-schemas.ts`.
- Push registration (clients): `apps/customer-mobile/lib/push-registration.ts`, `apps/driver-mobile/lib/push-registration.ts`.
- Send logic: `apps/api/lib/push/broadcast-announcement.ts`.
- Ops composer: `apps/ops/app/(dashboard)/announcements/announcement-form-dialog.tsx`.
- Mobile session hooks: `apps/customer-mobile/lib/auth/use-customer-session.ts`, `apps/driver-mobile/lib/auth/use-driver-session.ts`.
- Mobile notifications: `apps/customer-mobile/lib/use-live-announcements.ts`, `apps/driver-mobile/lib/use-live-announcements.ts`, `apps/customer-mobile/app/notifications.tsx`, `apps/driver-mobile/app/notifications.tsx`.
- Web notifications: `apps/driver-web/lib/driver-notifications-client.ts`, `apps/driver-web/components/shell/notification-bell.tsx`, `apps/customer-web/components/shell/app-shell.tsx`.
- Support (API): `apps/api/lib/support.ts`, `apps/api/app/v1/public/support/route.ts`.
- Support (mobile clients): `apps/customer-mobile/lib/support.ts`, `apps/customer-mobile/app/(tabs)/settings/support/new.tsx`, `apps/driver-mobile/lib/support.ts`, `apps/driver-mobile/app/(tabs)/support/index.tsx`.
- Support (web client): `apps/customer-web/lib/support-client.ts`, `apps/customer-web/components/support/new-support-request-form.tsx`, `apps/customer-web/app/(shell)/settings/support/support-client.tsx`.

---

## Part 0 — Foundation

### Task 1: Prisma schema — account links + delivery table

**Files:**
- Modify: `apps/web/prisma/schema.prisma`

**Interfaces:**
- Produces: `CustomerPushToken.clerk_user_id`, `DriverPushToken.clerk_user_id`, `SupportCase.driver_clerk_user_id`, new model `AnnouncementDelivery` (fields: `id`, `broadcast_id`, `broadcast`, `clerk_user_id`, `app`, `title`, `body`, `image_url`, `category`, `read_at`, `created_at`) — every later task that reads/writes these uses these exact names.

- [ ] **Step 1: Add `clerk_user_id` to both mobile push-token models**

In `apps/web/prisma/schema.prisma`, find `model CustomerPushToken` (around line 128) and `model DriverPushToken` (around line 140):

```prisma
model CustomerPushToken {
  id                  Int      @id @default(autoincrement())
  expo_push_token     String   @unique
  platform            String?
  anonymous_device_id String?
  clerk_user_id       String?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  @@index([anonymous_device_id])
  @@index([clerk_user_id])
  @@map("customer_push_tokens")
}
```

```prisma
model DriverPushToken {
  id                  Int      @id @default(autoincrement())
  expo_push_token     String   @unique
  platform            String?
  anonymous_device_id String?
  clerk_user_id       String?
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt

  @@index([anonymous_device_id])
  @@index([clerk_user_id])
  @@map("driver_push_tokens")
}
```

- [ ] **Step 2: Add `driver_clerk_user_id` to `SupportCase`**

In the same file, find `model SupportCase` (around line 214) and add the new column right after `customer_id`/`customer`:

```prisma
model SupportCase {
  id                    Int       @id @default(autoincrement())
  customer_id           Int?
  customer              Customer? @relation(fields: [customer_id], references: [id])
  driver_clerk_user_id  String?
  contact_name          String
  contact_email         String
  contact_phone         String?
  anonymous_device_id   String?
  access_token_hash     String    @unique
  channel               String
  category              String    @default("general")
  subject               String
  status                String    @default("open")
  priority              String    @default("normal")
  assigned_to_clerk_id  String?
  assigned_to_email     String?
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt

  messages SupportMessage[]

  @@index([status, created_at])
  @@index([contact_email])
  @@index([assigned_to_clerk_id])
  @@index([driver_clerk_user_id])
  @@map("support_cases")
}
```

- [ ] **Step 3: Add the `AnnouncementDelivery` model**

Add this new model right after `model AnnouncementBroadcast` (around line 174), and add the back-relation to `AnnouncementBroadcast` itself:

```prisma
model AnnouncementBroadcast {
  id               Int       @id @default(autoincrement())
  title            String
  body             String
  category         String    @default("announcement")
  image_url        String?
  sent_by_clerk_id String
  sent_by_email    String
  target_apps      String[]  @default(["customer-mobile"])
  target_count     Int       @default(0)
  delivered_count  Int       @default(0)
  invalid_count    Int       @default(0)
  status           String    @default("sent")
  created_at       DateTime  @default(now())
  deleted_at       DateTime?
  deleted_by_email String?

  tickets    PushTicket[]
  deliveries AnnouncementDelivery[]

  @@index([created_at])
  @@index([deleted_at])
  @@map("announcement_broadcasts")
}

/// One row per (broadcast, recipient) — written at send time for every
/// resolved recipient across all four target apps. This is what a signed-in
/// user's notification inbox reads from, so a delivery row only existing for
/// recipients who were eligible at send time is what keeps a new account
/// from ever seeing history from before they joined.
model AnnouncementDelivery {
  id            Int                   @id @default(autoincrement())
  broadcast_id  Int
  broadcast     AnnouncementBroadcast @relation(fields: [broadcast_id], references: [id], onDelete: Cascade)
  clerk_user_id String
  app           String
  title         String
  body          String
  image_url     String?
  category      String
  read_at       DateTime?
  created_at    DateTime              @default(now())

  @@index([clerk_user_id, app, created_at])
  @@index([broadcast_id])
  @@map("announcement_deliveries")
}
```

- [ ] **Step 4: Generate and run the migration**

Run: `pnpm --filter web db:migrate` (this prompts for a migration name — use `account_linked_notifications_support`)
Expected: a new folder under `apps/web/prisma/migrations/` containing the SQL for the three `ALTER TABLE`s and the new `announcement_deliveries` table; command exits 0.

- [ ] **Step 5: Verify the Prisma client picks up the new fields**

Run: `pnpm --filter web exec prisma generate`
Expected: exits 0, no type errors. Then run `pnpm --filter api typecheck` — expected to still pass (nothing references the new fields yet).

- [ ] **Step 6: Commit**

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations
git commit -m "feat(db): add account links to push tokens/support cases and announcement_deliveries table"
```

---

### Task 2: Customer Clerk bearer-token verification

**Files:**
- Create: `apps/api/lib/customer-auth.ts`
- Modify: `apps/api/lib/api-utils.ts`

**Interfaces:**
- Consumes: nothing new — mirrors the pattern already in `apps/api/lib/driver-auth.ts` (`getDriverAccess`/`requireDriverUser`) and reads `process.env.CUSTOMER_CLERK_SECRET_KEY` (already provisioned — see `apps/api/scripts/check-env.ts`).
- Produces: `CustomerAccess = { status: "unauthenticated" } | { status: "authorized"; userId: string }`, `getCustomerAccess(): Promise<CustomerAccess>`, `requireCustomerUser(): Promise<{ status: "authorized"; userId: string }>` (throws a `Response` on failure, same contract as `requireDriverUser`), and `requireCustomerAccess()` in `api-utils.ts` (same `{ access } | { error }` wrapper shape as `requireDriverAccess`).

- [ ] **Step 1: Create `apps/api/lib/customer-auth.ts`**

```typescript
import { verifyToken } from "@clerk/backend"
import { headers } from "next/headers"

/**
 * Verifies against the CUSTOMER Clerk instance (CUSTOMER_CLERK_SECRET_KEY), a
 * separate instance from ops (lib/auth.ts) and driver (lib/driver-auth.ts).
 * Bearer-token only, no session-cookie fallback — apps/api is a separate
 * origin from customer-web/customer-mobile. Callers must send
 * `Authorization: Bearer <token>` using a token from the customer Clerk
 * instance's getToken().
 */

export type CustomerAccess =
  | { status: "unauthenticated" }
  | { status: "authorized"; userId: string }

async function resolveCustomerUserId(): Promise<string | null> {
  const authHeader = (await headers()).get("authorization")
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null
  if (!bearer) {
    return null
  }

  try {
    const payload = await verifyToken(bearer, {
      secretKey: process.env.CUSTOMER_CLERK_SECRET_KEY,
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}

export async function getCustomerAccess(): Promise<CustomerAccess> {
  const userId = await resolveCustomerUserId()
  if (!userId) {
    return { status: "unauthenticated" }
  }
  return { status: "authorized", userId }
}

export async function requireCustomerUser() {
  const access = await getCustomerAccess()
  if (access.status === "unauthenticated") {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  return access
}
```

- [ ] **Step 2: Add `requireCustomerAccess()` to `apps/api/lib/api-utils.ts`**

Add the import next to the existing `requireDriverUser` import (line 14), and add the wrapper function right after `requireDriverAccess` (after line 81):

```typescript
import { requireCustomerUser } from "@/lib/customer-auth"
```

```typescript
/** Same shape as requireDriverAccess, but for the customer-facing routes —
 * any authenticated customer-Clerk user, no org/role concept. */
export async function requireCustomerAccess(): Promise<
  | { access: Awaited<ReturnType<typeof requireCustomerUser>>; error?: undefined }
  | { access?: undefined; error: NextResponse }
> {
  try {
    const access = await requireCustomerUser()
    return { access }
  } catch (e) {
    if (e instanceof Response) return { error: e as NextResponse }
    return { error: jsonError("Unauthorized", 401) }
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add apps/api/lib/customer-auth.ts apps/api/lib/api-utils.ts
git commit -m "feat(api): add customer Clerk bearer-token verification"
```

---

## Part 1 — Mobile session hooks catch up to real auth

### Task 3: `useCustomerSession()` reports real Clerk state

**Files:**
- Modify: `apps/customer-mobile/lib/auth/use-customer-session.ts`

**Interfaces:**
- Produces: `CustomerSession = { status: "loading" } | { status: "anonymous"; deviceId: string } | { status: "authenticated"; userId: string; deviceId: string }` — the `"authenticated"` variant is new and is what Task 15/23 rely on.

Today this hook always resolves `"anonymous"` even though `AuthGate` (`apps/customer-mobile/components/AuthGate.tsx`) already forces sign-in via `@clerk/clerk-expo`'s real `useAuth()` — this task brings the hook up to what `apps/customer-web/lib/auth/customer-session.ts` already does correctly.

- [ ] **Step 1: Rewrite the hook**

Replace the full contents of `apps/customer-mobile/lib/auth/use-customer-session.ts`:

```typescript
import { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Crypto from "expo-crypto"
import { useAuth } from "@clerk/clerk-expo"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

const DEVICE_ID_KEY = "admobi.customer.deviceId"

export type CustomerSession =
  | { status: "loading" }
  | { status: "anonymous"; deviceId: string }
  | { status: "authenticated"; userId: string; deviceId: string }

/** Shared with lib/push-registration.ts so push tokens can be tied to the
 * same per-device identity used for support cases, without needing a hook. */
export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = Crypto.randomUUID()
    await AsyncStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const id = await getOrCreateDeviceId()
      if (!cancelled) setDeviceId(id)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return deviceId
}

function useAuthenticatedSession(deviceId: string | null): CustomerSession {
  const { isSignedIn, userId } = useAuth()

  if (!deviceId) return { status: "loading" }
  if (isSignedIn && userId) return { status: "authenticated", userId, deviceId }
  return { status: "anonymous", deviceId }
}

function useAnonymousSession(deviceId: string | null): CustomerSession {
  if (!deviceId) return { status: "loading" }
  return { status: "anonymous", deviceId }
}

/**
 * isAuthEnabled() is fixed for the lifetime of a running app (read once from
 * EXPO_PUBLIC_* env vars, never toggles at runtime), so picking the hook
 * implementation once here — rather than branching inside useCustomerSession
 * — keeps the actual hook call unconditional per render. useAuth() must
 * never run unless ClerkProvider is mounted (app/_layout.tsx only mounts it
 * when this same flag is on) — see apps/customer-web's identical pattern in
 * lib/auth/customer-session.ts.
 */
const useSessionImpl = isAuthEnabled() ? useAuthenticatedSession : useAnonymousSession

export function useCustomerSession(): CustomerSession {
  const deviceId = useDeviceId()
  return useSessionImpl(deviceId)
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter customer-mobile typecheck`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

Run: `pnpm --filter customer-mobile start` and open the app with `EXPO_PUBLIC_AUTH_ENABLED=true` set. Sign in, then check any screen using `useCustomerSession()` (e.g. the support screen from Task 23) — confirm `session.status === "authenticated"` and `session.userId` is a real Clerk id (add a temporary `console.log(session)` if needed, then remove it).
Expected: `"authenticated"` after sign-in, `"anonymous"` before.

- [ ] **Step 4: Commit**

```bash
git add apps/customer-mobile/lib/auth/use-customer-session.ts
git commit -m "fix(customer-mobile): useCustomerSession reflects real Clerk auth state"
```

---

### Task 4: `useDriverSession()` reports real Clerk state

**Files:**
- Modify: `apps/driver-mobile/lib/auth/use-driver-session.ts`

**Interfaces:**
- Produces: `DriverSession = { status: "loading" } | { status: "anonymous"; deviceId: string } | { status: "authenticated"; userId: string; deviceId: string }`, same shape as Task 3's `CustomerSession`.

- [ ] **Step 1: Rewrite the hook**

Replace the full contents of `apps/driver-mobile/lib/auth/use-driver-session.ts`:

```typescript
import { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Crypto from "expo-crypto"
import { useAuth } from "@clerk/clerk-expo"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"

const DEVICE_ID_KEY = "admobi.driver.deviceId"

export type DriverSession =
  | { status: "loading" }
  | { status: "anonymous"; deviceId: string }
  | { status: "authenticated"; userId: string; deviceId: string }

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = Crypto.randomUUID()
    await AsyncStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const id = await getOrCreateDeviceId()
      if (!cancelled) setDeviceId(id)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return deviceId
}

function useAuthenticatedSession(deviceId: string | null): DriverSession {
  const { isSignedIn, userId } = useAuth()

  if (!deviceId) return { status: "loading" }
  if (isSignedIn && userId) return { status: "authenticated", userId, deviceId }
  return { status: "anonymous", deviceId }
}

function useAnonymousSession(deviceId: string | null): DriverSession {
  if (!deviceId) return { status: "loading" }
  return { status: "anonymous", deviceId }
}

/** Same "pick the hook once at module load" pattern as customer-mobile's
 * useCustomerSession — see that file's comment for why. */
const useSessionImpl = isAuthEnabled() ? useAuthenticatedSession : useAnonymousSession

export function useDriverSession(): DriverSession {
  const deviceId = useDeviceId()
  return useSessionImpl(deviceId)
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter driver-mobile typecheck`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

Same as Task 3 Step 3, run against `driver-mobile`.

- [ ] **Step 4: Commit**

```bash
git add apps/driver-mobile/lib/auth/use-driver-session.ts
git commit -m "fix(driver-mobile): useDriverSession reflects real Clerk auth state"
```

---

## Part 2 — Account-linked push tokens & personalized announcements

### Task 5: Extend `ANNOUNCEMENT_TARGET_APPS` to the web apps

**Files:**
- Modify: `packages/ops-contracts/src/enums.ts`
- Modify: `packages/ops-contracts/src/form-fields.ts`
- Modify: `packages/ops-contracts/src/contracts.test.ts`

**Interfaces:**
- Produces: `ANNOUNCEMENT_TARGET_APPS = ["customer-mobile", "driver-mobile", "customer-web", "driver-web"]`, `AnnouncementTargetApp` widened to match, `ANNOUNCEMENT_TARGET_APP_OPTIONS` (consumed by `announcement-form-dialog.tsx`) gains the two new entries.
- Consumes: `ANNOUNCEMENT_TARGET_APP_OPTIONS`'s current shape — read it first (`grep -n "ANNOUNCEMENT_TARGET_APP_OPTIONS" packages/ops-contracts/src/form-fields.ts`) so the new entries match its `{ value, label }` shape exactly.

- [ ] **Step 1: Write the failing test**

Add to `packages/ops-contracts/src/contracts.test.ts` (new `describe` block):

```typescript
import { ANNOUNCEMENT_TARGET_APPS } from "./enums"

describe("announcement target apps", () => {
  it("includes both mobile and web apps", () => {
    expect(ANNOUNCEMENT_TARGET_APPS).toEqual([
      "customer-mobile",
      "driver-mobile",
      "customer-web",
      "driver-web",
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @workspace/ops-contracts test`
Expected: FAIL — `ANNOUNCEMENT_TARGET_APPS` currently only has 2 entries.

- [ ] **Step 3: Update the enum**

In `packages/ops-contracts/src/enums.ts`, replace:

```typescript
export const ANNOUNCEMENT_TARGET_APPS = ["customer-mobile", "driver-mobile"] as const
```

with:

```typescript
export const ANNOUNCEMENT_TARGET_APPS = [
  "customer-mobile",
  "driver-mobile",
  "customer-web",
  "driver-web",
] as const
```

- [ ] **Step 4: Update `ANNOUNCEMENT_TARGET_APP_OPTIONS`**

In `packages/ops-contracts/src/form-fields.ts`, find `ANNOUNCEMENT_TARGET_APP_OPTIONS` and add the two new entries following its existing `{ value, label }` shape, e.g.:

```typescript
export const ANNOUNCEMENT_TARGET_APP_OPTIONS = [
  { value: "customer-mobile", label: "Customer app" },
  { value: "driver-mobile", label: "Driver app" },
  { value: "customer-web", label: "Customer web" },
  { value: "driver-web", label: "Driver web" },
] as const
```

(Match the exact label wording already used for the first two entries — copy their style, not necessarily this literal text.)

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @workspace/ops-contracts test`
Expected: PASS.

- [ ] **Step 6: Typecheck the ops app** (its form dialog consumes this list)

Run: `pnpm --filter ops typecheck`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add packages/ops-contracts/src/enums.ts packages/ops-contracts/src/form-fields.ts packages/ops-contracts/src/contracts.test.ts
git commit -m "feat(ops-contracts): add customer-web/driver-web as announcement target apps"
```

---

### Task 6: Customer push-token route accepts an optional bearer token

**Files:**
- Modify: `apps/api/lib/validation/push-schemas.ts`
- Modify: `apps/api/app/v1/public/push-tokens/route.ts`

**Interfaces:**
- Consumes: `requireCustomerAccess()` (added in Task 2), `customerPushTokenRegisterSchema` (unchanged shape — no new required field, since the account link comes from the bearer token, not the JSON body).
- Produces: `CustomerPushToken.clerk_user_id` gets populated whenever a valid bearer token is present.

- [ ] **Step 1: Modify the route**

Replace the full contents of `apps/api/app/v1/public/push-tokens/route.ts`:

```typescript
import { NextResponse } from "next/server"

import { getCustomerAccess } from "@/lib/customer-auth"
import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { customerPushTokenRegisterSchema } from "@/lib/validation/push-schemas"

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "push-tokens", { limit: 10, windowSeconds: 60 })
  if (limited) return limited

  const parsed = await parseJsonBody(req, customerPushTokenRegisterSchema)
  if ("error" in parsed) return parsed.error

  const { expoPushToken, platform, anonymousDeviceId } = parsed.data

  // Auth is optional here on purpose: a request without a token (or with one
  // that fails to verify, e.g. mid-refresh) must still register the device
  // for push — it just won't carry a clerk_user_id yet. `requireCustomerUser`
  // would 401 the whole request instead, which push registration can't afford.
  const access = await getCustomerAccess()
  const clerkUserId = access.status === "authorized" ? access.userId : null

  try {
    await prisma.customerPushToken.upsert({
      where: { expo_push_token: expoPushToken },
      create: {
        expo_push_token: expoPushToken,
        platform: platform ?? null,
        anonymous_device_id: anonymousDeviceId ?? null,
        clerk_user_id: clerkUserId,
      },
      update: {
        platform: platform ?? null,
        anonymous_device_id: anonymousDeviceId ?? null,
        ...(clerkUserId ? { clerk_user_id: clerkUserId } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push-tokens] customer register failed:", error)
    return jsonError("Failed to register push token", 500)
  }
}
```

Note the `update` branch: it only overwrites `clerk_user_id` when a fresh one was resolved, so a token re-registered without a token present (e.g. app briefly loses the session) never wipes out a previously-linked account.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

Run: `pnpm --filter api dev`, then:

```bash
curl -s -X POST http://localhost:3003/v1/public/push-tokens \
  -H "Content-Type: application/json" \
  -d '{"expoPushToken":"ExponentPushToken[test123]","platform":"ios","anonymousDeviceId":"dev-device-1"}'
```

Expected: `{"success":true}`. Check the row in Prisma Studio (`pnpm --filter web exec prisma studio`) has `clerk_user_id: null` (no `Authorization` header was sent). Re-run with a real customer Clerk session token in `-H "Authorization: Bearer <token>"` and confirm `clerk_user_id` is populated.

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/v1/public/push-tokens/route.ts
git commit -m "feat(api): link customer push tokens to the signed-in Clerk account"
```

---

### Task 7: Driver push-token route accepts an optional bearer token

**Files:**
- Modify: `apps/api/app/v1/public/driver-push-tokens/route.ts`

**Interfaces:**
- Consumes: `getDriverAccess()` (already exists in `apps/api/lib/driver-auth.ts`).
- Produces: `DriverPushToken.clerk_user_id` gets populated whenever a valid bearer token is present.

- [ ] **Step 1: Modify the route**

Replace the full contents of `apps/api/app/v1/public/driver-push-tokens/route.ts`:

```typescript
import { NextResponse } from "next/server"

import { getDriverAccess } from "@/lib/driver-auth"
import { jsonError, parseJsonBody } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { driverPushTokenRegisterSchema } from "@/lib/validation/push-schemas"

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "driver-push-tokens", { limit: 10, windowSeconds: 60 })
  if (limited) return limited

  const parsed = await parseJsonBody(req, driverPushTokenRegisterSchema)
  if ("error" in parsed) return parsed.error

  const { expoPushToken, platform, anonymousDeviceId } = parsed.data

  // Same reasoning as the customer push-tokens route: auth is optional so a
  // request without a usable token still registers the device.
  const access = await getDriverAccess()
  const clerkUserId = access.status === "authorized" ? access.userId : null

  try {
    await prisma.driverPushToken.upsert({
      where: { expo_push_token: expoPushToken },
      create: {
        expo_push_token: expoPushToken,
        platform: platform ?? null,
        anonymous_device_id: anonymousDeviceId ?? null,
        clerk_user_id: clerkUserId,
      },
      update: {
        platform: platform ?? null,
        anonymous_device_id: anonymousDeviceId ?? null,
        ...(clerkUserId ? { clerk_user_id: clerkUserId } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push-tokens] driver register failed:", error)
    return jsonError("Failed to register push token", 500)
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

Same curl pattern as Task 6 Step 3, against `POST /v1/public/driver-push-tokens`, verifying against a driver Clerk session token.

- [ ] **Step 4: Commit**

```bash
git add apps/api/app/v1/public/driver-push-tokens/route.ts
git commit -m "feat(api): link driver push tokens to the signed-in Clerk account"
```

---

### Task 8: Customer-mobile sends its Clerk token when registering for push

**Files:**
- Modify: `apps/customer-mobile/lib/push-registration.ts`
- Modify: `apps/customer-mobile/lib/use-push-registration.ts`

**Interfaces:**
- Consumes: `useAuth().getToken` from `@clerk/clerk-expo` (same hook `AuthGate` already uses).
- Produces: `registerCustomerPushToken(getToken?: () => Promise<string | null>): Promise<void>` — signature changes to accept an optional token getter, called from the hook.

- [ ] **Step 1: Update `registerCustomerPushToken` to accept a token getter**

In `apps/customer-mobile/lib/push-registration.ts`, change the final function:

```typescript
export async function registerCustomerPushToken(
  getToken?: () => Promise<string | null>,
): Promise<void> {
  if (!isNotificationsSupported()) return

  configureNotificationHandler()

  const granted = await requestPushPermissions()
  if (!granted) {
    Sentry.captureMessage("[push] Registration aborted — permission not granted", "warning")
    return
  }

  const expoPushToken = await getCustomerExpoPushToken()
  if (!expoPushToken) {
    return
  }

  const platform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : undefined
  const anonymousDeviceId = await getOrCreateDeviceId()
  const token = await getToken?.().catch(() => null)

  try {
    await postJson(
      "/v1/public/push-tokens",
      { expoPushToken, platform, anonymousDeviceId },
      token ? { Authorization: `Bearer ${token}` } : undefined,
    )
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "push-token-post" } })
    throw error
  }
}
```

- [ ] **Step 2: Pass a real token getter from the hook**

Replace the full contents of `apps/customer-mobile/lib/use-push-registration.ts`:

```typescript
import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useAuth } from "@clerk/clerk-expo"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { isNotificationsSupported } from "@/lib/notifications-core"
import { registerCustomerPushToken } from "@/lib/push-registration"

function useTokenGetter(): (() => Promise<string | null>) | undefined {
  const { getToken } = useAuth()
  return isAuthEnabled() ? getToken : undefined
}

/**
 * Registers this device's Expo push token with the API so ops staff can
 * broadcast announcements to it, attaching the signed-in account's Clerk
 * token (when auth is enabled) so the registration is linked to the account.
 */
export function usePushRegistration() {
  const pushSupported = isNotificationsSupported()
  const getToken = useTokenGetter()

  useEffect(() => {
    if (!pushSupported) return

    void registerCustomerPushToken(getToken).catch((error) => {
      console.warn("[push] register failed:", error)
    })

    const onAppState = (state: AppStateStatus) => {
      if (state !== "active") return
      void registerCustomerPushToken(getToken).catch(() => {})
    }

    const sub = AppState.addEventListener("change", onAppState)
    return () => sub.remove()
  }, [pushSupported, getToken])
}
```

Note: `useAuth()` from `@clerk/clerk-expo` is safe to call unconditionally here because `usePushRegistration()` is invoked from `apps/customer-mobile/app/_layout.tsx`'s `RootLayout`, which renders *outside* `AuthenticatedApp`/`ClerkProvider` today — check that call site (`grep -n "usePushRegistration" apps/customer-mobile/app/_layout.tsx`). If it's outside the provider, `useTokenGetter` must not call `useAuth()` when `!isAuthEnabled()`; since `isAuthEnabled()` is fixed for the app's lifetime (see Task 3), guard the whole hook the same "pick once at module load" way:

```typescript
function useTokenGetterEnabled(): (() => Promise<string | null>) | undefined {
  const { getToken } = useAuth()
  return getToken
}

function useTokenGetterDisabled(): undefined {
  return undefined
}

const useTokenGetter = isAuthEnabled() ? useTokenGetterEnabled : useTokenGetterDisabled
```

Use whichever of the two forms actually compiles cleanly against where `usePushRegistration()` is mounted relative to `ClerkProvider` — verify by reading `apps/customer-mobile/app/_layout.tsx` before finalizing this step.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter customer-mobile typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual verification**

Run the app with `EXPO_PUBLIC_AUTH_ENABLED=true`, sign in, and confirm (via a temporary log or a network inspector) that `POST /v1/public/push-tokens` now carries an `Authorization: Bearer` header.

- [ ] **Step 5: Commit**

```bash
git add apps/customer-mobile/lib/push-registration.ts apps/customer-mobile/lib/use-push-registration.ts
git commit -m "feat(customer-mobile): send Clerk token when registering for push"
```

---

### Task 9: Driver-mobile sends its Clerk token when registering for push

**Files:**
- Modify: `apps/driver-mobile/lib/push-registration.ts`
- Modify: `apps/driver-mobile/lib/use-push-registration.ts`

**Interfaces:**
- Same shape as Task 8, for the driver app.

- [ ] **Step 1: Update `registerDriverPushToken` to accept a token getter**

In `apps/driver-mobile/lib/push-registration.ts`, change the final function the same way as Task 8 Step 1 (identical structure, driver naming):

```typescript
export async function registerDriverPushToken(
  getToken?: () => Promise<string | null>,
): Promise<void> {
  if (!isNotificationsSupported()) return

  configureNotificationHandler()

  const granted = await requestPushPermissions()
  if (!granted) {
    Sentry.captureMessage("[push] Registration aborted — permission not granted", "warning")
    return
  }

  const expoPushToken = await getDriverExpoPushToken()
  if (!expoPushToken) {
    return
  }

  const platform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : undefined
  const anonymousDeviceId = await getOrCreateDeviceId()
  const token = await getToken?.().catch(() => null)

  try {
    await postJson(
      "/v1/public/driver-push-tokens",
      { expoPushToken, platform, anonymousDeviceId },
      token ? { Authorization: `Bearer ${token}` } : undefined,
    )
  } catch (error) {
    Sentry.captureException(error, { tags: { flow: "push-token-post" } })
    throw error
  }
}
```

- [ ] **Step 2: Update the hook and its stale comment**

Replace the full contents of `apps/driver-mobile/lib/use-push-registration.ts`:

```typescript
import { useEffect } from "react"
import { AppState, type AppStateStatus } from "react-native"
import { useAuth } from "@clerk/clerk-expo"

import { isAuthEnabled } from "@/lib/auth/is-auth-enabled"
import { isNotificationsSupported } from "@/lib/notifications-core"
import { registerDriverPushToken } from "@/lib/push-registration"

function useTokenGetterEnabled(): (() => Promise<string | null>) | undefined {
  const { getToken } = useAuth()
  return getToken
}

function useTokenGetterDisabled(): undefined {
  return undefined
}

const useTokenGetter = isAuthEnabled() ? useTokenGetterEnabled : useTokenGetterDisabled

/**
 * Registers this device's Expo push token with the API so ops staff can
 * broadcast announcements to it, attaching the signed-in account's Clerk
 * token (when auth is enabled) so the registration is linked to the account.
 */
export function usePushRegistration() {
  const pushSupported = isNotificationsSupported()
  const getToken = useTokenGetter()

  useEffect(() => {
    if (!pushSupported) return

    void registerDriverPushToken(getToken).catch((error) => {
      console.warn("[push] register failed:", error)
    })

    const onAppState = (state: AppStateStatus) => {
      if (state !== "active") return
      void registerDriverPushToken(getToken).catch(() => {})
    }

    const sub = AppState.addEventListener("change", onAppState)
    return () => sub.remove()
  }, [pushSupported, getToken])
}
```

As with Task 8 Step 2, verify against `apps/driver-mobile/app/_layout.tsx` where `usePushRegistration()` is mounted relative to `ClerkProvider`, and confirm the "pick the hook once at module load" form is safe there before finalizing.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter driver-mobile typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual verification**

Same as Task 8 Step 4, for `driver-mobile`.

- [ ] **Step 5: Commit**

```bash
git add apps/driver-mobile/lib/push-registration.ts apps/driver-mobile/lib/use-push-registration.ts
git commit -m "feat(driver-mobile): send Clerk token when registering for push"
```

---

### Task 10: Batched Clerk first-name lookup helper

**Files:**
- Create: `apps/api/lib/push/recipient-names.ts`

**Interfaces:**
- Consumes: `customerClerkClient` (`apps/api/lib/customer-clerk.ts`), `driverClerkClient` (`apps/api/lib/driver-clerk.ts`).
- Produces: `resolveFirstNames(audience: "customer" | "driver", clerkUserIds: string[]): Promise<Map<string, string>>` — maps `clerk_user_id` to `firstName`; ids with no resolvable name are simply absent from the map (never throws).

- [ ] **Step 1: Create the file**

```typescript
import { customerClerkClient } from "@/lib/customer-clerk"
import { driverClerkClient } from "@/lib/driver-clerk"

/** Clerk's Backend API caps getUserList at 100 user ids per request. */
const BATCH_SIZE = 100

/**
 * Batched firstName lookup for announcement personalization. Never throws —
 * a Clerk hiccup or a stale/deleted user id should just leave that recipient
 * unpersonalized, not fail the whole broadcast. Ids with no resolvable name
 * (deleted account, no firstName set) are simply absent from the returned map.
 */
export async function resolveFirstNames(
  audience: "customer" | "driver",
  clerkUserIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  const uniqueIds = [...new Set(clerkUserIds)]
  if (uniqueIds.length === 0) return names

  const client = audience === "customer" ? customerClerkClient : driverClerkClient

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const chunk = uniqueIds.slice(i, i + BATCH_SIZE)
    try {
      const { data } = await client.users.getUserList({ userId: chunk, limit: BATCH_SIZE })
      for (const user of data) {
        if (user.firstName) names.set(user.id, user.firstName)
      }
    } catch (error) {
      console.error(`[push] Failed to resolve ${audience} names for a batch:`, error)
    }
  }

  return names
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

From a scratch script or the Next.js dev console, call `resolveFirstNames("customer", ["<a real customer clerk_user_id>", "not-a-real-id"])` and confirm the map has one entry (the real id) and the fake id is silently absent.

- [ ] **Step 4: Commit**

```bash
git add apps/api/lib/push/recipient-names.ts
git commit -m "feat(api): add batched Clerk first-name lookup for announcement personalization"
```

---

### Task 11: `broadcastAnnouncement()` — personalize, target 4 apps, write delivery rows

**Files:**
- Modify: `apps/api/lib/push/broadcast-announcement.ts`

**Interfaces:**
- Consumes: `resolveFirstNames` (Task 10), `AnnouncementDelivery` model (Task 1), `prisma.customer.findMany`/`prisma.driverProfile.findMany` (existing models, `clerk_user_id` field on both).
- Produces: `broadcastAnnouncement(input: BroadcastCreateInput, sender: BroadcastSender)` — same exported signature as today, callers (the ops create-announcement route) are unaffected.

- [ ] **Step 1: Replace the full contents of `apps/api/lib/push/broadcast-announcement.ts`**

```typescript
import type { AnnouncementTargetApp, BroadcastCreateInput } from "@workspace/ops-contracts"

import { prisma } from "@/lib/prisma"
import { resolveFirstNames } from "@/lib/push/recipient-names"
import { sendExpoPushMessages } from "@/lib/push/expo-push"
import { recordPushTickets, type PushAudience } from "@/lib/push/receipts"

export type BroadcastSender = {
  clerkUserId: string
  email: string
}

const AUDIENCE_BY_APP: Record<AnnouncementTargetApp, PushAudience | null> = {
  "customer-mobile": "customer",
  "driver-mobile": "driver",
  "customer-web": null,
  "driver-web": null,
}

const CLERK_AUDIENCE_BY_APP: Record<AnnouncementTargetApp, "customer" | "driver"> = {
  "customer-mobile": "customer",
  "driver-mobile": "driver",
  "customer-web": "customer",
  "driver-web": "driver",
}

type MobileRecipient = { clerkUserId: string; expoPushTokens: string[] }
type WebRecipient = { clerkUserId: string }

/** Push-token recipients, grouped by clerk_user_id — a recipient with 2
 * devices gets one delivery row but 2 pushes (see Task 11 notes in the plan). */
async function collectMobileRecipients(
  app: "customer-mobile" | "driver-mobile",
): Promise<MobileRecipient[]> {
  const rows =
    app === "customer-mobile"
      ? await prisma.customerPushToken.findMany({
          where: { clerk_user_id: { not: null } },
          select: { clerk_user_id: true, expo_push_token: true },
        })
      : await prisma.driverPushToken.findMany({
          where: { clerk_user_id: { not: null } },
          select: { clerk_user_id: true, expo_push_token: true },
        })

  const grouped = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.clerk_user_id) continue
    const tokens = grouped.get(row.clerk_user_id) ?? []
    tokens.push(row.expo_push_token)
    grouped.set(row.clerk_user_id, tokens)
  }

  return [...grouped.entries()].map(([clerkUserId, expoPushTokens]) => ({
    clerkUserId,
    expoPushTokens,
  }))
}

/** Every token targeting a mobile app that has no clerk_user_id yet (not
 * migrated, or genuinely anonymous) — still gets the unpersonalized push. */
async function collectAnonymousMobileTokens(
  app: "customer-mobile" | "driver-mobile",
): Promise<string[]> {
  const rows =
    app === "customer-mobile"
      ? await prisma.customerPushToken.findMany({
          where: { clerk_user_id: null },
          select: { expo_push_token: true },
        })
      : await prisma.driverPushToken.findMany({
          where: { clerk_user_id: null },
          select: { expo_push_token: true },
        })
  return rows.map((row) => row.expo_push_token)
}

async function collectWebRecipients(app: "customer-web" | "driver-web"): Promise<WebRecipient[]> {
  if (app === "customer-web") {
    const rows = await prisma.customer.findMany({
      where: { clerk_user_id: { not: null } },
      select: { clerk_user_id: true },
    })
    return rows.map((row) => ({ clerkUserId: row.clerk_user_id! }))
  }

  const rows = await prisma.driverProfile.findMany({
    where: {},
    select: { clerk_user_id: true },
  })
  return rows.map((row) => ({ clerkUserId: row.clerk_user_id }))
}

function renderTemplate(template: string, firstName: string | undefined): string {
  if (!firstName) return template.replace(/\{\{\s*first_name\s*,?\s*\}\}?/g, "").trim()
  return template.replace(/\{\{\s*first_name\s*\}\}/g, firstName)
}

export async function broadcastAnnouncement(
  input: BroadcastCreateInput,
  sender: BroadcastSender,
) {
  const targetApps = input.target_apps

  const mobileApps = targetApps.filter(
    (app): app is "customer-mobile" | "driver-mobile" => AUDIENCE_BY_APP[app] !== null,
  )
  const webApps = targetApps.filter(
    (app): app is "customer-web" | "driver-web" => AUDIENCE_BY_APP[app] === null,
  )

  const mobileRecipientsByApp = new Map<string, MobileRecipient[]>()
  const anonymousTokensByApp = new Map<string, string[]>()
  for (const app of mobileApps) {
    mobileRecipientsByApp.set(app, await collectMobileRecipients(app))
    anonymousTokensByApp.set(app, await collectAnonymousMobileTokens(app))
  }

  const webRecipientsByApp = new Map<string, WebRecipient[]>()
  for (const app of webApps) {
    webRecipientsByApp.set(app, await collectWebRecipients(app))
  }

  const totalRecipients =
    [...mobileRecipientsByApp.values()].reduce((n, rows) => n + rows.length, 0) +
    [...anonymousTokensByApp.values()].reduce((n, tokens) => n + tokens.length, 0) +
    [...webRecipientsByApp.values()].reduce((n, rows) => n + rows.length, 0)

  const broadcast = await prisma.announcementBroadcast.create({
    data: {
      title: input.title,
      body: input.body,
      category: input.category,
      image_url: input.image_url ?? null,
      sent_by_clerk_id: sender.clerkUserId,
      sent_by_email: sender.email,
      target_apps: targetApps,
      target_count: totalRecipients,
      status: totalRecipients === 0 ? "sent" : "sending",
    },
  })

  if (totalRecipients === 0) {
    return broadcast
  }

  // One batched Clerk lookup per audience covers every app sharing that
  // audience (e.g. customer-mobile + customer-web both resolve against the
  // customer Clerk instance).
  const customerIds = [
    ...(mobileRecipientsByApp.get("customer-mobile") ?? []).map((r) => r.clerkUserId),
    ...(webRecipientsByApp.get("customer-web") ?? []).map((r) => r.clerkUserId),
  ]
  const driverIds = [
    ...(mobileRecipientsByApp.get("driver-mobile") ?? []).map((r) => r.clerkUserId),
    ...(webRecipientsByApp.get("driver-web") ?? []).map((r) => r.clerkUserId),
  ]
  const [customerNames, driverNames] = await Promise.all([
    resolveFirstNames("customer", customerIds),
    resolveFirstNames("driver", driverIds),
  ])
  const namesByAudience: Record<"customer" | "driver", Map<string, string>> = {
    customer: customerNames,
    driver: driverNames,
  }

  const deliveryRows: {
    broadcast_id: number
    clerk_user_id: string
    app: string
    title: string
    body: string
    image_url: string | null
    category: string
  }[] = []

  let queuedPush = 0
  let totalPushAttempts = 0
  const invalidTokensByApp = new Map<"customer-mobile" | "driver-mobile", string[]>()

  for (const app of mobileApps) {
    const audience = CLERK_AUDIENCE_BY_APP[app]
    const names = namesByAudience[audience]
    const pushAudience = AUDIENCE_BY_APP[app] as PushAudience

    const recipients = mobileRecipientsByApp.get(app) ?? []
    const payloads: { to: string; title: string; body: string; clerkUserId: string }[] = []

    for (const recipient of recipients) {
      const name = names.get(recipient.clerkUserId)
      const title = renderTemplate(input.title, name)
      const body = renderTemplate(input.body, name)

      deliveryRows.push({
        broadcast_id: broadcast.id,
        clerk_user_id: recipient.clerkUserId,
        app,
        title,
        body,
        image_url: input.image_url ?? null,
        category: input.category,
      })

      for (const token of recipient.expoPushTokens) {
        payloads.push({ to: token, title, body, clerkUserId: recipient.clerkUserId })
      }
    }

    const unpersonalizedTitle = renderTemplate(input.title, undefined)
    const unpersonalizedBody = renderTemplate(input.body, undefined)
    for (const token of anonymousTokensByApp.get(app) ?? []) {
      payloads.push({
        to: token,
        title: unpersonalizedTitle,
        body: unpersonalizedBody,
        clerkUserId: "",
      })
    }

    if (payloads.length === 0) continue
    totalPushAttempts += payloads.length

    try {
      const result = await sendExpoPushMessages(
        payloads.map((p) => ({
          to: p.to,
          title: p.title,
          body: p.body,
          sound: "default" as const,
          channelId: "default",
          color: "#0b6e4f",
          priority: "high" as const,
          data: { type: "announcement", category: input.category },
          ...(input.image_url ? { richContent: { image: input.image_url } } : {}),
        })),
      )
      queuedPush += result.outcomes.filter((o) => o.status === "queued").length

      try {
        await recordPushTickets({ audience: pushAudience, broadcastId: broadcast.id, outcomes: result.outcomes })
      } catch (error) {
        console.error("[push] Failed to record push tickets:", error)
      }

      if (result.invalidTokens.length > 0) {
        invalidTokensByApp.set(app, result.invalidTokens)
      }
    } catch (error) {
      console.error(`[push] Failed to send announcement broadcast to ${app}:`, error)
    }
  }

  for (const app of webApps) {
    const audience = CLERK_AUDIENCE_BY_APP[app]
    const names = namesByAudience[audience]
    const recipients = webRecipientsByApp.get(app) ?? []

    for (const recipient of recipients) {
      const name = names.get(recipient.clerkUserId)
      deliveryRows.push({
        broadcast_id: broadcast.id,
        clerk_user_id: recipient.clerkUserId,
        app,
        title: renderTemplate(input.title, name),
        body: renderTemplate(input.body, name),
        image_url: input.image_url ?? null,
        category: input.category,
      })
    }
  }

  if (deliveryRows.length > 0) {
    try {
      await prisma.announcementDelivery.createMany({ data: deliveryRows })
    } catch (error) {
      console.error("[push] Failed to write announcement delivery rows:", error)
    }
  }

  for (const [app, tokens] of invalidTokensByApp) {
    try {
      if (app === "driver-mobile") {
        await prisma.driverPushToken.deleteMany({ where: { expo_push_token: { in: tokens } } })
      } else {
        await prisma.customerPushToken.deleteMany({ where: { expo_push_token: { in: tokens } } })
      }
    } catch (error) {
      console.error("[push] Failed to clean up invalid tokens:", error)
    }
  }

  const status = totalPushAttempts > 0 ? (queuedPush === 0 ? "failed" : "sending") : "sent"

  return prisma.announcementBroadcast.update({
    where: { id: broadcast.id },
    data: {
      delivered_count: 0,
      invalid_count: totalPushAttempts - queuedPush,
      status,
    },
  })
}
```

Note on `collectWebRecipients` for `driver-web`: `DriverProfile.clerk_user_id` is `String @unique` (never null — see the schema), so unlike `Customer` it needs no `not: null` filter; the `where: {}` above is intentionally a no-op filter kept only for symmetry — remove it if the linter flags an empty `where`.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

Seed 2 customer push tokens (one with `clerk_user_id` set to a real test account, one without), 1 web-only customer account (`Customer` row with `clerk_user_id` set, no push token), then call `broadcastAnnouncement()` from a scratch script with `title: "Hi {{first_name}}"`, `body: "Test {{first_name}}"`, `target_apps: ["customer-mobile", "customer-web"]`. Confirm in Prisma Studio: 3 `AnnouncementDelivery` rows (2 for `customer-mobile`, 1 for `customer-web`), the linked-token row's title has the real first name substituted, the anonymous-token row's title has no `{{first_name}}` artifact, and only the 2 mobile rows correspond to `PushTicket` rows.

- [ ] **Step 4: Commit**

```bash
git add apps/api/lib/push/broadcast-announcement.ts
git commit -m "feat(api): personalize announcements per recipient and target web apps"
```

---

### Task 12: `/v1/customer/announcements` — read + mark-read endpoints

**Files:**
- Create: `apps/api/app/v1/customer/announcements/route.ts`
- Create: `apps/api/app/v1/customer/announcements/read/route.ts`

**Interfaces:**
- Consumes: `requireCustomerAccess()` (Task 2).
- Produces: `GET /v1/customer/announcements` → `AnnouncementDeliveryDto[]` (`{ id, title, body, image_url, category, read_at, created_at }`); `PATCH /v1/customer/announcements/read` → `{ success: true }`, marks every unread row for the caller as read.

- [ ] **Step 1: Create the GET route**

```typescript
import { NextResponse } from "next/server"

import { requireCustomerAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

const LIST_LIMIT = 30

export async function GET() {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  const rows = await prisma.announcementDelivery.findMany({
    where: { clerk_user_id: auth.access.userId, app: "customer-web" },
    orderBy: { created_at: "desc" },
    take: LIST_LIMIT,
  })

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      image_url: row.image_url,
      category: row.category,
      read_at: row.read_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
    })),
  )
}
```

Note: this route is scoped to `app: "customer-web"` — the customer-mobile client reads a *different* route (Task 13/15 add `customer-mobile`'s own filter, mirroring how `driver-web`'s and `driver-mobile`'s reads must not cross). If Task 15 ends up needing the exact same recipient (one account, one inbox across both surfaces), revisit this filter then — for now, per the spec's per-app `AnnouncementDelivery.app` column, each surface reads only its own rows.

- [ ] **Step 2: Create the PATCH read route**

```typescript
import { NextResponse } from "next/server"

import { requireCustomerAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export async function PATCH() {
  const auth = await requireCustomerAccess()
  if (auth.error) return auth.error

  await prisma.announcementDelivery.updateMany({
    where: { clerk_user_id: auth.access.userId, app: "customer-web", read_at: null },
    data: { read_at: new Date() },
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual verification**

With a delivery row seeded for a test customer account (from Task 11's verification), call:

```bash
curl -s http://localhost:3003/v1/customer/announcements -H "Authorization: Bearer <token>"
curl -s -X PATCH http://localhost:3003/v1/customer/announcements/read -H "Authorization: Bearer <token>"
```

Expected: first call returns the seeded row with `read_at: null`; second call returns `{"success":true}` and a follow-up GET shows `read_at` populated.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/v1/customer/announcements
git commit -m "feat(api): add authenticated customer announcements inbox endpoints"
```

---

### Task 13: `/v1/driver/announcements` — read + mark-read endpoints

**Files:**
- Create: `apps/api/app/v1/driver/announcements/route.ts`
- Create: `apps/api/app/v1/driver/announcements/read/route.ts`

**Interfaces:**
- Consumes: `requireDriverAccess()` (already exists, used by `apps/api/app/v1/driver/notifications/route.ts` as the pattern to mirror).
- Produces: same DTO shape as Task 12, scoped to `app: "driver-web"`.

- [ ] **Step 1: Create the GET route**

```typescript
import { NextResponse } from "next/server"

import { requireDriverAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

const LIST_LIMIT = 30

export async function GET() {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  const rows = await prisma.announcementDelivery.findMany({
    where: { clerk_user_id: auth.access.userId, app: "driver-web" },
    orderBy: { created_at: "desc" },
    take: LIST_LIMIT,
  })

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      image_url: row.image_url,
      category: row.category,
      read_at: row.read_at?.toISOString() ?? null,
      created_at: row.created_at.toISOString(),
    })),
  )
}
```

- [ ] **Step 2: Create the PATCH read route**

```typescript
import { NextResponse } from "next/server"

import { requireDriverAccess } from "@/lib/api-utils"
import { prisma } from "@/lib/prisma"

export async function PATCH() {
  const auth = await requireDriverAccess()
  if (auth.error) return auth.error

  await prisma.announcementDelivery.updateMany({
    where: { clerk_user_id: auth.access.userId, app: "driver-web", read_at: null },
    data: { read_at: new Date() },
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual verification**

Same as Task 12 Step 4, using a driver Clerk session token and `/v1/driver/announcements`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/app/v1/driver/announcements
git commit -m "feat(api): add authenticated driver announcements inbox endpoints"
```

---

### Task 14: Mobile apps read "my deliveries" instead of the public app-wide feed

**Files:**
- Create: `apps/customer-mobile/lib/announcements-client.ts`
- Create: `apps/driver-mobile/lib/announcements-client.ts`
- Modify: `apps/customer-mobile/lib/use-live-announcements.ts`
- Modify: `apps/driver-mobile/lib/use-live-announcements.ts`
- Modify: `apps/customer-mobile/app/notifications.tsx`
- Modify: `apps/driver-mobile/app/notifications.tsx`
- Modify: `apps/customer-mobile/lib/notifications-data.ts`
- Modify: `apps/driver-mobile/lib/notifications-data.ts`

These two new API endpoints (`/v1/customer/announcements`, `/v1/driver/announcements`) are scoped to the *web* apps (Task 12/13). Mobile needs its own equivalent, symmetric endpoints scoped to `app: "customer-mobile"` / `"driver-mobile"` — add them now rather than reusing the web ones, so mobile and web read from disjoint `AnnouncementDelivery` rows the same way their push-token tables are already disjoint.

**Interfaces:**
- Produces (new, added in Step 1 below): `GET /v1/customer/mobile-announcements`, `PATCH /v1/customer/mobile-announcements/read`, `GET /v1/driver/mobile-announcements`, `PATCH /v1/driver/mobile-announcements/read` — same DTO/response shape as Task 12/13, filtered to the mobile `app` value.
- Produces: `announcementDeliveryToNotificationItem(dto): NotificationItem` (replaces `announcementToNotificationItem`), `fetchCustomerAnnouncements(getToken)`/`markCustomerAnnouncementsRead(getToken)` (customer-mobile), `fetchDriverAnnouncements(getToken)`/`markDriverAnnouncementsRead(getToken)` (driver-mobile).

- [ ] **Step 1: Add the two missing mobile-scoped API routes**

Create `apps/api/app/v1/customer/mobile-announcements/route.ts` and `apps/api/app/v1/customer/mobile-announcements/read/route.ts`, copying Task 12's two files verbatim except `app: "customer-web"` becomes `app: "customer-mobile"`.

Create `apps/api/app/v1/driver/mobile-announcements/route.ts` and `apps/api/app/v1/driver/mobile-announcements/read/route.ts`, copying Task 13's two files verbatim except `app: "driver-web"` becomes `app: "driver-mobile"`.

Run: `pnpm --filter api typecheck` — expected: exits 0.

Commit this step on its own:
```bash
git add apps/api/app/v1/customer/mobile-announcements apps/api/app/v1/driver/mobile-announcements
git commit -m "feat(api): add mobile-scoped announcement inbox endpoints"
```

- [ ] **Step 2: Customer-mobile announcements client**

Create `apps/customer-mobile/lib/announcements-client.ts`:

```typescript
import { getJson, postJson } from "@/lib/api-client"
import type { AnnouncementDeliveryDto } from "@/lib/notifications-data"

type GetToken = () => Promise<string | null>

async function authedHeaders(getToken: GetToken): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchCustomerAnnouncements(
  getToken: GetToken,
): Promise<AnnouncementDeliveryDto[]> {
  return getJson<AnnouncementDeliveryDto[]>(
    "/v1/customer/mobile-announcements",
    await authedHeaders(getToken),
  )
}

export async function markCustomerAnnouncementsRead(getToken: GetToken): Promise<void> {
  await postJson<{ success: true }>(
    "/v1/customer/mobile-announcements/read",
    {},
    await authedHeaders(getToken),
  )
}
```

Note: `postJson` always sends a JSON body — the `read` route ignores it, which is fine (matches how `PATCH` bodies are commonly ignored elsewhere in this codebase, e.g. `markDriverNotificationsRead`).

- [ ] **Step 3: Driver-mobile announcements client**

Create `apps/driver-mobile/lib/announcements-client.ts` — identical to Step 2 with `customer` → `driver` and `/v1/customer/mobile-announcements` → `/v1/driver/mobile-announcements`.

- [ ] **Step 4: Update `notifications-data.ts` in both apps**

In `apps/customer-mobile/lib/notifications-data.ts` and `apps/driver-mobile/lib/notifications-data.ts`, replace the `AnnouncementBroadcastDto`/`announcementToNotificationItem` pair (currently reading `id`, `created_at`, `image_url` as snake_case broadcast fields) with:

```typescript
export type AnnouncementDeliveryDto = {
  id: number
  title: string
  body: string
  category?: string | null
  image_url?: string | null
  read_at: string | null
  created_at: string
}

function parseCategory(value: string | null | undefined): NotificationCategory {
  if (value && NOTIFICATION_CATEGORY_ORDER.includes(value as NotificationCategory)) {
    return value as NotificationCategory
  }
  return "announcement"
}

export function announcementDeliveryToNotificationItem(dto: AnnouncementDeliveryDto): NotificationItem {
  return {
    id: `announcement-${dto.id}`,
    category: parseCategory(dto.category),
    title: dto.title,
    body: dto.body,
    imageUrl: dto.image_url ?? null,
    createdAt: dto.created_at,
    read: Boolean(dto.read_at),
    group: dayDiff(dto.created_at) <= 0 ? "today" : "earlier",
  }
}
```

(Keep `parseCategory` as a single definition — remove the old `AnnouncementBroadcastDto` and `announcementToNotificationItem` entirely; `parseCategory` already existed under that name in the file being replaced, so this step just renames its caller.)

- [ ] **Step 5: Rewrite `useLiveAnnouncements()` in both apps to be authenticated**

Replace `apps/customer-mobile/lib/use-live-announcements.ts`:

```typescript
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@clerk/clerk-expo"

import { fetchCustomerAnnouncements } from "@/lib/announcements-client"
import { announcementDeliveryToNotificationItem, type NotificationItem } from "@/lib/notifications-data"

/** Fetches this account's own delivered announcements — only what was sent
 * while this account was a resolved recipient, never the full app-wide feed. */
export function useLiveAnnouncements() {
  const { getToken } = useAuth()

  const query = useQuery({
    queryKey: ["live-announcements"],
    queryFn: async (): Promise<NotificationItem[]> => {
      const items = await fetchCustomerAnnouncements(getToken)
      return items.map(announcementDeliveryToNotificationItem)
    },
  })

  return {
    items: query.data ?? [],
    loading: query.isLoading,
    refetch: async () => {
      await query.refetch()
    },
  }
}
```

Replace `apps/driver-mobile/lib/use-live-announcements.ts` identically, swapping `fetchCustomerAnnouncements` for `fetchDriverAnnouncements` and the import path.

Note: `useAuth()` here requires `ClerkProvider` to be mounted — confirm `notifications.tsx` is only ever reached from inside `AuthenticatedApp` (it's a `Stack.Screen` under the authenticated root stack per `app/_layout.tsx`, so this holds without further changes).

- [ ] **Step 6: Wire real "mark read" into `notifications.tsx` in both apps, retiring the AsyncStorage-only read state**

In `apps/customer-mobile/app/notifications.tsx`, replace the local `readIds`/`notification-read-state` machinery. The relevant block currently is:

```typescript
import {
  getReadNotificationIds,
  markNotificationRead,
  markNotificationsRead,
} from "@/lib/notification-read-state"
```
...
```typescript
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  ...
  useEffect(() => {
    void getReadNotificationIds().then(setReadIds)
  }, [])

  const items = useMemo(
    () => liveItems.map((item) => ({ ...item, read: readIds.has(item.id) })),
    [liveItems, readIds],
  )
  ...
  const markRead = useCallback((id: string) => {
    setReadIds((current) => (current.has(id) ? current : new Set(current).add(id)))
    void markNotificationRead(id)
  }, [])

  const markAllRead = useCallback(() => {
    const ids = items.map((item) => item.id)
    setReadIds((current) => new Set([...current, ...ids]))
    void markNotificationsRead(ids)
  }, [items])
```

Replace with (removing the `notification-read-state` import and the `readIds` state entirely, since `liveItems` from `useLiveAnnouncements()` already carries the server's `read` field via `announcementDeliveryToNotificationItem`):

```typescript
import { useAuth } from "@clerk/clerk-expo"
import { markCustomerAnnouncementsRead } from "@/lib/announcements-client"
```
...
```typescript
  const { getToken } = useAuth()
  const items = liveItems
  ...
  const markRead = useCallback(() => {
    void markCustomerAnnouncementsRead(getToken).then(() => refetchLive())
  }, [getToken, refetchLive])

  const markAllRead = useCallback(() => {
    void markCustomerAnnouncementsRead(getToken).then(() => refetchLive())
  }, [getToken, refetchLive])
```

Update the two call sites: `renderItem={({ item }) => (<NotificationRow item={item} onPress={() => markRead()} />)}` and the existing `onPress={markAllRead}` — both no longer take an `id` argument since the server marks the whole inbox read in one call (matching how `driver-web`'s bell already does "opening it marks everything read" rather than per-item read tracking). If per-item read (tapping one notification shouldn't mark the others read) is required, that needs a per-row `PATCH /v1/customer/mobile-announcements/:id/read` — treat that as a follow-up, not part of this task, and confirm the mark-all behavior is acceptable before shipping (flag this trade-off to whoever reviews this task).

Apply the identical change to `apps/driver-mobile/app/notifications.tsx` (swap `markCustomerAnnouncementsRead` for `markDriverAnnouncementsRead`).

- [ ] **Step 7: Delete the now-unused local read-state files**

Run: `rm apps/customer-mobile/lib/notification-read-state.ts apps/driver-mobile/lib/notification-read-state.ts` (Bash) or the PowerShell equivalent `Remove-Item`. Confirm nothing else imports them: `grep -rn "notification-read-state" apps/customer-mobile apps/driver-mobile` should return nothing.

- [ ] **Step 8: Typecheck both apps**

Run: `pnpm --filter customer-mobile typecheck && pnpm --filter driver-mobile typecheck`
Expected: both exit 0.

- [ ] **Step 9: Manual verification**

Run each app, sign in, trigger a test broadcast targeting that app (via the ops console once Task 16 lands, or directly via `broadcastAnnouncement()` in a scratch script), pull-to-refresh the notifications screen, confirm the personalized item appears with the real first name, tap "Mark all as read," confirm it clears and persists across an app restart (proving it's server-side now, not AsyncStorage).

- [ ] **Step 10: Commit**

```bash
git add apps/customer-mobile/lib/announcements-client.ts apps/driver-mobile/lib/announcements-client.ts \
        apps/customer-mobile/lib/use-live-announcements.ts apps/driver-mobile/lib/use-live-announcements.ts \
        apps/customer-mobile/app/notifications.tsx apps/driver-mobile/app/notifications.tsx \
        apps/customer-mobile/lib/notifications-data.ts apps/driver-mobile/lib/notifications-data.ts
git rm apps/customer-mobile/lib/notification-read-state.ts apps/driver-mobile/lib/notification-read-state.ts
git commit -m "feat(mobile): read personalized per-account announcement inbox instead of the app-wide feed"
```

---

### Task 15: `driver-web`'s bell merges in announcements; `customer-web` gets a bell

**Files:**
- Modify: `apps/driver-web/lib/driver-notifications-client.ts`
- Modify: `apps/driver-web/components/shell/notification-bell.tsx`
- Create: `apps/customer-web/lib/announcements-client.ts`
- Create: `apps/customer-web/components/shell/notification-bell.tsx`
- Modify: `apps/customer-web/components/shell/app-shell.tsx`

**Interfaces:**
- Consumes: `/v1/driver/announcements` (Task 13), `/v1/customer/announcements` (Task 12).
- Produces: `driver-web`'s `NotificationBell` shows a merged list; `customer-web` gets a new, working `NotificationBell` mounted the same way `driver-web`'s already is.

- [ ] **Step 1: Add an announcement fetch to `driver-notifications-client.ts`**

Add to `apps/driver-web/lib/driver-notifications-client.ts` (keep the existing `fetchDriverNotifications`/`markDriverNotificationsRead` untouched):

```typescript
export type DriverAnnouncementDto = {
  id: number
  title: string
  body: string
  image_url: string | null
  category: string
  read_at: string | null
  created_at: string
}

export async function fetchDriverAnnouncements(
  getToken: GetToken,
): Promise<DriverAnnouncementDto[]> {
  const res = await authedFetch(getToken, "/v1/driver/announcements")
  return res.json()
}

export async function markDriverAnnouncementsRead(getToken: GetToken): Promise<void> {
  await authedFetch(getToken, "/v1/driver/announcements/read", { method: "PATCH" })
}
```

- [ ] **Step 2: Merge announcements into the bell**

In `apps/driver-web/components/shell/notification-bell.tsx`, add a second query and merge:

```typescript
import {
  fetchDriverAnnouncements,
  fetchDriverNotifications,
  markDriverAnnouncementsRead,
  markDriverNotificationsRead,
} from "@/lib/driver-notifications-client"
```

Replace the single query/mutation with two, and derive a merged, sorted list:

```typescript
  const notificationsQuery = useQuery({
    queryKey: ["driver-notifications"],
    queryFn: () => fetchDriverNotifications(getToken),
    refetchInterval: POLL_INTERVAL_MS,
  })
  const announcementsQuery = useQuery({
    queryKey: ["driver-announcements"],
    queryFn: () => fetchDriverAnnouncements(getToken),
    refetchInterval: POLL_INTERVAL_MS,
  })

  const merged = [
    ...(notificationsQuery.data ?? []).map((n) => ({ ...n, id: `lifecycle-${n.id}` })),
    ...(announcementsQuery.data ?? []).map((a) => ({ ...a, id: `announcement-${a.id}`, type: "announcement" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const notifications = merged

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([markDriverNotificationsRead(getToken), markDriverAnnouncementsRead(getToken)])
    },
  })
```

Update `handleOpenChange`'s optimistic update to set `read_at` on both query caches (`["driver-notifications"]` and `["driver-announcements"]`) the same way it currently does for one, and update `TYPE_DOT` to include an `announcement: "bg-blue-500"` entry (or reuse an existing color) so announcement rows get a dot. `unreadCount` and the rest of the render logic are unchanged since they already operate on the `notifications` array.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter driver-web typecheck`
Expected: exits 0.

- [ ] **Step 4: Create the customer-web announcements client**

Create `apps/customer-web/lib/announcements-client.ts`:

```typescript
import { useAuth } from "@clerk/nextjs"

import { apiPublicUrl } from "@/lib/site-urls"

export type CustomerAnnouncementDto = {
  id: number
  title: string
  body: string
  image_url: string | null
  category: string
  read_at: string | null
  created_at: string
}

type GetToken = ReturnType<typeof useAuth>["getToken"]

async function authedFetch(getToken: GetToken, path: string, init?: RequestInit) {
  const token = await getToken()
  const headers = new Headers(init?.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const res = await fetch(`${apiPublicUrl()}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }
  return res
}

export async function fetchCustomerAnnouncements(
  getToken: GetToken,
): Promise<CustomerAnnouncementDto[]> {
  const res = await authedFetch(getToken, "/v1/customer/announcements")
  return res.json()
}

export async function markCustomerAnnouncementsRead(getToken: GetToken): Promise<void> {
  await authedFetch(getToken, "/v1/customer/announcements/read", { method: "PATCH" })
}
```

Verify `apiPublicUrl` exists at `apps/customer-web/lib/site-urls.ts` (`grep -n "apiPublicUrl" apps/customer-web/lib/site-urls.ts`) before finalizing this import — if the customer-web API base URL helper has a different name, use that instead.

- [ ] **Step 5: Create the customer-web bell**

Create `apps/customer-web/components/shell/notification-bell.tsx`, adapted from `apps/driver-web/components/shell/notification-bell.tsx` (Step 2's pre-merge version, since customer-web has no lifecycle-notification system to merge with):

```typescript
"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@clerk/nextjs"
import { Bell } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

import {
  fetchCustomerAnnouncements,
  markCustomerAnnouncementsRead,
  type CustomerAnnouncementDto,
} from "@/lib/announcements-client"

const POLL_INTERVAL_MS = 60_000

export function NotificationBell() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const notificationsQuery = useQuery({
    queryKey: ["customer-announcements"],
    queryFn: () => fetchCustomerAnnouncements(getToken),
    refetchInterval: POLL_INTERVAL_MS,
  })
  const notifications = notificationsQuery.data ?? []

  const markReadMutation = useMutation({
    mutationFn: () => markCustomerAnnouncementsRead(getToken),
  })

  const unreadCount = notifications.filter((n) => !n.read_at).length

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && unreadCount > 0) {
      const readAt = new Date().toISOString()
      queryClient.setQueryData<CustomerAnnouncementDto[]>(["customer-announcements"], (prev) =>
        prev?.map((n) => ({ ...n, read_at: n.read_at ?? readAt })) ?? prev,
      )
      markReadMutation.mutate()
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative" aria-label="Notifications">
          <Bell aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 min-w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up
          </p>
        ) : (
          <div className="-mx-1 max-h-80 space-y-0.5 overflow-y-auto px-1">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex gap-2 rounded-md px-1 py-2 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.body}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 6: Mount the bell in `customer-web`'s shell**

In `apps/customer-web/components/shell/app-shell.tsx`, add the import next to `ThemeToggle`'s (line 32) and render it right before `<ThemeToggle />` (line 146), guarded the same way `useUserIfEnabled` already guards `useUser()` in this same file — since `NotificationBell` calls `useAuth()` unconditionally, wrap its render (not the hook) behind `isAuthEnabled()`:

```typescript
import { NotificationBell } from "@/components/shell/notification-bell"
```
```typescript
              {isAuthEnabled() ? <NotificationBell /> : null}
              <ThemeToggle />
```

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter customer-web typecheck`
Expected: exits 0.

- [ ] **Step 8: Manual verification**

Run both `driver-web` and `customer-web` dev servers, sign in on each, trigger test broadcasts targeting `driver-web` and `customer-web` respectively, confirm each bell shows the personalized item and that opening the dropdown clears the unread badge and persists across reload.

- [ ] **Step 9: Commit**

```bash
git add apps/driver-web/lib/driver-notifications-client.ts apps/driver-web/components/shell/notification-bell.tsx \
        apps/customer-web/lib/announcements-client.ts apps/customer-web/components/shell/notification-bell.tsx \
        apps/customer-web/components/shell/app-shell.tsx
git commit -m "feat(web): merge announcements into driver-web's bell and add one to customer-web"
```

---

### Task 16: Ops composer — merge-field hint and preview

**Files:**
- Modify: `apps/ops/app/(dashboard)/announcements/announcement-form-dialog.tsx`

**Interfaces:**
- No new exports — purely a UI addition below the existing title/body fields.

- [ ] **Step 1: Add a preview that renders `{{first_name}}` against a sample name**

In `announcement-form-dialog.tsx`, right after the body `Textarea` block (after line 230, before the image field), add:

```typescript
          <p className="text-xs text-muted-foreground">
            Use <code className="rounded bg-muted px-1 py-0.5">{"{{first_name}}"}</code> to
            personalize with the recipient&apos;s first name.
            {(title.includes("{{first_name}}") || body.includes("{{first_name}}")) && (
              <span className="mt-1 block rounded-md border border-dashed p-2">
                Preview: <strong>{title.replace(/\{\{\s*first_name\s*\}\}/g, "Jordan")}</strong>
                <br />
                {body.replace(/\{\{\s*first_name\s*\}\}/g, "Jordan")}
              </span>
            )}
          </p>
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter ops typecheck`
Expected: exits 0.

- [ ] **Step 3: Manual verification**

Run `pnpm --filter ops dev`, open the announcement composer, type `Hi {{first_name}}` in the title — confirm the preview line appears showing "Hi Jordan," and that the 4 target-app checkboxes from Task 5 all render and are independently toggleable.

- [ ] **Step 4: Commit**

```bash
git add apps/ops/app/\(dashboard\)/announcements/announcement-form-dialog.tsx
git commit -m "feat(ops): show a merge-field hint and preview in the announcement composer"
```

---

## Part 3 — Account-linked support

### Task 17: Support create route resolves and stamps the signed-in account

**Files:**
- Modify: `apps/api/lib/support.ts`
- Modify: `apps/api/app/v1/public/support/route.ts`

**Interfaces:**
- Consumes: `getCustomerAccess()` (Task 2), `getDriverAccess()` (existing).
- Produces: `resolveSupportAuthor(channel: string): Promise<{ customerId: number | null; driverClerkUserId: string | null }>` in `apps/api/lib/support.ts`; `SupportCase.customer_id`/`driver_clerk_user_id` get populated on create when the caller is signed in.

- [ ] **Step 1: Add `resolveSupportAuthor` to `apps/api/lib/support.ts`**

Add near the top of the file, after the existing imports:

```typescript
import { getCustomerAccess } from "@/lib/customer-auth"
import { getDriverAccess } from "@/lib/driver-auth"
```

Add the new function (anywhere after the imports, e.g. right after `getBearerToken`):

```typescript
/**
 * Resolves the signed-in account for a support case being created, based on
 * which app it's coming from. Never throws — an unauthenticated or
 * unverifiable caller just gets both ids as null, same as today's fully
 * anonymous flow.
 */
export async function resolveSupportAuthor(
  channel: string,
): Promise<{ customerId: number | null; driverClerkUserId: string | null }> {
  if (channel === "customer-web" || channel === "customer-mobile") {
    const access = await getCustomerAccess()
    if (access.status !== "authorized") return { customerId: null, driverClerkUserId: null }

    const customer = await prisma.customer.upsert({
      where: { clerk_user_id: access.userId },
      create: { clerk_user_id: access.userId, email: `${access.userId}@placeholder.invalid` },
      update: {},
    })
    return { customerId: customer.id, driverClerkUserId: null }
  }

  if (channel === "driver-web" || channel === "driver-mobile") {
    const access = await getDriverAccess()
    if (access.status !== "authorized") return { customerId: null, driverClerkUserId: null }
    return { customerId: null, driverClerkUserId: access.userId }
  }

  return { customerId: null, driverClerkUserId: null }
}
```

This uses `upsert` against `Customer.clerk_user_id` rather than a lookup-by-email, because at support-case-create time the request already supplies the real `contact_email` separately — the `Customer` row's `email` is a placeholder only until Task 18 gives customer-web/customer-mobile a real "sync my Clerk email onto my Customer row" step. Revisit this placeholder once that's confirmed necessary; for now it satisfies `Customer.email`'s `@unique` constraint without colliding with a real address.

- [ ] **Step 2: Wire it into the create route**

In `apps/api/app/v1/public/support/route.ts`, add the import and call it before `prisma.supportCase.create`:

```typescript
import { getBearerToken, mintIdentityTokenIfAbsent, resolveSupportAuthor, toPublicCase, verifyIdentityToken } from "@/lib/support"
```

```typescript
  const data = parsed.data
  const accessToken = generateAccessToken()
  const { customerId, driverClerkUserId } = await resolveSupportAuthor(data.channel)

  try {
    const supportCase = await prisma.supportCase.create({
      data: {
        contact_name: data.contact_name,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone ?? null,
        anonymous_device_id: data.anonymous_device_id ?? null,
        customer_id: customerId,
        driver_clerk_user_id: driverClerkUserId,
        access_token_hash: hashAccessToken(accessToken),
        channel: data.channel,
        category: data.category,
        subject: data.subject,
        messages: {
          create: {
            author_type: "customer",
            author_email: data.contact_email,
            body: data.message,
          },
        },
      },
    })
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual verification**

```bash
curl -s -X POST http://localhost:3003/v1/public/support \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <a real customer Clerk token>" \
  -d '{"contact_name":"Test User","contact_email":"test@example.com","channel":"customer-web","category":"general","subject":"Test","message":"Testing account link"}'
```

Expected: `201`, and the created `SupportCase` row in Prisma Studio has `customer_id` set to a real `Customer` row whose `clerk_user_id` matches the token's subject. Repeat without the `Authorization` header — `customer_id` should be `null`, everything else unchanged (existing anonymous flow untouched).

- [ ] **Step 5: Commit**

```bash
git add apps/api/lib/support.ts apps/api/app/v1/public/support/route.ts
git commit -m "feat(api): stamp support cases with the signed-in account when present"
```

---

### Task 18: "My cases" — authenticated lookup, no email/identity-token needed

**Files:**
- Modify: `apps/api/lib/support.ts`
- Modify: `apps/api/app/v1/public/support/route.ts`

**Interfaces:**
- Produces: `GET /v1/public/support` now also accepts an `Authorization: Bearer <token>` with **no** `?email=` query param — when present and it verifies against either the customer or driver Clerk instance, cases are looked up by `customer_id`/`driver_clerk_user_id` instead of the email + identity-token pair. The existing `?email=` + identity-token path is unchanged and still the fallback.

- [ ] **Step 1: Add an account-based lookup to `apps/api/lib/support.ts`**

Add after `resolveSupportAuthor` (Task 17):

```typescript
/**
 * Account-based "my cases" lookup — tries customer, then driver, since the
 * caller's app isn't known from a bare GET the way it is on create (no
 * `channel` in the request). A token only verifies against the instance it
 * was minted from, so at most one of these two resolves for any given caller.
 */
export async function resolveSupportAuthorFromBearer(
  token: string,
): Promise<{ customerId: number | null; driverClerkUserId: string | null }> {
  try {
    const customerPayload = await verifyToken(token, { secretKey: process.env.CUSTOMER_CLERK_SECRET_KEY })
    if (customerPayload.sub) {
      const customer = await prisma.customer.findUnique({ where: { clerk_user_id: customerPayload.sub } })
      return { customerId: customer?.id ?? null, driverClerkUserId: null }
    }
  } catch {
    // not a customer token — fall through to try driver
  }

  try {
    const driverPayload = await verifyToken(token, { secretKey: process.env.DRIVER_CLERK_SECRET_KEY })
    if (driverPayload.sub) {
      return { customerId: null, driverClerkUserId: driverPayload.sub }
    }
  } catch {
    // not a driver token either
  }

  return { customerId: null, driverClerkUserId: null }
}
```

Add the missing import at the top of the file:

```typescript
import { verifyToken } from "@clerk/backend"
```

- [ ] **Step 2: Branch the GET handler**

In `apps/api/app/v1/public/support/route.ts`, replace the `GET` function:

```typescript
export async function GET(req: Request) {
  const limited = await checkRateLimit(req, "support-list", { limit: 20, windowSeconds: 60 })
  if (limited) return limited

  const token = getBearerToken(req)
  if (!token) return jsonError("Unauthorized", 401)

  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")?.trim()

  if (!email) {
    // No email param: this is the new account-based path.
    const { customerId, driverClerkUserId } = await resolveSupportAuthorFromBearer(token)
    if (!customerId && !driverClerkUserId) return jsonError("Unauthorized", 401)

    const cases = await prisma.supportCase.findMany({
      where: customerId ? { customer_id: customerId } : { driver_clerk_user_id: driverClerkUserId! },
      orderBy: { created_at: "desc" },
      take: 50,
    })
    return NextResponse.json({ items: cases.map(toPublicCase) })
  }

  // Legacy path: email-level identity token, gated by the same
  // mintIdentityTokenIfAbsent-issued token as before.
  const verified = await verifyIdentityToken(email, token)
  if (!verified) return jsonError("Unauthorized", 401)

  const cases = await prisma.supportCase.findMany({
    where: { contact_email: email },
    orderBy: { created_at: "desc" },
    take: 50,
  })

  return NextResponse.json({ items: cases.map(toPublicCase) })
}
```

Update the import line to add `resolveSupportAuthorFromBearer`:

```typescript
import { getBearerToken, mintIdentityTokenIfAbsent, resolveSupportAuthor, resolveSupportAuthorFromBearer, toPublicCase, verifyIdentityToken } from "@/lib/support"
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter api typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual verification**

```bash
curl -s "http://localhost:3003/v1/public/support" -H "Authorization: Bearer <customer Clerk token>"
```

Expected: `{"items":[...]}` containing cases created under that account in Task 17 Step 4, with no `?email=` needed. Confirm the pre-existing `?email=...` + identity-token flow (from `apps/customer-web/lib/support-client.ts`'s `listMySupportCases`) still works unmodified.

- [ ] **Step 5: Commit**

```bash
git add apps/api/lib/support.ts apps/api/app/v1/public/support/route.ts
git commit -m "feat(api): support account-based 'my cases' lookup alongside the email/token fallback"
```

---

### Task 19: Customer-web support form/list work when signed in

**Files:**
- Modify: `apps/customer-web/lib/support-client.ts`
- Modify: `apps/customer-web/components/support/new-support-request-form.tsx`
- Modify: `apps/customer-web/app/(shell)/settings/support/support-client.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `@clerk/nextjs` (already used elsewhere in customer-web, e.g. `customer-session.ts`).
- Produces: `createSupportCase` gains an optional bearer token param; `listMySupportCases` gains an authenticated variant.

Today `handleSubmit` in `new-support-request-form.tsx` early-returns when `session.status !== "anonymous"` — meaning **signed-in customers cannot submit a support request at all** right now. `SupportClient`'s cases query is similarly `enabled: hasIdentity` where `hasIdentity` is only ever true for anonymous sessions. This task fixes both.

- [ ] **Step 1: Add an authenticated path to `support-client.ts`**

In `apps/customer-web/lib/support-client.ts`, update `createSupportCase` and `listMySupportCases`:

```typescript
export async function createSupportCase(
  input: {
    contact_name: string
    contact_email: string
    contact_phone?: string
    anonymous_device_id: string
    category: string
    subject: string
    message: string
  },
  token?: string | null,
): Promise<SupportCase & { accessToken: string }> {
  const res = await publicApiFetch<{
    data: SupportCase & { accessToken: string; identityToken?: string }
  }>("/support", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: JSON.stringify({ ...input, channel: "customer-web" }),
  })
  if (!res.ok) throw new Error(res.message)

  saveCaseToken(res.data.data.id, res.data.data.accessToken)
  saveIdentity({
    name: input.contact_name,
    email: input.contact_email,
    token: res.data.data.identityToken,
  })

  return res.data.data
}
```

```typescript
export async function listMySupportCasesForAccount(token: string): Promise<SupportCase[]> {
  const res = await publicApiFetch<{ items: SupportCase[] }>("/support", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  return res.data.items
}
```

(Verify `publicApiFetch`'s signature accepts a `headers` option the same way it already accepts `body`/`method` — `grep -n "export async function publicApiFetch" packages/ops-api-client/src/index.ts` — adjust the call shape if it differs.)

- [ ] **Step 2: Fix the form to work when signed in**

In `apps/customer-web/components/support/new-support-request-form.tsx`:

```typescript
import { useAuth, useUser } from "@clerk/nextjs"
```

```typescript
export function NewSupportRequestForm({
  onCreated,
}: {
  onCreated: (caseId: number) => void
}) {
  const session = useCustomerSession()
  const { getToken } = useAuth()
  const { user } = useUser()
  const identity = getStoredIdentity()

  const [name, setName] = useState(identity?.name ?? user?.fullName ?? "")
  const [email, setEmail] = useState(
    identity?.email ?? user?.primaryEmailAddress?.emailAddress ?? "",
  )
```

Replace `handleSubmit`'s guard and device-id source:

```typescript
  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting || session.status === "loading") return
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      toast.error("Fill in your name, email, subject, and message.")
      return
    }

    setSubmitting(true)
    try {
      const token = session.status === "authenticated" ? await getToken() : null
      const created = await createSupportCase(
        {
          contact_name: name.trim(),
          contact_email: email.trim(),
          anonymous_device_id: session.deviceId,
          category,
          subject: subject.trim(),
          message: message.trim(),
        },
        token,
      )
      toast.success(`Request sent — case #${created.id}`)
      onCreated(created.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send your request.")
    } finally {
      setSubmitting(false)
    }
  }
```

`session.deviceId` is present on both `"anonymous"` and `"authenticated"` variants of `CustomerSession` (see `apps/customer-web/lib/auth/customer-session.ts`), so this compiles unchanged.

- [ ] **Step 3: Fix the case list to load for signed-in users**

In `apps/customer-web/app/(shell)/settings/support/support-client.tsx`:

```typescript
import { useAuth } from "@clerk/nextjs"
import { getStoredIdentity, listMySupportCases, listMySupportCasesForAccount } from "@/lib/support-client"
```

```typescript
export function SupportClient() {
  const router = useRouter()
  const session = useCustomerSession()
  const { getToken } = useAuth()
  const [newRequestOpen, setNewRequestOpen] = useState(false)

  const hasIdentity = useMemo(
    () => session.status === "anonymous" && Boolean(getStoredIdentity()),
    [session.status],
  )
  const isAuthenticated = session.status === "authenticated"

  const casesQuery = useQuery({
    queryKey: isAuthenticated ? ["customer-support-cases", "account"] : ["customer-support-cases"],
    queryFn: async () => {
      if (isAuthenticated) {
        const token = await getToken()
        return token ? listMySupportCasesForAccount(token) : []
      }
      return listMySupportCases()
    },
    enabled: hasIdentity || isAuthenticated,
  })
  const cases = casesQuery.data ?? []
  const loadingCases =
    session.status === "loading" || ((hasIdentity || isAuthenticated) && casesQuery.isLoading)
```

The rest of the component (rendering) is unchanged since it only reads `cases`/`loadingCases`.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter customer-web typecheck`
Expected: exits 0.

- [ ] **Step 5: Manual verification**

Run `pnpm --filter customer-web dev`, sign in, go to Settings → Support, submit a new request — confirm it succeeds (it currently silently no-ops for signed-in users) and appears in the list without ever touching `localStorage`'s identity token. Sign out and confirm the pre-existing anonymous flow still works unchanged.

- [ ] **Step 6: Commit**

```bash
git add apps/customer-web/lib/support-client.ts apps/customer-web/components/support/new-support-request-form.tsx \
        apps/customer-web/app/\(shell\)/settings/support/support-client.tsx
git commit -m "fix(customer-web): support requests and 'my cases' work for signed-in accounts"
```

---

### Task 20: Customer-mobile support form/list work when signed in

**Files:**
- Modify: `apps/customer-mobile/lib/support.ts`
- Modify: `apps/customer-mobile/app/(tabs)/settings/support/new.tsx`

**Interfaces:**
- Mirrors Task 19 for the native app. `apps/customer-mobile/app/(tabs)/settings/support.tsx` needs no change (confirmed in exploration — it only calls `listMySupportCases()`, which changes shape internally, not by signature).

- [ ] **Step 1: Add an authenticated path to `lib/support.ts`**

In `apps/customer-mobile/lib/support.ts`, update `createSupportCase` and `listMySupportCases`:

```typescript
export async function createSupportCase(
  input: {
    contact_name: string
    contact_email: string
    contact_phone?: string
    anonymous_device_id: string
    category: string
    subject: string
    message: string
  },
  token?: string | null,
): Promise<SupportCase & { accessToken: string }> {
  const res = await postJson<{
    success: true
    data: SupportCase & { accessToken: string; identityToken?: string }
  }>(
    "/v1/public/support",
    { ...input, channel: "customer-mobile" },
    token ? { Authorization: `Bearer ${token}` } : undefined,
  )

  await saveCaseToken(res.data.id, res.data.accessToken)
  await saveIdentity({
    name: input.contact_name,
    email: input.contact_email,
    token: res.data.identityToken,
  })

  return res.data
}
```

```typescript
export async function listMySupportCases(token?: string | null): Promise<SupportCase[]> {
  if (token) {
    const res = await getJson<{ items: SupportCase[] }>("/v1/public/support", {
      Authorization: `Bearer ${token}`,
    })
    return res.items
  }

  const identity = await getStoredIdentity()
  if (!identity?.token) return []

  const res = await getJson<{ items: SupportCase[] }>(
    `/v1/public/support?email=${encodeURIComponent(identity.email)}`,
    { Authorization: `Bearer ${identity.token}` },
  )
  return res.items
}
```

- [ ] **Step 2: Fix the new-request screen**

In `apps/customer-mobile/app/(tabs)/settings/support/new.tsx`:

```typescript
import { useAuth, useUser } from "@clerk/clerk-expo"
```

```typescript
export default function NewSupportRequestScreen() {
  const router = useRouter()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const session = useCustomerSession()
  const { getToken } = useAuth()
  const { user } = useUser()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
```

Update the hydration effect to also prefer the Clerk profile once loaded:

```typescript
  useEffect(() => {
    void getStoredIdentity().then((identity) => {
      if (!identity) return
      setName((current) => current || identity.name)
      setEmail((current) => current || identity.email)
    })
  }, [])

  useEffect(() => {
    if (session.status !== "authenticated" || !user) return
    setName((current) => current || user.fullName || "")
    setEmail((current) => current || user.primaryEmailAddress?.emailAddress || "")
  }, [session.status, user])
```

Update `handleSubmit`:

```typescript
  async function handleSubmit() {
    if (submitting || session.status === "loading") return
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("Fill in your name, email, subject, and message.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const token = session.status === "authenticated" ? await getToken() : null
      const created = await createSupportCase(
        {
          contact_name: name.trim(),
          contact_email: email.trim(),
          anonymous_device_id: session.deviceId,
          category,
          subject: subject.trim(),
          message: message.trim(),
        },
        token,
      )
      router.replace(`/settings/support/${created.id}`)
    } catch {
      setError("Couldn't send your request. Check your connection and try again.")
      setSubmitting(false)
    }
  }
```

- [ ] **Step 3: Update `support.tsx`'s list query to pass a token when authenticated**

In `apps/customer-mobile/app/(tabs)/settings/support.tsx`:

```typescript
import { useAuth } from "@clerk/clerk-expo"
import { useCustomerSession } from "@/lib/auth/use-customer-session"
```

```typescript
export default function SupportSettingsScreen() {
  const router = useRouter()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const session = useCustomerSession()
  const { getToken } = useAuth()

  const casesQuery = useQuery({
    queryKey: ["customer-support-cases", session.status],
    queryFn: async () => {
      const token = session.status === "authenticated" ? await getToken() : null
      return listMySupportCases(token)
    },
    enabled: session.status !== "loading",
  })
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter customer-mobile typecheck`
Expected: exits 0.

- [ ] **Step 5: Manual verification**

Run the app with auth enabled, sign in, submit a support request, confirm it appears in "My requests" without needing the old identity-token flow.

- [ ] **Step 6: Commit**

```bash
git add apps/customer-mobile/lib/support.ts apps/customer-mobile/app/\(tabs\)/settings/support/new.tsx \
        apps/customer-mobile/app/\(tabs\)/settings/support.tsx
git commit -m "fix(customer-mobile): support requests and 'my cases' work for signed-in accounts"
```

---

### Task 21: Driver-mobile support form/list work when signed in

**Files:**
- Modify: `apps/driver-mobile/lib/support.ts`
- Modify: `apps/driver-mobile/app/(tabs)/support/index.tsx`

**Interfaces:**
- Same shape as Task 20, for the driver app. Note driver-mobile's screen combines the form and list in one file (`index.tsx`), unlike customer-mobile's split.

- [ ] **Step 1: Add an authenticated path to `lib/support.ts`**

In `apps/driver-mobile/lib/support.ts`, apply the identical change as Task 20 Step 1 (`createSupportCase` gains an optional `token` param sent as `Authorization`, `listMySupportCases` gains an optional `token` param that takes priority over the stored identity token), with `channel: "driver-mobile"`.

- [ ] **Step 2: Fix `index.tsx`**

In `apps/driver-mobile/app/(tabs)/support/index.tsx`:

```typescript
import { useAuth, useUser } from "@clerk/clerk-expo"
```

```typescript
export default function SupportScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const session = useDriverSession()
  const { getToken } = useAuth()
  const { user } = useUser()

  const queryClient = useQueryClient()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState("driver")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  const casesQuery = useQuery({
    queryKey: ["driver-support-cases", session.status],
    queryFn: async () => {
      if (session.status === "authenticated") {
        setEmail((current) => current || user?.primaryEmailAddress?.emailAddress || "")
        setName((current) => current || user?.fullName || "")
        const token = await getToken()
        return listMySupportCases(token)
      }

      const identity = await getStoredIdentity()
      if (!identity) return []
      setEmail((current) => current || identity.email)
      setName((current) => current || identity.name)
      return listMySupportCases()
    },
    enabled: session.status !== "loading",
  })
```

Update `handleSubmit`:

```typescript
  async function handleSubmit() {
    if (submitting) return
    if (session.status === "loading") return
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("Fill in your name, email, subject, and message.")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const token = session.status === "authenticated" ? await getToken() : null
      const created = await createSupportCase(
        {
          contact_name: name.trim(),
          contact_email: email.trim(),
          anonymous_device_id: session.deviceId,
          category,
          subject: subject.trim(),
          message: message.trim(),
        },
        token,
      )
      setSubject("")
      setMessage("")
      await queryClient.invalidateQueries({ queryKey: ["driver-support-cases"] })
      router.push(`/support/${created.id}`)
    } catch {
      setError("Couldn't send your request. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter driver-mobile typecheck`
Expected: exits 0.

- [ ] **Step 4: Manual verification**

Same as Task 20 Step 5, against `driver-mobile`.

- [ ] **Step 5: Commit**

```bash
git add apps/driver-mobile/lib/support.ts apps/driver-mobile/app/\(tabs\)/support/index.tsx
git commit -m "fix(driver-mobile): support requests and 'my cases' work for signed-in accounts"
```

---

## Self-Review Notes

- **Spec coverage:** Goal 1 (push tokens/support tied to account) → Tasks 1, 6–9, 17. Goal 2 (personalized merge-field) → Tasks 10–11, 16. Goal 3 (web targeting, ops chooses apps) → Tasks 1, 5, 11, 15. Goal 4 (only see what was sent while eligible) → Tasks 1, 11–15 (delivery-row model replaces the live unscoped query). Goal 5 (support auto-fill/auto-link) → Tasks 17–21. Char-limit question (spec's motivating context, not a goal) is informational only, no task needed — the existing 65/178 limits in `packages/ops-contracts/src/schemas.ts` are left untouched per the spec's Non-goals.
- **Placeholder scan:** no "TBD"/"add error handling"/"similar to Task N" — every task carries full replacement code or a precise diff.
- **Type consistency:** `AnnouncementDeliveryDto` (mobile, Task 14) and the web `*AnnouncementDto` types (Task 15) intentionally have separate names since they're consumed by different apps' clients, but share the same field set (`id, title, body, image_url, category, read_at, created_at`) — verified consistent across Tasks 12/13/14/15. `resolveFirstNames`'s `Map<string, string>` return is consumed identically in Task 11's `namesByAudience`.
- **Known open item flagged inline:** Task 14 Step 6 notes that "mark all read" (not per-item) is the mobile behavior this plan ships, matching `driver-web`'s existing bell — flagged for reviewer sign-off rather than assumed.

---

Plan complete and saved to `docs/superpowers/plans/2026-08-25-account-linked-notifications-support.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
