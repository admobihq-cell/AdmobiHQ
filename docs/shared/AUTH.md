# Admobi — Authentication, Organizations & Roles

How sign-in, sessions, organizations, and role/permission checks work across every app. Deploy-time Clerk instance config (allowed origins, keys per environment): [DEPLOYMENT.md § Clerk](./DEPLOYMENT.md#clerk). Repo layout: [ARCHITECTURE.md](./ARCHITECTURE.md). Actor-by-actor product plan: [ROADMAP.md](./ROADMAP.md).

---

## 1. The short version

Every app-facing surface has wired Clerk sign-in. Customer and driver sessions are **flag-gated**; ops is always on. The API verifies all three Clerk instances on the routes that belong to each actor.

| App | Sign-in UI | Session gating | Backend API auth |
|---|---|---|---|
| `apps/ops` | ✅ live | ✅ live | ✅ live (ops JWT) |
| `apps/ops-mobile` | ✅ live | ✅ live (native) | ✅ live (ops JWT) |
| `apps/customer-web` | ✅ built | ✅ built, **flag-gated** | ✅ `/v1/customer/*` (announcements); support can use a customer JWT |
| `apps/customer-mobile` | ✅ built | ✅ built, **flag-gated** | ✅ same customer routes + push tokens |
| `apps/driver-web` | ✅ built | ✅ built, **flag-gated** | ✅ `/v1/driver/*` (profile, documents, notifications, announcements) |
| `apps/driver-mobile` | ✅ built | ✅ built, **flag-gated** | ✅ same driver routes + push tokens |
| `apps/web` | — none — | — | — |

Two caveats worth internalizing before assuming "auth is done" for a given environment:

- **Customer and driver auth is feature-flagged** (`NEXT_PUBLIC_AUTH_ENABLED` / `EXPO_PUBLIC_AUTH_ENABLED`, §4). The flag is deliberately kept out of the shared Infisical sync, so whether it's live in any given deployment depends on that environment's own Vercel/EAS settings, not on anything in this repo. Ops and ops-mobile have no such flag — they are always on.
- **Protected customer/driver APIs exist, but the product role model is still incomplete.** [apps/api/lib/auth.ts](../../apps/api/lib/auth.ts) still verifies only the **ops** instance. Customer tokens are verified in [apps/api/lib/customer-auth.ts](../../apps/api/lib/customer-auth.ts); driver tokens in [apps/api/lib/driver-auth.ts](../../apps/api/lib/driver-auth.ts). There is still no `CustomerUser` team table, and the CRM `Driver` model has no `clerk_user_id` (driver-app identity lives on `DriverProfile` instead). Campaign booking APIs are not backend-backed yet. That's [ROADMAP.md](./ROADMAP.md) §7 milestone 2, still partly open.

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

### Sign-up: the Clerk instance must not require username or password

Our sign-up forms are passwordless — an email one-time code, or Google. Neither can ever
supply a **username** or a **password**. If the Clerk instance marks either as *required*
under **User & authentication → Email, phone, username** / **Authentication strategies**,
every sign-up ends at `status: "missing_requirements"` instead of `"complete"`, and:

- the email-code path falls through to "Sign-up could not be completed. Try again." — a
  permanent dead end, no matter how many times the user retries;
- the Google path has nowhere to continue, so `<AuthenticateWithRedirectCallback>` falls back
  to `display_config.sign_up_url` and dumps the user on Clerk's **Account Portal** at
  `https://accounts.<domain>/sign-up/continue` — a Clerk-branded page outside our app. A slow
  or ad-blocked Account Portal shows as a blank `/auth/sso-callback/...` page instead.

Check an instance's real requirements without the dashboard — this endpoint is public:

```sh
curl -s "https://clerk.<app-domain>/v1/environment?_clerk_js_version=5.99.0" -H "Origin: https://<app-domain>" | jq '.user_settings.attributes | map_values(select(.enabled) | .required)'
```

Every attribute that reports `required: true` must be either supplied by the form or turned
off in the dashboard. `first_name`/`last_name` are safe to require *only* for Google (it
supplies them); requiring them breaks the email-code path unless the form collects them.

The three hand-rolled forms log `status`, `missingFields` and `unverifiedFields` to the
console on the not-complete branch, so this is diagnosable from the browser next time.

### Sign-up: bot protection needs a `#clerk-captcha` element

Clerk runs Cloudflare Turnstile on **sign-up** (never sign-in), and in a hand-rolled flow it
mounts that widget into a `<div id="clerk-captcha" />` you provide. If the element is absent,
`clerk-js` warns and falls back to an invisible widget appended to `document.body` with
`display: none` — so any visitor Turnstile decides to challenge interactively can never solve
it, and the challenge dies with Turnstile error `600010`.

This breaks the Google button too, not just the email code: both `signUp.create()` and
`signUp.sso()` await `getCaptchaToken()` as their first step, so the click registers, the
promise hangs through Turnstile's retries, and nothing visible happens.

Every hand-rolled sign-up form must render `<div id="clerk-captcha" />` in the same step as
its submit and Google buttons — see
[advertiser-sign-up.tsx](../../apps/customer-web/components/auth/advertiser-sign-up.tsx),
[driver-sign-up.tsx](../../apps/driver-web/components/auth/driver-sign-up.tsx), and
[admobi-otp-sign-up-form.tsx](../../apps/ops/components/admobi-otp-sign-up-form.tsx).

### Advertiser sign-up collects a company name

`<AdvertiserSignUp>` asks for a company or organization name and passes it as
`unsafeMetadata: { companyName }` to both `signUp.create()` and `signUp.sso()`. Clerk copies
`unsafeMetadata` onto the created user once the sign-up completes, so the value survives the
Google OAuth round-trip with no extra storage of our own — which matters because the ops
Users list reads Clerk, not Postgres (`listPlatformUsers` in
[apps/api/lib/platform-users.ts](../../apps/api/lib/platform-users.ts)).

The field is **optional at sign-up**, and deliberately so. Google's consent screen has no
place to ask for a company, and Clerk owns the OAuth step, so gating "Continue with Google"
on the field only produced a permanently dead button with nothing explaining why. Instead
[`<CompanyNamePrompt>`](../../apps/customer-web/components/shell/company-name-prompt.tsx),
mounted in the app shell, opens a non-dismissible dialog on first load for any signed-in user
whose `unsafeMetadata.companyName` is empty, and writes it with `user.update()` —
`unsafeMetadata` is client-writable, so this needs no API route. Whichever path skipped the
field, the value still gets collected exactly once.

That dialog is modal, so it has to win the first-load race against the product tour, which
auto-opens for anyone with no completion record. Left alone the two fired on the same render:
the dialog took focus while its overlay covered the very sidebar items the tour was pointing
at. `<AppShell>` now owns the ordering: it passes an `autoStartReady` flag to
[`<TourProvider>`](../../packages/ui/src/components/tour-provider.tsx), and only raises it
once `readCompanyName(user?.unsafeMetadata)` is non-empty **and** a short settle has elapsed.
The settle is not decoration — the dialog fades out over `duration-100`, so handing the tour
its go-ahead in the same commit opens it underneath a scrim that is still on screen.

`autoStartReady` defaults to `true`, so driver-web and ops — neither of which prompts for
anything — are unchanged. The gate lives in the shell rather than in `<TourProvider>` because
the provider is shared: it knows about "something is holding me back", not about companies or
dialog timings.

Three client call sites write that key, so it lives in one place —
[lib/company-name.ts](../../apps/customer-web/lib/company-name.ts) exports `readCompanyName`
and `withCompanyName` (which **merges**, since `user.update()` replaces the whole metadata
bag). The server-side reader is `readCompanyName` in
[apps/api/lib/customer-clerk.ts](../../apps/api/lib/customer-clerk.ts).

### Settings → Account is the place to finish an account

[`<AccountSettingsView>`](../../apps/customer-web/components/settings/account-settings-view.tsx)
edits first name, last name, **username**, and **company** in one `user.update()` call, and
offers **account deletion** behind a confirm dialog. Details worth keeping:

- The username is only sent when non-empty — Clerk reads `""` as "clear it", so an untouched
  field would otherwise wipe an existing handle.
- Company is required to save. It is the one field `<CompanyNamePrompt>` re-demands on next
  load, so letting settings blank it would trap the user in that dialog.
- Delete is gated on `user.deleteSelfEnabled` (a Clerk instance setting), and on success does
  a **hard** `window.location.assign("/auth/login")` — the Clerk client still holds a session
  for a user that no longer exists, and only a full reload clears it.
- Clerk rejects a taken username with a structured `ClerkAPIError` list rather than an
  `Error`; `clerkErrorMessage()` unwraps it so a failed save says why instead of silently
  doing nothing.

Ops reads it back in two places, both resolving it from Clerk at read time rather than
copying it into Postgres: the **Users** page (`toPlatformUserDto` adds a `company` column,
rendered for customers only — drivers never set one) and the **campaign review** screen
(`getCustomerCompanyName` fills `CampaignDto.company_name` in both `GET /v1/campaigns/[id]`
and the `PATCH .../review` response, so the company survives a decision without the row
blanking out). Both lookups are best-effort: a Clerk outage shows "—", never a 500.

Driver sign-up deliberately does not ask for this; drivers sign up as individuals.

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
| `apps/api` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_ORG_ID`, `CUSTOMER_CLERK_SECRET_KEY`, `DRIVER_CLERK_SECRET_KEY` |
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

### Token verification — three issuers

The API verifies Clerk JWTs against the instance that issued them. There is no single "whichever instance" verifier:

| Module | Instance | Used by |
|---|---|---|
| [apps/api/lib/auth.ts](../../apps/api/lib/auth.ts) | Ops (`CLERK_SECRET_KEY`) | `/v1/*` admin routes via `requireOpsAccess()` / `requireOpsUser()` |
| [apps/api/lib/customer-auth.ts](../../apps/api/lib/customer-auth.ts) | Customer (`CUSTOMER_CLERK_SECRET_KEY`) | `/v1/customer/*` via `requireCustomerAccess()` |
| [apps/api/lib/driver-auth.ts](../../apps/api/lib/driver-auth.ts) | Driver (`DRIVER_CLERK_SECRET_KEY`) | `/v1/driver/*` and driver-application self-service via `requireDriverAccess()` |

Ops `auth.ts` resolves identity two ways, in order:

1. **Cookie session** (`auth()` from `@clerk/nextjs/server`) — same-origin calls from `apps/ops`.
2. **Bearer JWT** (`Authorization: Bearer <token>`) — cross-origin calls from `apps/ops-mobile`, verified with `verifyToken(bearer, { secretKey: process.env.CLERK_SECRET_KEY })`.

Customer and driver modules verify **Bearer tokens only** (those apps are always cross-origin). Helpers live in [apps/api/lib/api-utils.ts](../../apps/api/lib/api-utils.ts). [apps/api/lib/support.ts](../../apps/api/lib/support.ts) tries the customer secret, then the driver secret, when a support identity token might be a Clerk JWT. `apps/ops/lib/auth.ts` is a near-duplicate of the ops API version, minus the Bearer-token branch (ops is same-origin) and plus `resolveOpsOrgName()` for display in the ops shell footer.

Edge middleware ([apps/api/middleware.ts](../../apps/api/middleware.ts)) deliberately does **not** call `auth.protect()` — Edge rejects valid Expo Bearer tokens, so every protected route enforces auth itself via `requireOpsUser()` / `requireOpsAdmin()` / `requireOpsPermission()` / `requireCustomerAccess()` / `requireDriverAccess()`.

### Organizations

Clerk Organizations exist as a **binary access gate for ops**, not multi-tenant org switching — there's no `OrganizationSwitcher` or `useOrganization` anywhere in the repo. One fixed org per Clerk environment, identified by `CLERK_ORG_ID` (a different org id per dev/staging/prod). Every ops user must be a member of that org to get past `getOpsAccess()`; access is denied at two independent gates:

1. Email isn't `@admobihq.com` → `forbidden`.
2. Email passes, but no membership in the `CLERK_ORG_ID` org → `forbidden`.

Driver instances have **no** organization concept — every signed-in driver user there is just an individual account. Customer (advertiser) now does — see "Advertiser orgs and roles" below; it's Postgres-backed, not a Clerk Organization. `ROADMAP.md`'s planned `CustomerUser` model (linking a customer Clerk user to a `Customer` billing entity with `role: owner | member`) never shipped and is superseded by `AdvertiserOrg`/`AdvertiserMember` below. `Customer.clerk_user_id` is nullable and is not populated by any route today.

### Roles — two layers, ops

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
support · finances · content · flags · activity · driver_applications
```

`resolveOpsPermissions()` in `apps/api/lib/auth.ts` computes the effective set per request (all of them for `admin`, the assigned `OpsRole.permissions` for `member`) and caches it 60s per user. `getOpsAccess()` returns a discriminated union — `unauthenticated | forbidden | authorized` — that every route handler narrows before doing anything else.

### Advertiser orgs and roles

Customer-side tenancy, added by the advertiser-organizations plan ([spec](../superpowers/specs/2026-09-07-advertiser-organizations-design.md)). Deliberately **Postgres-only** — Clerk never learns organizations exist, and there's no Clerk Organization equivalent on the customer side. Tables: `AdvertiserOrg`, `AdvertiserMember`, `AdvertiserRole`, `AdvertiserInvitation` ([schema.prisma](../../apps/web/prisma/schema.prisma)).

There's no sign-up-time org creation — [apps/api/lib/customer-auth.ts](../../apps/api/lib/customer-auth.ts) bootstraps lazily: the first authenticated request from a `clerk_user_id` with no `AdvertiserMember` row creates the org (named from the Clerk `companyName` metadata, see "Advertiser sign-up collects a company name" above) and an admin membership, in one transaction. Concurrent first requests race safely onto the same org via the unique constraint on `clerk_user_id`.

Same two-layer shape as ops: `is_owner` bypasses every permission check (like `org:admin`); everyone else gets whatever their assigned `AdvertiserRole.permissions` grants, from the closed `AdvertiserPermission` set ([packages/ops-contracts/src/enums.ts](../../packages/ops-contracts/src/enums.ts)). Three starter roles (`Manager` / `Member` / `Viewer`) are seeded once, shared by every org (`org_id = null`), by [apps/web/scripts/seed-advertiser-roles.ts](../../apps/web/scripts/seed-advertiser-roles.ts). `getCustomerAccess()` returns `{ status: "authorized", userId, orgId, isOwner, permissions }` and caches it 60s per user, same pattern as `resolveOpsPermissions()`; `requireCustomerPermission()` mirrors `requireOpsPermission()`.

Campaigns are `org_id`-scoped (see [apps/api/lib/campaign-store.ts](../../apps/api/lib/campaign-store.ts)). Team management is live under `/v1/customer/org/**`: rename (`org:manage`), list/invite/remove members (`team:manage`), accept invites via identity-only auth (no lazy bootstrap, so the invitee joins the inviting org instead of getting a solo org), and role listing/editing. Admins can customize starter roles (clone-on-save per org) or create org-scoped roles via `GET/POST /v1/customer/org/roles` and `PATCH/DELETE /v1/customer/org/roles/[roleId]` — Settings → Team → Roles. Invite emails go through Resend; accept landing is `/invitations/[token]` on customer-web. Settings → Team on customer-web and customer-mobile. Organization name is edited there (and via `<CompanyNamePrompt>` when empty) — not via Clerk `unsafeMetadata`. Ops campaign review and the Users list read `AdvertiserOrg.name` via membership join, not Clerk. Org activity feed: `GET /v1/customer/org/activity` (`activity:read`) — allowlisted projection over `audit_events` (never raw `summary` / ops emails). Member removal is soft-delete (`removed_at`); re-invite reactivates the row. Campaign submit/review notifications fan out to every active member with `campaigns:read`. Sole admins cannot delete their Clerk account until they transfer admin or delete the organization. Support cases stamp `org_id`; members with `support:read_all` see all org cases. Ops directory: `GET /v1/advertiser-orgs` (+ `[id]`) gated on the `campaigns` permission — sidebar **Advertiser orgs** in ops web.

### Managing organizations and roles day to day

**Ops Team** ([apps/ops/app/(dashboard)/team](<../../apps/ops/app/(dashboard)/team>)) — unchanged, Clerk Organizations on the ops instance:

- **Inviting someone** (`POST /v1/team`, [apps/api/app/v1/team/route.ts](../../apps/api/app/v1/team/route.ts)) — admin-only. Creates a Clerk `organizationInvitation` for `org:admin` or `org:member`. If the invitee already has a Clerk account, their `OpsRole` assignment is pre-created immediately so it's ready the moment they accept; brand-new signups land on the default `"Member"` role until reassigned post-acceptance (there's no Clerk user id to attach an assignment to before then).
- **Changing someone's tier/role** (`PATCH /v1/team/[userId]`, [apps/api/app/v1/team/[userId]/route.ts](<../../apps/api/app/v1/team/%5BuserId%5D/route.ts>)) — updates the Clerk org membership role and upserts (or clears) the `OpsRoleAssignment` to match. Refuses to demote or remove the **last remaining admin**, to avoid locking the team out.
- **Creating/editing/deleting custom roles** (`/v1/roles`, `/v1/roles/[roleId]`) — admin-only CRUD over `OpsRole`. Deleting a role that still has members assigned is blocked (`400`, "Reassign them first") rather than silently orphaning assignments.
- Every one of these actions writes an audit event (`ops_role` / `team_member` / `team_invitation` entity types) through the same `auditFromOpsUser()` path every other ops mutation uses — nothing here is exempt from the audit trail.

The CRM `Driver` model ([schema.prisma](../../apps/web/prisma/schema.prisma)) is still the marketing/ops lead-capture table and has **no `clerk_user_id`**. Driver-app identity is `DriverProfile.clerk_user_id` (profile-setup + ops review). Those two rows are not joined today. `Customer.clerk_user_id` exists but is nullable and unpopulated by any route today.

---

## 6. What's left

Tracked in [ROADMAP.md](./ROADMAP.md) §7, milestone 2. Sign-in, session gating, and the first protected customer/driver route trees are shipped. Remaining:

- A `CustomerUser` (or equivalent) table linking customer Clerk users to a `Customer` billing entity with an owner/member role — the customer-side analogue of `OpsRoleAssignment`.
- A join from a signed-in driver-app account (`DriverProfile.clerk_user_id`) to the CRM `Driver` row (or a `clerk_user_id` on `Driver`).
- Campaign / zone / wallet APIs under `/v1/customer/*` (announcements and support are live; booking is still local demo data).
- Earnings / routes / payout APIs under `/v1/driver/*` (profile, documents, notifications, and announcements are live; earnings wait on telemetry).
- A decision on whether `NEXT_PUBLIC_AUTH_ENABLED` / `EXPO_PUBLIC_AUTH_ENABLED` should move into Infisical once customer/driver auth is meant to be live by default, rather than toggled per-environment by hand.
