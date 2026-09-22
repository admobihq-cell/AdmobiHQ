# Admobi — Authentication, Organizations & Roles

How sign-in, sessions, organizations, and role/permission checks work across every app. Deploy-time Clerk instance config (allowed origins, keys per environment): [DEPLOYMENT.md § Clerk](./DEPLOYMENT.md#clerk). **Staging hostnames, Preview env, and which Clerk Development keys to use:** [DEPLOYMENT.md § Staging environment](./DEPLOYMENT.md#staging-environment). Repo layout: [ARCHITECTURE.md](./ARCHITECTURE.md). Actor-by-actor product plan: [ROADMAP.md](./ROADMAP.md).

---

## 1. The short version

Every app-facing surface has wired Clerk sign-in. Customer, driver, and ops auth are **always on** (publishable/secret keys required). The API verifies all three Clerk instances on the routes that belong to each actor.

| App | Sign-in UI | Session gating | Backend API auth |
|---|---|---|---|
| `apps/ops` | ✅ live | ✅ live | ✅ live (ops JWT) |
| `apps/ops-mobile` | ✅ live | ✅ live (native) | ✅ live (ops JWT) |
| `apps/customer-web` | ✅ live | ✅ live | ✅ `/v1/customer/*` (announcements); support can use a customer JWT |
| `apps/customer-mobile` | ✅ live | ✅ live (native) | ✅ same customer routes + push tokens |
| `apps/driver-web` | ✅ live | ✅ live | ✅ `/v1/driver/*` (profile, documents, notifications, announcements) |
| `apps/driver-mobile` | ✅ live | ✅ live (native) | ✅ same driver routes + push tokens |
| `apps/web` | — none — | — | — |

One caveat worth internalizing before assuming "auth is done" for a given environment:

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

### Advertiser sign-up collects a name and an optional company name

`<AdvertiserSignUp>` requires a first and last name — sent as Clerk's native `firstName` /
`lastName` params, not metadata — and asks separately for an optional company or organization
name, passed as `unsafeMetadata: { companyName }`, to both `signUp.create()` and
`signUp.sso()`. Clerk copies both onto the created user once sign-up completes, so they
survive the Google OAuth round-trip with no extra storage of our own — which matters because
the ops Users list reads Clerk, not Postgres (`listPlatformUsers` in
[apps/api/lib/platform-users.ts](../../apps/api/lib/platform-users.ts)).

Name is required because Google's consent screen always returns one and the email-code path
has nowhere else to collect it; company stays **optional at sign-up**, deliberately, since
gating "Continue with Google" on it only produced a dead button with nothing explaining why.
Whoever signs up without a company gets a real org name anyway:
[`defaultOrgName`](../../apps/api/lib/customer-clerk.ts) falls back to `"{FirstName}'s
Organization"` (or `"My Organization"` if even that's missing) wherever an org gets created —
lazy bootstrap in [apps/api/lib/customer-auth.ts](../../apps/api/lib/customer-auth.ts) and the
one-off `apps/api/scripts/backfill-advertiser-orgs.ts` both call it, so no org is ever created
with an empty name. `<OrgNameNudge>` (below) is the non-blocking way to invite a rename later —
there's no blocking "name your company" dialog anymore.

If Clerk ever hands back a user missing first or last name (pre-dating this change, or a
Google account with an incomplete profile), `<ProfileNameNudge>` in
[apps/customer-web/components/shell/profile-name-nudge.tsx](../../apps/customer-web/components/shell/profile-name-nudge.tsx)
— wrapping the sidebar's user pill — nudges them to Settings → Account once, non-blocking, and
stays quiet after a dismiss.

### Settings → Account is the place to finish an account

[`<AccountSettingsView>`](../../apps/customer-web/components/settings/account-settings-view.tsx)
edits first name, last name, and **username** in one `user.update()` call, and offers
**account deletion** behind a confirm dialog. Details worth keeping:

- The username is only sent when non-empty — Clerk reads `""` as "clear it", so an untouched
  field would otherwise wipe an existing handle.
- Company/organization name lives on `AdvertiserOrg`, not the Clerk user, and is renamed from
  Settings → Team, not here — see `<OrgNameNudge>` above.
- Delete is gated on `user.deleteSelfEnabled` (a Clerk instance setting), and on success does
  a **hard** `window.location.assign("/auth/login")` — the Clerk client still holds a session
  for a user that no longer exists, and only a full reload clears it.
- Clerk rejects a taken username with a structured `ClerkAPIError` list rather than an
  `Error`; `clerkErrorMessage()` unwraps it so a failed save says why instead of silently
  doing nothing.

Nothing collects a name at sign-up — the email-code path asks for an email and nothing else —
so most new accounts arrive blank.
[`<ProfileNameNudge>`](../../apps/customer-web/components/shell/profile-name-nudge.tsx) wraps
the sidebar footer's user pill and opens a small, dismissible popover pointing here for anyone
missing a first name, last name, or username. It is deliberately **not** a modal: nothing in
the product is gated on a name, so blocking on it would be theatre. Dismissal is one-time and
per-user, in localStorage ([lib/profile-nudge-storage.ts](../../apps/customer-web/lib/profile-nudge-storage.ts)),
mirroring `<OrgNameNudge>`.

It also never opens over the product tour, which anchors on that same sidebar.
[`<TourProvider>`](../../packages/ui/src/components/tour-provider.tsx) publishes `isOpen` on
its context; the nudge won't start its open timer while that is true, and hides (rather than
counts as dismissed) if a replayed tour starts while it's up.

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

### Ops-mobile — always-on ClerkProvider

[apps/ops-mobile/app/_layout.tsx](../../apps/ops-mobile/app/_layout.tsx) mounts `<ClerkProvider>` **unconditionally** (same as customer/driver mobile now). Its `AuthGate` branches by email via `isOpsStaffEmail()` into a staff `(ops)` route group or a non-staff `(customer)` group — a dormant surface, separate from the dedicated `apps/customer-mobile` app.

---

## 4. Secrets and env vars

All three apps' Clerk secrets live in the **same flat Infisical project/environment** — no per-app folder isolation. Customer/driver env var names are deliberately prefixed so they never collide with ops's bare names:

| App | Env vars |
|---|---|
| `apps/api` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_ORG_ID`, `CUSTOMER_CLERK_SECRET_KEY`, `DRIVER_CLERK_SECRET_KEY` |
| `apps/ops` | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_ORG_ID` |
| `apps/ops-mobile` | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `apps/customer-web` | `NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY`, `CUSTOMER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY` |
| `apps/customer-mobile` | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| `apps/driver-web` | `NEXT_PUBLIC_DRIVER_CLERK_PUBLISHABLE_KEY`, `DRIVER_CLERK_SECRET_KEY`, `CLERK_ENCRYPTION_KEY` |
| `apps/driver-mobile` | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |

**Never reuse the unprefixed `CLERK_SECRET_KEY` / `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` names for a non-ops app** — doing so overwrites ops's working keys for every project pulling that Infisical environment afterward. `CLERK_ENCRYPTION_KEY` is required specifically because customer-web/driver-web pass explicit `publishableKey`/`secretKey` overrides into `clerkMiddleware()` (Clerk's "dynamic keys" mode) instead of relying on its default env var names.

Customer and driver apps always mount `ClerkProvider`. A missing publishable key fails clearly at the layout boundary (thrown error on web; configuration screen on mobile) — there is no `AUTH_ENABLED` feature flag.

**Vercel:** `NEXT_PUBLIC_CUSTOMER_CLERK_PUBLISHABLE_KEY` / `NEXT_PUBLIC_DRIVER_CLERK_PUBLISHABLE_KEY` (and matching secrets + `CLERK_ENCRYPTION_KEY`) must be set on **Preview** for *all* branches as well as Production — not only `Preview (staging)`. PR Preview builds prerender layouts and will fail with `…CLERK_PUBLISHABLE_KEY is required` if the key is missing.

**GitHub Actions CI:** the same build runs without Infisical, so `.github/workflows/ci.yml` supplies these vars from repo secrets and falls back to a throwaway `pk_test_…` / `sk_test_…` value when a secret is unset — CI never deploys its artifacts. Any new build-time env var must *also* be listed in `turbo.json` under `tasks.build.env`: Turbo 2 runs in strict env mode and silently drops anything not listed, so the var never reaches `next build` even when the workflow exports it.

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

Driver instances have **no** organization concept — every signed-in driver user there is just an individual account. Customer (advertiser) now does — see "Advertiser orgs and roles" below; it's Postgres-backed, not a Clerk Organization. `ROADMAP.md`'s planned `CustomerUser` model (linking a customer Clerk user to a `Customer` billing entity with `role: owner | member`) never shipped and is superseded by `AdvertiserOrg`/`AdvertiserMember` below. `Customer.clerk_user_id` is nullable in the schema but **is** populated for signed-in advertisers by `ensureCustomerRecord()` in [apps/api/lib/support.ts](../../apps/api/lib/support.ts) (with a `@placeholder.invalid` email — broadcasts address recipients by `clerk_user_id`, never by that column).

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

Same two-layer shape as ops: `is_owner` bypasses every permission check (like `org:admin`); everyone else gets whatever their assigned `AdvertiserRole.permissions` grants, from the closed `AdvertiserPermission` set ([packages/ops-contracts/src/enums.ts](../../packages/ops-contracts/src/enums.ts)). One starter role (`Member`, deliberately not `campaigns:submit` — that stays admin-only) is seeded once, shared by every org (`org_id = null`), by [apps/web/scripts/seed-advertiser-roles.ts](../../apps/web/scripts/seed-advertiser-roles.ts) — orgs that want a tiered submitter or read-only role create it themselves under Settings → Team → Roles. `getCustomerAccess()` returns `{ status: "authorized", userId, orgId, isOwner, permissions }` and caches it 60s per user, same pattern as `resolveOpsPermissions()`; `requireCustomerPermission()` mirrors `requireOpsPermission()`.

Campaigns are `org_id`-scoped (see [apps/api/lib/campaign-store.ts](../../apps/api/lib/campaign-store.ts)), and carry `created_by_name` on read — resolved from the retained `Campaign.clerk_user_id` — so a team can see who drafted what. Team management is live under `/v1/customer/org/**`: rename and billing details (`org:manage`, with `billing:write` additionally required to change `AdvertiserOrg.billing_email` / `tax_pin` — the KRA PIN a Kenyan tax invoice is issued against, present ahead of the Pesapal work that will consume it), list/invite/remove members (`team:manage`), accept invites via identity-only auth (no lazy bootstrap, so the invitee joins the inviting org instead of getting a solo org), and role listing/editing. Admins can customize starter roles (clone-on-save per org) or create org-scoped roles via `GET/POST /v1/customer/org/roles` and `PATCH/DELETE /v1/customer/org/roles/[roleId]` — Settings → Team → Roles on customer-web, Settings → Team → Manage roles on customer-mobile. Invite emails go through Resend; the accept landing is `/invitations/[token]` on customer-web, which offers **Create an account** as the primary action (most invitees have never used Admobi) and suppresses the company-name field on that sign-up path. customer-mobile has the twin route `app/invitations/[token].tsx`, reachable from the `admobihq-app://` scheme and — once the `.well-known` files below are configured — as a universal link on `app.admobihq.com/invitations/*`. Organization name defaults to `"{FirstName}'s Organization"` at bootstrap when Clerk's `companyName` metadata is empty (Google SSO, say) — customer-web's `<OrgNameNudge>` offers a one-time, dismissible rename prompt for that exact case, replacing the old blocking `<CompanyNamePrompt>` modal. Ops campaign review, the ops Campaigns list's Advertiser column, and the Users list all read
`AdvertiserOrg.name` via `campaign.org_id` / membership join, not Clerk — the Campaigns list
falls back to the campaign's free-text `contact_email` only if the campaign has no org. Org activity feed: `GET /v1/customer/org/activity` (`activity:read`) — allowlisted projection over `audit_events` (never raw `summary` / ops emails). Member removal is soft-delete (`removed_at`); re-invite reactivates the row. Campaign submit/review notifications fan out to every active member with `campaigns:read`, and each `CustomerNotification` is stamped with `org_id` so the inbox filters to the caller's current org — leaving an org stops surfacing its campaign notices. Sole admins cannot delete their Clerk account until they transfer admin or delete the organization. Support cases stamp `org_id`; members with `support:read_all` see all org cases. Ops directory: `GET /v1/advertiser-orgs` (+ `[id]`) gated on the `campaigns` permission — sidebar **Advertiser orgs** in ops web and ops-mobile.

**Accepting an invitation is an explicit, reversible choice.** Nothing about an invite link may move the invitee's account on its own — opening one out of curiosity must be safe, and the page never auto-accepts.

`GET /v1/customer/org/invitations/accept/[token]` is the read-only preview behind that. It is deliberately **readable without a session** (whoever holds the token can already redeem it, so naming the org leaks nothing) and returns `orgName`, `roleName`, `inviterName`, the invited `email`, plus — once signed in — `emailMismatch` and a `conflict` discriminant describing how accepting would collide with what the caller already has:

| `conflict` | Meaning | What the client offers |
|---|---|---|
| `none` | No membership yet | Accept / Decline |
| `empty_solo_org` | Sole member of the auto-created workspace, nothing in it | Accept (says it replaces an empty workspace) / Decline |
| `solo_org_with_content` | Sole member, but it holds real work — `campaignCount` / `supportCaseCount` say how much | Destructive confirm naming what is lost / Decline |
| `existing_team` | Belongs to an org with other members | No accept path — transfer admin or leave first / Decline |

`POST .../accept/[token]` then acts **only on that choice**. If the caller already has an org, it refuses with `409 { reason: "solo_org_conflict", currentOrgName, soloOrgIsEmpty, campaignCount, supportCaseCount }` unless the body carries `{ leaveSoleOrg: true }` — consent is never inferred from an empty body, and `soloOrgIsEmpty` exists so the client can word "replace this empty workspace" differently from "delete this workspace and its N campaigns". Campaigns and support cases are **detached** (`org_id = null`), not deleted; campaign reads scope purely by `org_id`, so a detached campaign is unreachable by every advertiser afterwards. Same detach semantics for `POST /v1/customer/org/delete-organization`, whose counts come from `GET /v1/customer/org/deletion-status`.

> An earlier revision silently absorbed an untouched solo org on accept. That was wrong: "we judged your workspace worthless" is not a call the server gets to make, and it deleted a tenant off the back of a link visit. Consent is now required in every case; `isUntouchedSoloOrg()` only decides the *wording*.

`POST /v1/customer/org/invitations/decline/[token]` is the way out. It stamps `declined_at` — distinct from `revoked_at`, so the inviting admin can tell "they said no" from "I withdrew it" rather than watching the row vanish — and touches nothing else about the caller's account. Declined invitations are excluded from every pending-invite list and can no longer be accepted (`409`).

**Leaving an org:** `POST /v1/customer/org/leave` is self-service — any member (not just an admin) can leave their own org; the sole owner is refused (`409`) until they transfer admin first, mirroring the account-deletion guard. This is the unblock for the `existing_team` case above.

The email on the invitation must match the caller's Clerk address on both accept and decline, and the check **fails closed** — an address Clerk can't resolve is refused, so a leaked token can't be redeemed (or killed) by whoever holds it. Invites expire after 7 days (`410`). `POST /v1/customer/org/members` (which sends mail), accept and decline are all rate-limited **per Clerk user id**, not per IP: `checkRateLimit`'s `identifier` option exists for that, because Kenyan mobile carriers NAT many subscribers behind one address.

**Making an admin is owner-only, and there is no self-service escalation.**
`PATCH /v1/customer/org/members/[id]` accepts `isOwner`, but changing it
requires the **caller** to be an owner, and refuses to act on the caller's own
membership. Without that guard any custom role granting `team:manage` was a
path to the full permission set — a `team:manage` holder could PATCH their own
member id to `isOwner: true` and inherit `billing:write`, `org:manage` and
org deletion. Role (`roleId`) changes remain a plain `team:manage` operation.

The sanctioned alternative is `AdvertiserAdminRequest`: a member posts to
`POST /v1/customer/org/admin-requests` with a written reason (10–1000 chars),
every active owner gets an inbox notification + push, and an owner resolves it
at `POST /v1/customer/org/admin-requests/[id]` with
`{ decision: "approve" | "deny", note? }`. Approving promotes them in the same
transaction that closes the request; denying **requires** a note, which is
shown to the requester verbatim — a refusal they can't understand just gets
asked again. `GET` returns the whole queue to owners and only their own rows to
everyone else. One open request per member per org, enforced by a partial
unique index (`WHERE status = 'pending'`), plus a 5/hour per-user rate limit.

**Inviting an existing member is refused up front** (`409`). Beyond the
confusing dead-end it used to create, a sole owner inviting their own address
could accept, confirm "leave and join", and have `detachAndDeleteOrg` strip
every campaign off the org the invitation pointed *into*.

**Declined invitations stay visible.** `GET /v1/customer/org/members` returns
declined rows alongside pending ones (declined regardless of expiry), so Team
renders them with a **Declined** badge and an **Ask again** action instead of
the row silently vanishing. The inviter also gets an inbox notification + push
the moment someone declines.

**Client-side permission gating.** `GET /v1/customer/org` returns `isOwner` and the caller's effective `permissions[]` alongside the org name, plus `billingEmail` / `taxPin` for callers holding `billing:read`. Both apps read it through `lib/use-org.ts` (`useOrg`, `useOrgPermissions`) and the shared `orgCan()` helper in [packages/ops-contracts/src/advertiser-org.ts](../../packages/ops-contracts/src/advertiser-org.ts), so a role without `campaigns:submit` never sees a Submit button and a non-admin never sees the Roles tab. **The server check stays authoritative** — hiding is a UX affordance, not the boundary.

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
