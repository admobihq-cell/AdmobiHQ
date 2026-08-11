# Admobi — Authentication, Organizations & Roles

How sign-in, sessions, organizations, and role/permission checks work across every app. Deploy-time Clerk instance config (allowed origins, keys per environment): [DEPLOYMENT.md § Clerk](./DEPLOYMENT.md#clerk). Repo layout: [ARCHITECTURE.md](./ARCHITECTURE.md). Actor-by-actor product plan: [ROADMAP.md](./ROADMAP.md).

---

## 1. The short version

Every app-facing surface now has real, wired Clerk sign-in — that's new as of the `fe5369d → 3c5202d → a600269` commit sequence (2026-08-11), which replaced the customer/driver auth scaffolding with working email-code + Google sign-in.

| App | Sign-in UI | Session gating | Backend API auth |
|---|---|---|---|
| `apps/ops` | ✅ live | ✅ live | ✅ live |
| `apps/ops-mobile` | ✅ live | ✅ live (native) | ✅ live |
| `apps/customer-web` | ✅ built | ✅ built, **flag-gated** | ❌ no protected API yet |
| `apps/customer-mobile` | ✅ built | ✅ built, **flag-gated** | ❌ no protected API yet |
| `apps/driver-web` | ✅ built | ✅ built, **flag-gated** | ❌ no protected API yet |
| `apps/driver-mobile` | ✅ built | ✅ built, **flag-gated** | ❌ no protected API yet |
| `apps/web` | — none — | — | — |

Two caveats worth internalizing before assuming "auth is done" for a given environment:

- **Customer and driver auth is feature-flagged** (`NEXT_PUBLIC_AUTH_ENABLED` / `EXPO_PUBLIC_AUTH_ENABLED`, §4). The flag is deliberately kept out of the shared Infisical sync, so whether it's live in any given deployment depends on that environment's own Vercel/EAS settings, not on anything in this repo.
- **No backend enforcement yet for customer/driver.** [apps/api/lib/auth.ts](../../apps/api/lib/auth.ts) only verifies the **ops** Clerk instance. Signing into customer-web or driver-web gets you a session and gates that app's own pages, but there is no `/v1/customer/*` or `/v1/driver/*` route for that token to call yet, and no `CustomerUser`/driver-role table in the database. That's [ROADMAP.md](./ROADMAP.md) §7 milestone 2, still open.

---

## 2. Three independent Clerk applications

No shared session, no satellite domains, no phone/SMS. A deliberate departure from the original "two instances, one shared by customer + driver" plan — splitting them removed a domain-primary/satellite conflict and all role-mismatch handling. Full per-environment config (allowed origins, key types): [DEPLOYMENT.md § Clerk](./DEPLOYMENT.md#clerk).

| Instance | Used by | Restriction | Sign-in methods |
|---|---|---|---|
| **Ops** (`app_3GALZRS50nwbrWeiFLZXxsgDIid`) | `apps/ops`, `apps/ops-mobile`, verified server-side by `apps/api` | `@admobihq.com` email only | Email code (no password, no Google) |
| **Customer** | `apps/customer-web`, `apps/customer-mobile` | none | Email code + Google OAuth |
| **Driver** | `apps/driver-web`, `apps/driver-mobile` | none | Email code + Google OAuth |

`apps/web` (marketing site) has no Clerk integration at all — the commented-out `CLERK_*` lines in its `.env.example` are a leftover reference, not active code.

---

## 3. Sign-in flow

All three instances use the **same hand-rolled pattern** — no prebuilt `<SignIn>`/`<SignUp>` widgets. Every app drives Clerk directly via `useSignIn()` / `useSignUp()`:

```
signIn.create({ identifier: email })
  → signIn.emailCode.sendCode({})
  → signIn.emailCode.verifyCode({ code })
  → signIn.finalize({ navigate })
```

Google is a separate path on the same hook: `signIn.sso({ strategy: "oauth_google", redirectCallbackUrl, redirectUrl })` — see [apps/customer-web/components/auth/advertiser-sign-in.tsx](../../apps/customer-web/components/auth/advertiser-sign-in.tsx) and [apps/driver-web/components/auth/driver-sign-in.tsx](../../apps/driver-web/components/auth/driver-sign-in.tsx).

### Ops (`apps/ops`)

- [app/sign-in/[[...sign-in]]/page.tsx](../../apps/ops/app/sign-in/%5B%5B...sign-in%5D%5D/page.tsx) and the sign-up equivalent call `getOpsAccess()` server-side first — already-authorized users are redirected straight to `/home`; non-`@admobihq.com` emails get `<OpsAccessDenied>` instead of a form.
- Domain check happens **client-side too**, before the form will even submit (`isAdmobiEmail(email)` in [admobi-otp-sign-in-form.tsx](../../apps/ops/components/admobi-otp-sign-in-form.tsx)) — belt-and-suspenders on top of the server-side gate in §5.
- Route protection: [apps/ops/proxy.ts](../../apps/ops/proxy.ts) (renamed from `middleware.ts` on purpose) is just `clerkMiddleware()` with no route logic — actual authorization happens per-route via `requireOpsUser()` and in [app/(dashboard)/layout.tsx](../../apps/ops/app/(dashboard)/layout.tsx), which calls `requireOpsUser()` and redirects to `/` on failure.

### Customer (`apps/customer-web`, `apps/customer-mobile`) and Driver (`apps/driver-web`, `apps/driver-mobile`)

- Customer web has an extra step: `/auth/login` renders `<AuthRolePicker>` (advertiser vs. "I'm a driver," pure navigation — [auth-role-picker.tsx](../../apps/customer-web/components/auth/auth-role-picker.tsx)) before landing on `/auth/login/advertiser/[[...rest]]`. Driver web skips the picker and goes straight to `<DriverSignIn>`.
- Mobile mirrors web 1:1: dedicated `app/sign-in.tsx` / `app/sign-up.tsx` screens, Google SSO closed out via `WebBrowser.maybeCompleteAuthSession()`, and an `<AuthGate>` component that redirects unauthenticated users to `/sign-in` and signed-in users away from the auth screens to `/(tabs)`.
- Route protection on web is custom middleware, not the SDK default, because these apps' Clerk keys aren't the env-var names `clerkMiddleware()` expects by default (see §4):

  ```ts
  // apps/customer-web/middleware.ts
  cachedMiddleware = clerkMiddleware(
    async (auth, request) => {
      if (isPublicRoute(request.nextUrl.pathname)) return
      const { userId } = await auth()
      if (!userId) return NextResponse.redirect(new URL("/auth/login", request.url))
    },
    {
      publishableKey: process.env.NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CUSTOMER_CLERK_SECRET_KEY,
    },
  )
  ```

  This protects **every route except** `/auth/*` and `/api/health*` — unlike ops (whose `/` is a stub and the real dashboard lives at `/home`), `/` in customer-web and driver-web **is** the protected dashboard.

### Ops-mobile — one exception to the flag-gated pattern

[apps/ops-mobile/app/_layout.tsx](../../apps/ops-mobile/app/_layout.tsx) mounts `<ClerkProvider>` **unconditionally** (ops is fully live, no flag). Its `AuthGate` branches by email via `isOpsStaffEmail()` into a staff `(ops)` route group or a non-staff `(customer)` group — a dormant surface, separate from the dedicated `apps/customer-mobile` app.

---

## 4. Secrets, env vars, and the feature flag

All three apps' Clerk secrets live in the **same flat Infisical project/environment** — no per-app folder isolation. Customer/driver env var names are deliberately prefixed so they never collide with ops's bare names:

| App | Env vars |
|---|---|
| `apps/api` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_ORG_ID` |
| `apps/ops` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_ORG_ID` |
| `apps/ops-mobile` | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `apps/customer-web` | `NEXT_PUBLIC_AUTH_ENABLED`, `NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY`, `CUSTOMER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY` |
| `apps/customer-mobile` | `EXPO_PUBLIC_AUTH_ENABLED`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `apps/driver-web` | `NEXT_PUBLIC_AUTH_ENABLED`, `NEXT_PUBLIC_DRIVER_CLERK_PUBLISHABLE_KEY`, `DRIVER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY` |
| `apps/driver-mobile` | `EXPO_PUBLIC_AUTH_ENABLED`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |

**Never reuse the unprefixed `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` names for a non-ops app** — doing so overwrites ops's working keys for every project pulling that Infisical environment afterward. `CLERK_ENCRYPTION_KEY` is required specifically because customer-web/driver-web pass explicit `publishableKey`/`secretKey` overrides into `clerkMiddleware()` (Clerk's "dynamic keys" mode) instead of relying on its default env var names.

### The `AUTH_ENABLED` flag

```ts
// apps/customer-web/lib/auth/is-auth-enabled.ts
export function isAuthEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" &&
    Boolean(process.env.NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY)
  )
}
```

Mirrored in `apps/driver-web`, `apps/customer-mobile`, `apps/driver-mobile`. When the flag is off (the default — unset), `ClerkProvider` never mounts and the app renders `<AuthDisabledMessage>` instead of a broken half-authed shell. **This flag is intentionally kept out of Infisical** — it's local-only per environment, so a missing key can never crash the app. Practical effect: whether customer/driver auth is actually reachable in staging or production depends on that Vercel/EAS project's own env settings, not on anything synced from this repo.

Ops and ops-mobile have no such flag — they're always on.

---

## 5. Server-side verification, organizations, and roles

### Token verification — ops instance only

[apps/api/lib/auth.ts](../../apps/api/lib/auth.ts) resolves a request's identity two ways, in order:

1. **Cookie session** (`auth()` from `@clerk/nextjs/server`) — same-origin calls from `apps/ops`.
2. **Bearer JWT** (`Authorization: Bearer <token>`) — cross-origin calls from `apps/ops-mobile`, verified with `verifyToken(bearer, { secretKey: process.env.CLERK_SECRET_KEY })`.

There is **no equivalent path for customer or driver tokens** — `apps/api` has zero references to `CUSTOMER_CLERK*`/`DRIVER_CLERK*`, and no `/v1/customer/*` or `/v1/driver/*` routes exist yet. `apps/ops/lib/auth.ts` is a near-duplicate of the API version, minus the Bearer-token branch (ops is same-origin) and plus `resolveOpsOrgName()` for display in the ops shell footer.

Edge middleware ([apps/api/middleware.ts](../../apps/api/middleware.ts)) deliberately does **not** call `auth.protect()` — Edge rejects valid Expo Bearer tokens, so every protected route enforces auth itself via `requireOpsUser()` / `requireOpsAdmin()` / `requireOpsPermission()`.

### Organizations

Clerk Organizations exist as a **binary access gate for ops**, not multi-tenant org switching — there's no `OrganizationSwitcher` or `useOrganization` anywhere in the repo. One fixed org per Clerk environment, identified by `CLERK_ORG_ID` (a different org id per dev/staging/prod). Every ops user must be a member of that org to get past `getOpsAccess()`; access is denied at two independent gates:

1. Email isn't `@admobihq.com` → `forbidden`.
2. Email passes, but no membership in the `CLERK_ORG_ID` org → `forbidden`.

Customer and driver instances have **no** organization concept — every signed-in user there is just an individual account. `ROADMAP.md`'s planned `CustomerUser` model (linking a customer Clerk user to a `Customer` billing entity with `role: owner | member`) does not exist in the schema yet; it's still a planning note.

### Roles — two layers, ops only

**Layer 1 — Clerk org role** (`org:admin` / `org:member`, mapped to `"admin" | "member"`): the coarse tier. `admin` bypasses all permission checks and gets every `OpsPermission`.

**Layer 2 — database-backed `OpsRole`** (Prisma, [apps/web/prisma/schema.prisma](../../apps/web/prisma/schema.prisma)): fine-grained permission subsets for `org:member` users, independent of anything Clerk knows about.

```prisma
model OpsRole {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  permissions String[] @default([])
  assignments OpsRoleAssignment[]
  @@map("ops_roles")
}

model OpsRoleAssignment {
  clerk_user_id String  @id
  role_id       Int
  role          OpsRole @relation(fields: [role_id], references: [id])
  @@map("ops_role_assignments")
}
```

One `OpsRoleAssignment` per `org:member`; unassigned members fall back to the seeded `"Member"` role. `org:admin` never needs a row — it's exempt entirely.

The closed set of assignable permissions ([packages/ops-contracts/src/enums.ts](../../packages/ops-contracts/src/enums.ts)):

```
leads · fleet · drivers · waitlist · media_kit · announcements ·
support · finances · content · flags · activity
```

`resolveOpsPermissions()` in `apps/api/lib/auth.ts` computes the effective set per request (all of them for `admin`, the assigned `OpsRole.permissions` for `member`) and caches it 60s per user. `getOpsAccess()` returns a discriminated union — `unauthenticated | forbidden | authorized` — that every route handler narrows before doing anything else.

### Managing organizations and roles day to day

All of this is exposed in the ops console itself, under **Team** ([apps/ops/app/(dashboard)/team](<../../apps/ops/app/(dashboard)/team>)) — no direct Clerk dashboard work needed for routine changes:

- **Inviting someone** (`POST /v1/team`, [apps/api/app/v1/team/route.ts](../../apps/api/app/v1/team/route.ts)) — admin-only. Creates a Clerk `organizationInvitation` for `org:admin` or `org:member`. If the invitee already has a Clerk account, their `OpsRole` assignment is pre-created immediately so it's ready the moment they accept; brand-new signups land on the default `"Member"` role until reassigned post-acceptance (there's no Clerk user id to attach an assignment to before then).
- **Changing someone's tier/role** (`PATCH /v1/team/[userId]`, [apps/api/app/v1/team/[userId]/route.ts](<../../apps/api/app/v1/team/%5BuserId%5D/route.ts>)) — updates the Clerk org membership role and upserts (or clears) the `OpsRoleAssignment` to match. Refuses to demote or remove the **last remaining admin**, to avoid locking the team out.
- **Creating/editing/deleting custom roles** (`/v1/roles`, `/v1/roles/[roleId]`) — admin-only CRUD over `OpsRole`. Deleting a role that still has members assigned is blocked (`400`, "Reassign them first") rather than silently orphaning assignments.
- Every one of these actions writes an audit event (`ops_role` / `team_member` / `team_invitation` entity types) through the same `auditFromOpsUser()` path every other ops mutation uses — nothing here is exempt from the audit trail.

The `Driver` CRM model ([schema.prisma](../../apps/web/prisma/schema.prisma)) predates the new driver-web/driver-mobile apps and has **no `clerk_user_id` field** — there is currently no database link between a signed-in driver-app account and a `Driver` CRM record. `Customer.clerk_user_id` exists but is nullable and unpopulated by any route today.

---

## 6. What's left

Tracked in [ROADMAP.md](./ROADMAP.md) §7, milestone 2 ("Customer auth"):

- Multi-issuer JWT verification in `apps/api/lib/auth.ts` (customer + driver instances, alongside the existing ops path).
- `/v1/customer/*` and `/v1/driver/*` protected route trees.
- A `CustomerUser` (or equivalent) table linking customer Clerk users to a `Customer` billing entity with an owner/member role — the customer-side analogue of `OpsRoleAssignment`.
- A `clerk_user_id` on `Driver` (or a new link table) so a signed-in driver-app account resolves to a CRM `Driver` row.
- A decision on whether `NEXT_PUBLIC_AUTH_ENABLED` / `EXPO_PUBLIC_AUTH_ENABLED` should move into Infisical once customer/driver auth is meant to be live by default, rather than toggled per-environment by hand.
