# Admobi — Security Architecture & Controls

What protects the platform, layer by layer, and where each control lives in the code. Sign-in flows, organizations and role details: [AUTH.md](./AUTH.md). Deploy-time config and env vars: [DEPLOYMENT.md](./DEPLOYMENT.md). Route map: [API.md](../api/API.md).

> **Keep this current.** If you add a route, an upload, a secret, or a new actor, update the matching section here in the same change.

---

## 1. Trust model at a glance

```
 Browsers / Expo apps ──HTTPS──▶  apps/api  (api.admobihq.com)  ──▶ Neon Postgres (Prisma, schema public)
   ops / app / driver             every handler enforces auth     ──▶ Cloudinary (authenticated delivery)
   marketing (web)                itself — middleware only does    ──▶ Resend, Expo Push, Upstash Redis
                                  CORS
 apps/web (admobihq.com) ──▶ Payload CMS (schema cms), Vercel Blob (public images)
```

- **One backend boundary.** All business data flows through `apps/api`. The frontends (`ops`, `customer-web`, `driver-web`, three Expo apps) are UI only; their middleware redirects signed-out users for UX, but **the API is authoritative** for every read and write.
- **Four actor types**, each with its own identity source: ops staff, advertisers (customers), drivers, and anonymous public visitors. CMS editors are a fifth, separate identity (Payload users).
- **Default deny.** A route with no guard is public. Every public route lives under `/v1/public/*` or `/v1/health` and is rate-limited; everything else under `/v1/*` calls a `require*Access()` guard as its first statement.

---

## 2. Identity & authentication

### Three isolated Clerk instances

| Instance | Used by | Sign-in | Restriction |
|---|---|---|---|
| Ops | `apps/ops`, `apps/ops-mobile` | Email one-time code | `@admobihq.com` only **and** membership of the fixed `CLERK_ORG_ID` org |
| Customer | `apps/customer-web`, `apps/customer-mobile` | Email code, Google | — |
| Driver | `apps/driver-web`, `apps/driver-mobile` | Email code, Google | — |

- **No passwords anywhere in the product apps.** Clerk handles one-time codes, OAuth, session rotation and bot protection (Cloudflare Turnstile on sign-up, mounted via `#clerk-captcha`).
- **Separate instances mean separate signing keys.** A customer token cannot verify against the driver or ops instance, so cross-actor token confusion is impossible by construction. Each verifier passes its own secret: [lib/auth.ts](../../apps/api/lib/auth.ts) (ops), [lib/customer/customer-auth.ts](../../apps/api/lib/customer/customer-auth.ts), [lib/driver/driver-auth.ts](../../apps/api/lib/driver/driver-auth.ts).
- **Ops access is two independent gates**: the primary email must end in `@admobihq.com` (exact suffix match including the `@`, so `x@evil.admobihq.com` and `admobihq.com.evil` fail), *and* the user must be a member of the ops Clerk organization. Failing either is `403`.
- **Production uses Clerk `pk_live_` keys** on every app; unprefixed `CLERK_*` names are reserved for ops so a misconfigured customer/driver app can never overwrite them ([AUTH.md §4](./AUTH.md#4-secrets-and-env-vars)).
- **Mobile tokens** are cached in the OS keystore via `expo-secure-store` (Clerk `tokenCache`), excluded from Android backups by `secure_store_backup_rules`.

### Payload CMS (marketing site)

Separate email + password accounts for content editors at `admobihq.com/admin`. Payload locks an account after repeated failed logins, and first-user registration is closed (`/api/users/init` → `initialized: true`). The JWT signing secret `PAYLOAD_SECRET` is **required on every Vercel deployment** — [payload.config.ts](../../apps/web/payload.config.ts) throws rather than fall back to a known development value.

---

## 3. Authorization

### Ops — two layers

1. **Clerk org role**: `org:admin` gets everything; `org:member` gets layer 2.
2. **Database `OpsRole`**: a closed set of section permissions (`leads`, `fleet`, `drivers`, `waitlist`, `media_kit`, `announcements`, `support`, `finances`, `content`, `flags`, `activity`, `driver_applications`, `safety`, `campaigns`) assigned per member.

Guards: `requireOpsAccess()` (any staff), `requireOpsPermissionAccess(p)`, `requireOpsAdminAccess()` in [lib/api-utils.ts](../../apps/api/lib/api-utils.ts). Team, role and platform-user directory routes are **admin-only**. The last remaining admin cannot be demoted or removed.

### Advertisers — Postgres-backed organizations

- Every advertiser belongs to exactly one `AdvertiserOrg`. Owners (`is_owner`) bypass permission checks; everyone else gets their `AdvertiserRole.permissions` from a closed set (`campaigns:read|write|submit`, `creatives:write`, `reports:read`, `billing:read|write`, `team:manage`, `org:manage`, `activity:read`, `support:read_all`).
- **Owner-only:** ownership transfer, organization deletion, editing/deleting roles, and changing anyone's `isOwner`.
- **No self-service escalation.** A non-owner cannot change their own role, and can only assign or invite into a role whose permissions are a subset of their own (`canGrantRole()` in [lib/advertiser/advertiser-org.ts](../../apps/api/lib/advertiser/advertiser-org.ts)). The sanctioned path to more access is an admin request, which the requester can never approve themselves.
- **Consent before destructive moves.** Accepting an invitation that would replace an existing workspace requires an explicit `{ leaveSoleOrg: true }`; nothing is inferred from a link visit.
- Client-side permission gating (`orgCan()`) only hides buttons; the server check is the boundary.

### Drivers

No org concept: every driver route scopes by the verified `clerk_user_id` (profile, documents, notifications, SOS incidents via `loadOwnedIncident`).

---

## 4. Tenant isolation (IDOR protection)

- Customer routes never accept an org id from the client — the org comes from the verified token's membership. Reads use `getOwnedCampaign(orgId, id)` and membership lookups with `org_id` in the `WHERE` clause.
- Driver routes compare the row's owner to the token subject before returning anything.
- **Mismatches return `404`, never `403`**, so ids cannot be enumerated to discover what exists.
- Notification and announcement "mark read" operations filter by `clerk_user_id` in the update itself, not after the fact.

---

## 5. Data protection

| Data | How it is protected |
|---|---|
| Driver documents (National ID, KRA PIN certificate, payout proof), campaign creatives, SOS photos | Cloudinary **`authenticated`** delivery type. A signed URL is minted and fetched **server-side only** after an ownership check, then streamed back with `Cache-Control: private` — the URL and Cloudinary public id never reach a client ([lib/storage/private-media.ts](../../apps/api/lib/storage/private-media.ts)). |
| Support case access tokens, support identity tokens, invitation tokens | 192 bits from `crypto.randomBytes`, returned once, stored only as **SHA-256 hashes**, compared with `timingSafeEqual` ([lib/support/support-token.ts](../../apps/api/lib/support/support-token.ts)). |
| Invitations | Bound to the invited email (fails closed if Clerk can't resolve the caller's address), 7-day expiry, single use, explicit decline state. |
| Support threads | Ops internal notes (`internal_note`) are filtered out of every public response; public DTOs (`toPublicCase`, `toPublicMessage`) are allowlists. The email-level identity token lists only anonymous cases — account-linked cases are reachable only with the account's own token. |
| Org activity feed | Allowlisted projection over `audit_events`; never exposes raw summaries or ops staff emails. |
| Ops broadcast images | Public Vercel Blob (by design — announcement images), type- and size-checked. |

Uploads are validated server-side for MIME type against a fixed allowlist and maximum size, and creative dimensions are checked against Cloudinary's own measurements after upload (not trusted from the client).

---

## 6. Input handling

- **Every request body is parsed with Zod** (`parseJsonBody`, shared schemas in [packages/ops-contracts](../../packages/ops-contracts/src/schemas.ts)). Schemas are explicit field lists, so a body cannot mass-assign `status`, `org_id` or ownership fields.
- **No raw SQL in the API.** All queries go through Prisma; sortable columns are allowlisted before reaching `orderBy`.
- **Output encoding.** React escapes all rendered text; React 19 blocks `javascript:` URLs; email templates are React Email components. JSON-LD blocks escape `<` so CMS text can't close the `<script>` tag ([components/seo/json-ld.tsx](../../apps/web/components/seo/json-ld.tsx)).
- **Redirects.** Post-sign-in `?redirect_url=` values pass through `safeRedirectPath()` ([packages/ops-contracts/src/safe-redirect.ts](../../packages/ops-contracts/src/safe-redirect.ts)), which only allows same-origin paths — `//host`, `/\host` and control characters fall back to `/`.

---

## 7. API perimeter

### CORS
[lib/cors.ts](../../apps/api/lib/cors.ts) reflects only origins listed in `API_CORS_ORIGINS`; preflights from any other origin get `403`. LAN/localhost origins are accepted **only** outside `NODE_ENV=production`. Customer and driver auth is Bearer-only (no cookies), so cross-site request forgery has nothing to ride on.

### Rate limiting
Upstash Redis sliding windows ([lib/rate-limit.ts](../../apps/api/lib/rate-limit.ts)). Public routes key by client IP (Vercel overwrites `X-Forwarded-For`, so it can't be spoofed); authenticated routes key by Clerk user id, because Kenyan carriers NAT many subscribers behind one address.

| Route | Limit |
|---|---|
| `POST /v1/public/{leads,drivers,waitlist,media-kit}` | 5 / min / IP |
| `POST /v1/public/support` | 5 / min / IP |
| `GET /v1/public/support` · `GET /support/[id]` · `POST …/messages` | 20 · 30 · 10 / min / IP |
| `POST /v1/public/{push-tokens,driver-push-tokens}` | 10 / min / IP |
| `GET /v1/public/announcements` · `/config` | 30 · 60 / min / IP |
| `POST /v1/driver/sos` | 3 / 5 min / driver |
| Advertiser invites, invite accept/decline, admin requests | per user (invites 10 / 10 min; admin requests 5 / hour) |

### Machine-to-machine
Vercel Cron and release scripts authenticate with `Authorization: Bearer $CRON_SECRET`, compared in constant time. Without the secret set, those paths are closed.

---

## 8. Browser hardening

Every app sends, via `headers()` in its `next.config.mjs`:

| Header | Value | Why |
|---|---|---|
| `X-Frame-Options` / `frame-ancestors` | `DENY` / `'none'` (marketing: `SAMEORIGIN` / `'self'`) | Clickjacking — destructive one-click actions can't be framed by another site |
| `X-Content-Type-Options` | `nosniff` | Browsers honour the declared type of proxied uploads |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Paths and query strings (invite tokens) don't leak to third parties |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` | Embedded third-party content can't request device access |
| `Strict-Transport-Security` | `max-age=63072000` (set by Vercel) | HTTPS only |

`X-Powered-By` is disabled. The marketing site's edge middleware 404s scanner/probe paths before they reach Node or the database.

---

## 9. Secrets & configuration

- **Infisical** is the source of truth for dev/staging/prod secrets; `npm run env:pull` writes git-ignored `.env.local` files. Nothing secret is committed — `.env*` is ignored except `.env.example` templates, and a full git-history scan (2026-10-18) found no server credentials.
- Firebase `google-services.json` files are committed by design (client identifiers, not secrets); keys must stay restricted to the app package ids in Google Cloud.
- Vercel holds per-environment values; staging uses Clerk development instances, production uses live instances ([DEPLOYMENT.md](./DEPLOYMENT.md)).
- Android release keystores live only in GitHub Actions secrets, decoded at build time.

---

## 10. Supply chain & CI/CD

- **Dependabot** opens weekly npm and GitHub Actions update PRs (`.github/dependabot.yml`); major bumps of Zod, TypeScript and ESLint are held for dedicated migrations.
- **Third-party Actions are pinned to commit SHAs** (with the version as a comment); first-party `actions/*` use major tags.
- Workflows trigger on `pull_request` (not `pull_request_target`), so PRs from forks never see secrets. Release workflows run only on version tags or manual dispatch.
- CI runs typecheck, lint (`--max-warnings 0`), unit tests and Playwright e2e on every PR.
- `npm audit --omit=dev`: runtime dependencies (Next, Payload, sharp, undici, Prisma, Clerk) are clean; the remaining advisories are in mobile build tooling (Expo CLI, Metro, Jest) that never runs in production.

---

## 11. Logging, audit & monitoring

- **Audit trail.** Every mutation — ops, advertiser, driver and public form submissions — writes an `audit_events` row with actor, app, entity, action and org ([lib/audit.ts](../../apps/api/lib/audit.ts)). Audit writes never throw, so logging can't break a request. Ops reads it under Activity; advertisers see an allowlisted slice.
- **Authorization denials.** Every `403` from the shared guards logs `[authz] 403 forbidden`; Vercel attaches the request path, so log drains and alerts can key on it.
- **Errors** go to Sentry for every app (server, edge, browser, React Native), with `sendDefaultPii` off. Marketing session replays (2%) mask text by default.
- **Ops alerts.** New leads, support cases and SOS incidents push to ops staff devices and email the admin inbox.

---

## 12. Mobile apps

- Clerk session tokens in SecureStore (see §2); all API traffic over HTTPS to the same `apps/api` guards as web.
- Map WebViews render bundled HTML with static configuration only — no user data is interpolated into them.
- Deep links: customer invitations use verified App Links / Universal Links (`/.well-known/assetlinks.json`, `apple-app-site-association`) served from `app.admobihq.com`.
- OTA updates via EAS Update, built with `--environment preview|production` so builds never embed a developer machine's LAN API URL.

---

## 13. Safety (SOS)

Driver SOS incidents are owner-scoped on every route, location pings are admitted only while an incident is open, photos are private (Cloudinary authenticated), and ops access requires the `safety` permission. Detail: [SAFETY-SOS.md](./SAFETY-SOS.md).

---

## 14. Hardening backlog

Controls that are planned or configured outside the codebase. Track progress here.

- **MFA for ops staff** — enforce in the ops Clerk instance (dashboard setting).
- **Server-verified bot protection on public forms** (Vercel BotID or Turnstile) in addition to rate limits.
- **Payload editor roles** and SSO for the CMS; restrict who can create CMS users.
- **Dedicated secret for release broadcasts**, separate from `CRON_SECRET`.
- **`authorizedParties`** on Clerk token verification once every client origin (including native apps) is enumerated.
- **Script `Content-Security-Policy`** (report-only first) — Clerk, Google Analytics, Sentry and MapLibre need allowlisting.
- **n8n** on its own database before it is ever redeployed (the compose file already pins the image and binds to loopback behind Caddy).
- **Payments (Pesapal)**: when built, verify every IPN server-side with `GetTransactionStatus`, make handling idempotent on `OrderTrackingId`, and compute amounts server-side only.
- **Data protection**: retention and deletion policy for driver identity documents under Kenya's Data Protection Act 2019.

## 15. Reporting a vulnerability

Report privately to the Admobi team with steps to reproduce — don't open a public GitHub issue for a security problem.
