# Admobi pre-launch security audit

**Date:** 2026-10-18 · **Commit:** `4af6cf8` (master) · **Method:** source review of all 107 API routes + frontends + mobile, SAST greps, `npm audit`, full git-history secret scan, passive/read-only probes of production (`admobihq.com`, `app.`, `ops.`, `driver.`, `api.`).

**Bottom line:** the core design is solid. Every customer/driver route is tenant-scoped, the API enforces its own auth, and there is no SQL injection surface and no leaked secret in history. **I found no critical issue.** There are **5 medium-severity issues worth fixing before launch** (M1–M5), plus 3 configuration items to confirm (C1–C3) that would become high if they turn out to be wrong.

---

## Remediation status (branch `security/pre-launch-hardening`)

| ID | Status | What changed |
|----|--------|--------------|
| C1 | ✅ Fixed | `payload.config.ts` throws on any Vercel deploy without `PAYLOAD_SECRET` |
| C2 | ⏳ Dashboard | Enable required MFA in the ops Clerk instance (not a code change) |
| C3 | 🟡 Partial | n8n image pinned to `2.43.7`, port bound to `127.0.0.1`; own database still needed before redeploy |
| M1 | ✅ Fixed | Email-token path lists anonymous cases only; driver-web now sends the account token on create and lists by account |
| M2 | ✅ Fixed | `X-Frame-Options`, `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` on all five Next apps |
| M3 | ✅ Fixed | `canGrantRole()` ceiling on assign/invite; no self role change; no self-approval of admin requests |
| M4 | ✅ Fixed | `/v1/users` is admin-only, matching the ops Users page |
| M5 | ✅ Fixed | `payload` + `@payloadcms/*` 3.91.0 (undici 7.29.1), `sharp` 0.35.5; Dependabot sharp hold removed. Per HELP-CMS.md § Upgrading Payload: all packages on one version; Drizzle-vs-`information_schema` check shows 0 missing tables/columns in `cms` on dev **and** prod (no migration needed); `npm run build -w web` passes, import map intact |
| L1 | ✅ Fixed | `safeRedirectPath()` in ops-contracts, used by advertiser sign-in/sign-up (with tests) |
| L2 | 🟡 Code shipped | Cloudflare Turnstile verified server-side on leads/drivers (403) and support (no confirmation email when unverified); BotID ruled out (same-origin only). Live once the Turnstile keys are set — see [API.md § Bot check](../api/API.md#bot-check-cloudflare-turnstile) |
| L3 | ⏳ Open | Payload roles need a CMS schema migration |
| L4 | ✅ Fixed | JSON-LD escapes `<` |
| L5 | ⏳ Open | Needs a new env var provisioned for the release notifier |
| L6 | ⏳ Open | Needs every client origin (incl. native) enumerated first |
| L7 | 🟡 Partial | Guard wrappers log `[authz] 403 forbidden`; alerting still to configure in Vercel/Sentry |
| L8 | ⏳ Open | Move case tokens to SecureStore |
| L9 | 🟡 Partial | Third-party actions SHA-pinned; CODEOWNERS still to add |
| I1 | 🟡 Partial | `poweredByHeader: false` everywhere; API route catalogue page left as is |

Found while verifying M5, fixed on the same branch: `addRandomSuffix: true` on Vercel Blob made every resized Media size 404 for uploads after 2026-08-15 (not caused by the upgrade — the adapter is identical in 3.90.2 and 3.91.0). Removed; verified by uploading twice with the same filename on dev, all 8 files served. Production had no affected uploads.

Re-verify after deploy: response headers on all five domains, a Payload media upload on staging (sharp 0.35), and the driver-web support list while signed in.

---

## Severity summary

| ID | Severity | Finding | Effort |
|----|----------|---------|--------|
| C1 | **High if true** | Payload CMS falls back to a hardcoded JWT secret if `PAYLOAD_SECRET` is unset | 1 line |
| C2 | **High if true** | Ops staff sign in with email code only; no MFA enforced | Clerk dashboard |
| C3 | Medium if true | n8n would share the production DB with full credentials if redeployed | Infra |
| M1 | Medium | Support "identity token" can be pre-claimed for someone else's email | Small |
| M2 | Medium | No clickjacking / CSP headers on any app | Small |
| M3 | Medium | `team:manage` can promote itself to Admin (self-assign role, self-approve request) | Small |
| M4 | Medium | Any ops member, even with zero permissions, can export all customer + driver contact PII | Small |
| M5 | Medium | `sharp` (libvips/libheif/librsvg CVEs) and `payload`→`undici` are vulnerable at runtime | Upgrade |
| L1 | Low-Med | Open redirect after advertiser sign-in (`?redirect_url=//evil.com`) | 1 line |
| L2 | Low-Med | Public forms send branded email to any address with attacker text; honeypot is client-only | Small |
| L3 | Low-Med | Payload admin: password-only, no roles, separate identity from Clerk | Medium |
| L4 | Low | JSON-LD `<script>` breakout from CMS content | 1 line |
| L5 | Low | `CRON_SECRET` also authorizes broadcast push to every user | Small |
| L6 | Low | Clerk `verifyToken` called without `authorizedParties` | Small |
| L7 | Low | Failed auth (401/403) not logged; no alerting | Small |
| L8 | Low | Mobile support-case tokens in AsyncStorage with `allowBackup="true"` | Small |
| L9 | Low | CI: third-party actions not SHA-pinned; no CODEOWNERS | Small |
| I1 | Info | `X-Powered-By: Next.js, Payload` header; public API route catalogue at `api.admobihq.com/` | — |

---

## Confirm before launch (config I couldn't see)

### C1 — Payload JWT secret fallback
`apps/web/payload.config.ts:41`
```ts
secret: process.env.PAYLOAD_SECRET || "dev-only-change-me",
```
If `PAYLOAD_SECRET` is ever missing on the production `web` project, anyone can forge a Payload admin session and get full control of the CMS (and through it, content on the main domain). Nothing enforces it; `scripts/check-env.ts` only runs on demand.
**Fix:** throw when it's missing in production:
```ts
secret: process.env.PAYLOAD_SECRET || (process.env.VERCEL_ENV === "production" ? (() => { throw new Error("PAYLOAD_SECRET required") })() : "dev-only-change-me"),
```
Also confirm it's a long random value (≥32 bytes) and differs between staging and prod.

### C2 — Ops accounts have no second factor
The ops Clerk instance uses **email code only** (docs/shared/AUTH.md §2). Ops staff can see every lead, driver document (National ID, KRA PIN, bank details), safety incident and support thread. Anyone who gets into a staff mailbox gets all of that.
**Fix:** in the ops Clerk instance, enable and **require** MFA (TOTP or passkeys). Also check session lifetime and inactivity timeout.

### C3 — n8n and the production database
Per project notes, n8n's tables live in the `n8n` schema of the **production** Neon database. `n8n-project/docker-compose.yml` uses `n8nio/n8n:latest` and publishes port `5678` straight onto the host. If it's redeployed with the app's DB credentials, any n8n compromise (it's an internet-facing workflow engine with a history of RCE advisories) gives full read/write to production.
**Fix:** before redeploying, give n8n its own database, or at minimum a Postgres role limited to the `n8n` schema. Pin the image version and bind `5678` to `127.0.0.1` behind Caddy.

---

## Medium findings

### M1 — Support identity token can be pre-claimed
`apps/api/lib/support/support.ts` (`mintIdentityTokenIfAbsent`), `apps/api/app/v1/public/support/route.ts` (GET, legacy `?email=` path)

The first person to open an anonymous support case **for a given email address** gets that email's identity token, and it's never re-issued. Email is unverified. So an attacker can:
1. `POST /v1/public/support` with `contact_email: victim@company.com` → gets back `identityToken`.
2. Later, `GET /v1/public/support?email=victim@company.com` with that token returns the victim's case list (subject, name, email, status, priority) for every case anyone opens under that address, including cases opened from signed-in apps, because the query is just `contact_email`.
3. The real victim never gets an identity token for their own email, so "my cases" is permanently broken for them.

Message bodies are **not** exposed (those need the per-case token or a real account).
**Fix (pick one):** retire the legacy email path now that account-based lookup exists. Or bind the identity token to a verified email: send a magic link instead of returning the token in the response. At a minimum, scope the legacy list to `customer_id IS NULL AND driver_clerk_user_id IS NULL`.

### M2 — No security headers (clickjacking)
No app sets `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy` or `Permissions-Policy`. I confirmed this against production responses. Vercel adds HSTS (`max-age=63072000`), but without `includeSubDomains`/`preload`.
Impact: `app.` and `ops.` can be framed by any site, which makes clickjacking possible on one-click destructive actions (delete organization, approve/reject campaign, leave org). Without `nosniff`, the creative/document proxy routes depend entirely on the stored `Content-Type`.
**Fix:** add a `headers()` block to each `next.config.mjs` (or `vercel.json`):
```js
{ source: "/(.*)", headers: [
  { key: "X-Frame-Options", value: "DENY" },            // SAMEORIGIN on web if Payload admin needs it
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
]}
```
A full script CSP is a bigger project (Clerk, GA, Sentry, MapLibre). Start with `frame-ancestors` now and add a report-only CSP later.

### M3 — `team:manage` is effectively Admin
`apps/api/app/v1/customer/org/members/[id]/route.ts` (PATCH), `.../admin-requests/[id]/route.ts`

AUTH.md says "there is no self-service escalation". The `isOwner` path is correctly guarded, but:
- `PATCH /members/{ownId}` with `{ roleId: <Admin role id> }` succeeds for any `team:manage` holder. There's no self-check and no ceiling on which role can be assigned, so a custom "Team lead" role with `team:manage` but no `billing:write` can grant itself `billing:write` and `org:manage`.
- `POST /admin-requests/{id}` lets a `team:manage` holder approve **their own** request (`request.clerk_user_id === auth.access.userId` isn't rejected).

**Fix:** refuse role changes on the caller's own membership. Refuse assigning a role whose permissions aren't a subset of the caller's own (owners exempt). Reject self-review of admin requests.

### M4 — Unscoped PII export for any ops member
`apps/api/app/v1/users/route.ts` uses `requireOpsAccess()` (any org member), not a permission. A member whose role grants zero permissions can still page through every customer's and driver's email, phone and company from Clerk.
**Fix:** gate it behind a permission, e.g. a new `users` entry in `OPS_PERMISSIONS`, or reuse `drivers` for `type=drivers` and `campaigns` for `type=customers`.

### M5 — Vulnerable runtime dependencies
`npm audit --omit=dev` reports 73 issues (2 critical, 40 high). **Most are build-time tooling** (Expo CLI, Metro, Jest, `shell-quote`, `proxy-addr` via Expo dev server, `node-forge` via Expo code signing). They aren't reachable from production traffic. The ones that run in production:

| Package | Where it runs | Advisory | Fix |
|---|---|---|---|
| `sharp` 0.34.5 / 0.35.4 | Payload uploads, Next image optimizer | libvips, libheif, librsvg CVEs (GHSA-f88m-g3jw-g9cj, -rgj7-g3m4-5g8c, -wq5f-xc86-pv6w) | `sharp` ≥ 0.35.5 |
| `undici` 7.x (under `payload`) | Payload server | TLS validation bypass in BalancedPool, several DoS | `payload` ≥ 3.91.0 |
| `image-size` | Payload uploads | DoS via infinite loop | comes with Payload bump |

Exposure is limited because only CMS staff upload to Payload, but the image optimizer processes images too. Also turn on Dependabot security updates for npm (`.github/dependabot.yml` exists; check it covers `npm` at the root).

---

## Low findings

**L1 — Open redirect after sign-in.** `apps/customer-web/components/auth/advertiser-sign-in.tsx:87` and `advertiser-sign-up.tsx:94` accept any `redirect_url` that `startsWith("/")`, which includes `//evil.com` and `/\evil.com`. A phishing link to the real login page sends the user to an attacker site right after a successful sign-in. Fix: `url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")`. (The Google SSO path is validated by Clerk.)

**L2 — Email abuse via public forms.** `POST /v1/public/{leads,drivers,support,media-kit,waitlist}` send a confirmation email to whatever address is submitted, containing the submitted name/company. The honeypot exists only in the web form, and the API never checks it. Limits are 5/min **per IP**, which a botnet bypasses. Risks: Resend sender reputation and Admobi-branded spam. Fix: Vercel BotID or Turnstile verified server-side on these routes; consider a daily per-recipient cap.

**L3 — Payload admin hardening.** `/admin` on the public domain uses password-only auth. The `Users` collection has no roles, so any CMS user can create, edit or delete other CMS users. CMS accounts are separate from Clerk, so offboarding a staff member in Clerk doesn't remove CMS access. Fix: add `access` rules to `Users` (admin-only create/delete) and audit the current user list. Longer term, put `/admin` behind Vercel deployment protection or IP allowlist, or move CMS auth to SSO.

**L4 — JSON-LD script breakout.** `apps/web/components/seo/json-ld.tsx` renders `JSON.stringify(data)` raw. Blog and help titles and excerpts flow in (`blog-post.tsx:68`, `help-article.tsx:85`), so a CMS value containing `</script><script>…` executes on `admobihq.com`. Fix: `JSON.stringify(data).replace(/</g, "\\u003c")`.

**L5 — `CRON_SECRET` blast radius.** `apps/api/app/v1/notifications/broadcast/route.ts` accepts `CRON_SECRET` so release scripts can push to all users. Anyone holding the cron secret (CI, release machines, Bruno env) can send a push notification to every customer and driver. Fix: use a separate `RELEASE_BROADCAST_SECRET` and restrict which `target_apps` and templates the system path can send.

**L6 — No `authorizedParties` on JWT verification.** `lib/auth.ts`, `customer-auth.ts`, `driver-auth.ts`, `support.ts` call `verifyToken(bearer, { secretKey })` only. The three instances are separate, so cross-actor confusion doesn't happen today, but Clerk recommends checking `azp` against your known origins (e.g. `https://app.admobihq.com`). That guards against tokens minted for another frontend of the same instance, or a misconfigured shared instance in staging.

**L7 — Logging & alerting gaps.** All mutations write `audit_events`, which is good. But 401/403 responses, rate-limit hits, and invitation-token failures aren't recorded anywhere. Sentry receives errors only. Fix: log authz failures (route, actor id, IP) and add a Sentry or Vercel alert for spikes in 401/403/429.

**L8 — Mobile token storage.** Clerk tokens correctly use SecureStore. Per-case support tokens (`customer-mobile/lib/support.ts:38`, `driver-mobile/lib/support.ts:56`) are in AsyncStorage, which is included in Android backups (`allowBackup="true"`; the backup rules exclude only SecureStore). Fix: move them to SecureStore.

**L9 — CI supply chain.** Third-party actions (`softprops/action-gh-release@v3`, `android-actions/setup-android@v4`) are pinned to mutable tags, and the release workflows hold signing keystores. Fix: pin them to commit SHAs. Add `CODEOWNERS` for `.github/` and `apps/api/lib/*auth*`.

**I1 — Information disclosure.** `X-Powered-By` is on (`poweredByHeader: false` removes it). `https://api.admobihq.com/` renders a catalogue of every route. That's harmless given the auth model, but unnecessary in production.

---

## Verified secure (what's working)

- **Tenant isolation:** every `/v1/customer/*` route scopes by `orgId` from the verified token (`getOwnedCampaign`, membership lookups). Every `/v1/driver/*` route scopes by `clerk_user_id` (`loadOwnedIncident`, document ownership). They return 404, not 403, so ids can't be enumerated.
- **Auth model:** three separate Clerk instances. The API enforces auth in every handler (I checked all 107 routes; all 5 `bulk` routes go through `handleBulkRequest` → `requireOpsPermissionAccess`). Production uses `pk_live_` keys.
- **Owner-only gates** on ownership transfer, org deletion, role editing and `isOwner` changes are correct. The last-owner guard holds.
- **Invitations:** 192-bit random tokens, stored as SHA-256 hashes, 7-day expiry, email-match check that fails closed, explicit consent before replacing a workspace, rate-limited per user.
- **Private files:** creatives, driver documents and SOS photos use Cloudinary `authenticated` delivery. Signed URLs are minted and fetched server-side only and never reach the client. MIME allowlists and size caps are in place.
- **Injection:** no `$queryRaw`/`$executeRaw` in the API, and sort fields are allowlisted. Zod validates every request body, campaign updates can't mass-assign `status`/`org_id`, and React escapes email templates.
- **CORS (production):** a foreign origin, localhost or a LAN IP gets `403` on preflight; only listed app origins are reflected.
- **Rate limiting** is live in production (I verified 429s after the 30/min limit on a public endpoint).
- **Secrets:** a full git-history scan (all branches) found no server secrets. The only hits were test fixtures and Firebase client config. Firebase `AIza…` keys are public by design, so confirm they're restricted to the app package/bundle IDs in Google Cloud Console.
- **Payload:** `/api/users` returns 403 anonymously, drafts and versions aren't exposed, and the first-user registration is closed (`initialized: true`).
- **Timing-safe comparisons** for all secret/token checks. Sentry `sendDefaultPii` is off.

---

## Not covered (recommend before or soon after launch)

1. **Authenticated DAST / manual pentest.** This audit didn't create accounts or send mutating requests to production. Run OWASP ZAP or Burp against **staging** with one test account per role (ops admin, ops member, advertiser owner, advertiser member, driver) and replay cross-tenant requests.
2. **Account and dashboard config:** Clerk (MFA, session lifetime, sign-up allowlists, bot protection), Vercel (deployment protection on Preview, who has access, env var scoping), Neon (role privileges, IP allowlist, branch cleanup), Cloudinary, Resend (SPF/DKIM/DMARC), Upstash, Infisical access list, Expo/EAS tokens.
3. **iOS builds** and the store-release signing flow.
4. **Pesapal integration (not built yet).** When it lands: verify every IPN server-side via `GetTransactionStatus`, never trust the redirect callback, make payment handling idempotent on `OrderTrackingId`, and keep amounts server-computed.
5. **Data protection:** Kenya's Data Protection Act 2019. Driver National IDs and KRA PINs are sensitive personal data, so you need a retention policy, a deletion path, and ODPC registration if applicable.

## Suggested order

**Before launch:** C1, C2, M2 (frame-ancestors only), M3, M4, L1, L4. These are mostly one-line fixes. Then M1 and the M5 upgrades.
**First month:** L2 (BotID), L3, L5, L7, the staging DAST pass, and C3 before n8n is redeployed.
