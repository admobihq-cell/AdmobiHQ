# Command Palette Search (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A ⌘K command palette with a header search button in ops, customer-web and driver-web that finds pages, actions and permission-scoped records (case numbers, invoice/quote numbers, campaign IDs, payout and payment references, people, orgs).

**Architecture:** One shared palette shell in `packages/ui` (cmdk + Radix Dialog, BoardUI look). Each app passes its own static pages/actions and a `search(q)` function. Records come from three API endpoints — `/v1/ops/search`, `/v1/customer/search`, `/v1/driver/search` — that share one pure query parser from `@workspace/ops-contracts` and return the same `SearchGroup[]` shape.

**Tech Stack:** Next.js 16, React 19, Prisma (API), Clerk, TanStack Query, cmdk (new, in `packages/ui`), Radix Dialog, lucide, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-21-search-realtime-charts-design.md` (section "1. Command palette"). Phases 2 (live updates + toasts) and 3 (charts) get their own plans.

**Deviation from spec (decided while planning):** ops search lives in the API (`/v1/ops/search`, called through `@workspace/ops-api-client`) instead of an ops-app route with raw SQL. Reasons: the API already has the DB-backed route test harness, CORS and rate limiting, and ops-mobile can reuse the endpoint later. Task 1 updates the spec line.

## Global Constraints

- Branch: `feat/search-live-charts`, cut from `feat/billing-documents`. Stage files by path (another agent shares the worktree); never `git add -A`. Never stage the `apps/*/android/**` changes.
- No Co-Authored-By trailer and no "Generated with Claude Code" line (CLAUDE.md overrides session attribution).
- No new dependency other than `cmdk` in `packages/ui/package.json`. Do not run `npx boardui`.
- Search must never wake Neon on its own: requests only fire while the user types (debounce 200 ms, `q.trim().length >= 2` or the query parses as an ID). No polling, no prefetch on open.
- Every record group is gated by the same permission the matching list screen uses; a viewer with no record permissions still gets pages and actions.
- Max 5 hits per group; query string capped at 100 characters server-side; every `ILIKE` input escaped for `%`, `_`, `\`.
- Vitest: run commands from `C:/Users/...` with an uppercase drive letter (lowercase `c:\` breaks every test file).
- Docs (CLAUDE.md): document the palette and the three endpoints in `docs/` in this change. Run `graphify update .` after code changes.
- Accessibility: dialog has an `aria-label`, focus returns to the trigger on close, motion respects `prefers-reduced-motion`.

## Review Focus

1. **A numeric query that is also a name fragment** (`42` when a campaign is named "Q42 promo"): expect the exact-ID hit first, name matches after, with no duplicate rows. Test in Task 3.
2. **An ops viewer without a permission** (e.g. support-only staff typing a campaign ID): expect no campaign group at all, not an empty group or a 403. Test in Task 3.
3. **Cross-org leakage:** an advertiser searching another org's campaign ID or invoice number gets nothing. Test in Task 4.
4. **`%`, `_` or a backslash in the query** match literally and don't turn into wildcards. Test in Task 2 (`escapeLike`) and Task 3.
5. **Slow responses arriving out of order** (typing "inv" then "inv/2026"): the older response never replaces the newer. Handled in Task 6 with an `AbortController` per keystroke and verified by hand in Task 9.

---

### Task 1: Branch and spec addendum

**Files:**
- Modify: `docs/superpowers/specs/2026-11-21-search-realtime-charts-design.md` (the "Endpoints" line under section 1)
- Add: `docs/superpowers/plans/2026-11-21-command-palette-search.md` (this file)

- [ ] **Step 1:** Confirm `git status` shows no staged or modified tracked files other than `apps/*/android/**`, then run `git switch -c feat/search-live-charts`.
- [ ] **Step 2:** In the spec, change "ops — `apps/ops/app/api/search/route.ts` (direct SQL after `getOpsAccess`)" to "ops — `GET /v1/ops/search` in the API, via `@workspace/ops-api-client`".
- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-11-21-search-realtime-charts-design.md docs/superpowers/plans/2026-11-21-command-palette-search.md
git commit -m "docs: design and phase 1 plan for search, live updates and charts"
```

---

### Task 2: Search contracts and query parser

**Files:**
- Create: `packages/ops-contracts/src/search.ts`
- Modify: `packages/ops-contracts/src/index.ts` (re-export)
- Test: `packages/ops-contracts/src/search.test.ts`

**Interfaces:**
- Produces:

```ts
export type SearchHit = { id: string; title: string; subtitle?: string; href: string; badge?: string }
export type SearchGroup = { key: string; label: string; hits: SearchHit[] }
export type SearchResponseDto = { query: string; groups: SearchGroup[] }
export type ParsedSearch = {
  text: string                 // trimmed, max 100 chars
  numericId: number | null     // "#42" or "42" (1–9 digits)
  documentNumber: string | null // canonical "INV/2026/0001" | "QT/2026/0001"
  payoutReference: string | null // lower-cased "adm-payout-…"
  reference: string | null     // text when ≥ 6 chars and no whitespace, else null
}
export const SEARCH_MAX_QUERY = 100
export const SEARCH_GROUP_LIMIT = 5
export function parseSearchQuery(q: string): ParsedSearch
export function escapeLike(s: string): string
export function shouldSearch(q: string): boolean // trimmed length ≥ 2, or numericId/documentNumber present
```

- [ ] **Step 1: Write the failing tests**

```ts
describe("parseSearchQuery", () => {
  it("reads case-style ids", () => {
    expect(parseSearchQuery("#42").numericId).toBe(42)
    expect(parseSearchQuery(" 42 ").numericId).toBe(42)
    expect(parseSearchQuery("42a").numericId).toBeNull()
    expect(parseSearchQuery("1234567890").numericId).toBeNull()
  })
  it("canonicalises billing document numbers", () => {
    expect(parseSearchQuery("INV/2026/0001").documentNumber).toBe("INV/2026/0001")
    expect(parseSearchQuery("inv-2026-1").documentNumber).toBe("INV/2026/0001")
    expect(parseSearchQuery("qt 2026 12").documentNumber).toBe("QT/2026/0012")
    expect(parseSearchQuery("INV/2026").documentNumber).toBeNull()
  })
  it("spots payout references", () => {
    expect(parseSearchQuery("ADM-PAYOUT-7-202611").payoutReference).toBe("adm-payout-7-202611")
  })
  it("treats long single tokens as references", () => {
    expect(parseSearchQuery("T1234567").reference).toBe("T1234567")
    expect(parseSearchQuery("acme ltd").reference).toBeNull()
  })
  it("caps length", () => {
    expect(parseSearchQuery("x".repeat(300)).text).toHaveLength(100)
  })
})
describe("escapeLike", () => {
  it("escapes wildcards", () => expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\"))
})
describe("shouldSearch", () => {
  it("needs two chars or an id", () => {
    expect(shouldSearch("a")).toBe(false)
    expect(shouldSearch("7")).toBe(true)
    expect(shouldSearch("ac")).toBe(true)
  })
})
```

- [ ] **Step 2:** Run `cd "C:/Users/victo/Documents/GitHub/AdmobiHQ/packages/ops-contracts" && npx vitest run src/search.test.ts`. Expect FAIL (module not found).
- [ ] **Step 3:** Implement `search.ts`. Document regex: `/^(INV|QT)[\s/_-]*(\d{4})[\s/_-]*(\d{1,4})$/i` → `${PREFIX}/${year}/${seq.padStart(4,"0")}`. ID regex: `/^#?(\d{1,9})$/`.
- [ ] **Step 4:** Re-run the tests. Expect PASS. Run `npx tsc --noEmit` in the package and expect no errors.
- [ ] **Step 5: Commit**

```bash
git add packages/ops-contracts/src/search.ts packages/ops-contracts/src/search.test.ts packages/ops-contracts/src/index.ts
git commit -m "feat(contracts): search hit types and query parser"
```

---

### Task 3: `GET /v1/ops/search`

**Files:**
- Create: `apps/api/app/v1/ops/search/route.ts`
- Create: `apps/api/lib/search/ops-search.ts` (one function per group)
- Modify: `apps/api/lib/route-catalog.ts` (`NOTES["/v1/ops/search"] = "Search records the caller's permissions allow"`)
- Test: `apps/api/app/v1/ops/search/route.test.ts`

**Interfaces:**
- Consumes: `parseSearchQuery`, `escapeLike`, `SEARCH_GROUP_LIMIT`, `SearchResponseDto` (Task 2); `requireOpsAccess()` from `@/lib/api-utils` (returns `{ access: { role, permissions } }`); `checkRateLimit(req, "search", { limit: 60, windowSeconds: 60, identifier: userId })`.
- Produces: `GET /v1/ops/search?q=` → `SearchResponseDto`. Groups only appear when they have hits. Group order and gate (admin sees all):

| key | label | permission | matches | href |
|---|---|---|---|---|
| `sos` | SOS incidents | safety | id; driver_name, driver_phone | `/sos/{id}` |
| `support` | Support cases | support | id; subject, contact_name, contact_email | `/support/{id}` |
| `campaigns` | Campaigns | campaigns | id; name; org name | `/campaigns/{id}` |
| `documents` | Invoices & quotes | finances | documentNumber exact; number ILIKE; recipient name | `/finances/documents/{id}` |
| `invoices` | Statements | finances | `Invoice.number` ILIKE | `/finances?tab=ledger` |
| `payments` | Payments | finances | `Payment.reference` / `Refund.reference` = reference | `/finances?tab=ledger` |
| `payouts` | Payouts | finances or payouts | id; payoutReference; driver name | `/finances?tab=payouts` |
| `orgs` | Advertiser orgs | campaigns | id; name | `/advertiser-orgs/{id}` |
| `applications` | Driver applications | driver_applications | id; full_name, phone | `/driver-applications/{id}` |
| `drivers` | Drivers | drivers | name, phone, email | `/drivers` |
| `fleet` | Fleet partners | fleet | company_name, primary_contact_name | `/fleet` |
| `leads` | Campaign leads | leads | company_name, contact_name, email | `/leads` |
| `waitlist` | Waitlist | waitlist | email | `/waitlist` |
| `mediaKit` | Media kit | media_kit | name, email | `/media-kit` |

  Each hit has `id: "<key>:<row id>"`, a `subtitle` of the two or three most useful fields joined by " · " (status, org, amount), and `badge` set to `"#<id>"` for id-addressable rows. Exact numericId/document matches sort first within a group; the result set is de-duplicated by `id`.

- [ ] **Step 1: Write the failing tests** (pattern: `apps/api/app/v1/driver/payouts/route.test.ts`; mock `requireOpsAccess` to return `{ access: { userId, role, permissions } }` from a mutable variable; seed tagged rows, clean up in `afterAll`):
  - `"finds a support case by #id first, then by subject"`: seed a case with subject containing its own id digits, plus another case with those digits in its subject → `groups.find(g => g.key === "support").hits[0].href === "/support/<id>"`, no duplicate ids.
  - `"hides groups the role cannot see"`: role `"support"` with permissions `["support"]`, query = a seeded campaign id → no `campaigns` group in the response.
  - `"canonicalises document numbers"`: seed a BillingDocument `INV/2099/0007` → query `inv-2099-7` returns it in `documents`.
  - `"treats % literally"`: seed leads named `50% off` and `500 off` → query `50%` returns only the first.
  - `"rejects a blank query"`: `q=" "` → 200 with `groups: []`.
- [ ] **Step 2:** Run `cd "C:/Users/victo/Documents/GitHub/AdmobiHQ/apps/api" && npx vitest run app/v1/ops/search`. Expect FAIL.
- [ ] **Step 3:** Implement. Use Prisma `findMany` with `contains` + `mode: "insensitive"` (Prisma escapes wildcards for `contains`; use `escapeLike` only in any `$queryRaw`). Run the visible groups with `Promise.all`. Return 200 `{ query, groups: [] }` when `!shouldSearch(q)`.
- [ ] **Step 4:** Re-run the tests and `npx vitest run lib/route-catalog.test.ts`. Expect PASS.
- [ ] **Step 5: Commit**

```bash
git add apps/api/app/v1/ops/search apps/api/lib/search/ops-search.ts apps/api/lib/route-catalog.ts
git commit -m "feat(api): permission-scoped ops search endpoint"
```

---

### Task 4: `GET /v1/customer/search` and `GET /v1/driver/search`

**Files:**
- Create: `apps/api/app/v1/customer/search/route.ts`, `apps/api/app/v1/driver/search/route.ts`
- Create: `apps/api/lib/search/customer-search.ts`, `apps/api/lib/search/driver-search.ts`
- Modify: `apps/api/lib/route-catalog.ts` (two notes)
- Test: `apps/api/app/v1/customer/search/route.test.ts`, `apps/api/app/v1/driver/search/route.test.ts`

**Interfaces:**
- Consumes: Task 2; `requireCustomerAccess()` → `{ access: { userId, orgId, isOwner, permissions: Set<AdvertiserPermission> } }`; `requireDriverAccess()` → `{ access: { userId } }`; `checkRateLimit` as in Task 3.
- Produces: both return `SearchResponseDto`. Customer groups (every query filtered by `org_id = access.orgId`; owners pass every gate):

| key | label | permission | matches | href |
|---|---|---|---|---|
| `campaigns` | Campaigns | campaigns:read | id; name | `/campaigns/{id}` |
| `documents` | Invoices & quotes | billing:read | documentNumber; number ILIKE (sent/paid only: whatever the customer list endpoint `/v1/customer/finance/documents` shows) | `/billing?tab=invoices` |
| `invoices` | Statements | billing:read | `Invoice.number` | `/billing?tab=invoices` |
| `payments` | Payments | billing:read | `Payment.reference`, `WalletTransaction.reference` = reference | `/billing?tab=transactions` |
| `support` | Support cases | support:read_all | id; subject | `/settings/support/{id}` |
| `media` | Media | media:read | file name/title | `/media` |
| `team` | Team | team:manage | member name/email | `/settings/team` |

  Driver groups (every query filtered by the caller's `clerk_user_id`):

| key | label | matches | href |
|---|---|---|---|
| `payouts` | Payouts | id; reference; period "2026-11" | `/payouts` |
| `support` | Support cases | id; subject (`driver_clerk_user_id`) | `/settings/support/{id}` |
| `sos` | SOS reports | id; type | `/sos/{id}` |
| `documents` | Documents | document type/name | `/settings/profile` |
| `notifications` | Notifications | title | `/notifications` |

- [ ] **Step 1: Write the failing tests:**
  - customer `"never returns another org's rows"`: seed campaigns and a BillingDocument for orgs A and B; the caller is in A; query B's campaign id and B's document number → no hits.
  - customer `"drops billing groups without billing:read"`: caller with `permissions = new Set(["campaigns:read"])`, `isOwner: false` → no `documents`/`invoices`/`payments` group.
  - customer `"only shows documents the customer list shows"`: a draft document for org A is not returned.
  - driver `"returns only the caller's payouts and cases"`: seed two profiles (pattern from the driver payouts test) → the other driver's payout id returns nothing.
- [ ] **Step 2:** Run `npx vitest run app/v1/customer/search app/v1/driver/search`. Expect FAIL.
- [ ] **Step 3:** Implement. Reuse the document-visibility filter the existing customer documents route uses (import it, don't copy it; extract it into `apps/api/lib/billing/` first if it's inline).
- [ ] **Step 4:** Re-run the tests plus `lib/route-catalog.test.ts`. Expect PASS.
- [ ] **Step 5: Commit**

```bash
git add apps/api/app/v1/customer/search apps/api/app/v1/driver/search apps/api/lib/search apps/api/lib/route-catalog.ts apps/api/lib/billing
git commit -m "feat(api): org-scoped customer search and driver search endpoints"
```

---

### Task 5: Client methods

**Files:**
- Modify: `packages/ops-api-client/src/index.ts` (add `search: { query(q: string, signal?: AbortSignal): Promise<SearchResponseDto> }` to `OpsClient`, calling `${apiPrefix}/ops/search?q=`)
- Create: `apps/customer-web/lib/search-client.ts`, `apps/driver-web/lib/search-client.ts`, each exporting `searchRecords(getToken: GetToken, q: string, signal?: AbortSignal): Promise<SearchResponseDto>`. Follow the `authedFetch` pattern in `apps/customer-web/lib/customer-notifications-client.ts`, but pass the caller's `signal` instead of the 8 s timeout.
- Test: if `packages/ops-contracts` or `ops-api-client` has a client-method coverage test, extend it. Otherwise this task is covered by typecheck.

- [ ] **Step 1:** Implement all three.
- [ ] **Step 2:** Run `npm run typecheck` from the repo root. Expect no errors in the touched packages.
- [ ] **Step 3: Commit**

```bash
git add packages/ops-api-client/src/index.ts apps/customer-web/lib/search-client.ts apps/driver-web/lib/search-client.ts
git commit -m "feat: search client methods for ops, customer and driver"
```

---

### Task 6: Shared palette shell in `packages/ui`

**Files:**
- Modify: `packages/ui/package.json` (add `"cmdk": "^1.1.1"`, then `npm install` from the root; commit the lockfile)
- Create: `packages/ui/src/components/command-palette.tsx`
- Modify: `packages/ui/package.json` `exports` (add `"./components/command-palette"`)

**Interfaces:**
- Consumes: `SearchGroup`, `shouldSearch` (Task 2); `Dialog` primitives from `@workspace/ui/components/dialog`.
- Produces:

```ts
export type PaletteItem = {
  id: string; label: string; description?: string; icon?: LucideIcon
  href?: string; onRun?: () => void; keywords?: string[]; shortcut?: string
}
export function CommandPalette(props: {
  pages: PaletteItem[]           // already permission/flag filtered by the app
  actions: PaletteItem[]
  search?: (q: string, signal: AbortSignal) => Promise<SearchGroup[]>
  storageKey: string             // e.g. "ops-palette-recent-v1"
  placeholder?: string           // default "Search pages, records and actions…"
}): JSX.Element                  // renders the header trigger button and the dialog
```

  Behaviour:
  - Trigger: `variant="outline"` button, `Search` icon, "Search…" text and `⌘K` kbd (Ctrl K off macOS); icon-only below `sm`. Global keydown for ⌘K/Ctrl+K toggles it; ignore it while focus is in a contenteditable element.
  - Dialog: `Command` with `shouldFilter` on for pages and actions. Remote groups render with `forceMount` and their own `value`s, so cmdk's filter doesn't hide server hits.
  - Remote search: 200 ms debounce; `AbortController` per request, aborting the previous one; a loading row while pending; errors render one muted "Search is unavailable right now" row and never throw.
  - Group order: Recent (when the query is empty, last 8 picks from localStorage under `storageKey`, wrapped in try/catch), Pages, Actions, then the server groups in their response order.
  - On select: push to recents (dedupe by id), close, then `router.push(href)` or `onRun()`.
  - Look (BoardUI): `max-w-xl` panel, `rounded-xl`, `shadow-2xl`, backdrop `bg-background/40 backdrop-blur-sm`. Enter animation: opacity 0→1, scale 0.98→1, blur 4px→0 over 160 ms ease-out, with no transform under `motion-reduce`. Items are `rounded-lg px-3 py-2` with `data-[selected=true]:bg-accent`, an icon in a `size-7 rounded-md bg-muted` tile, a description in `text-muted-foreground text-xs` and a right-aligned badge or kbd. Footer: `↑↓ to navigate · ↵ to open · esc to close` in `text-xs` with `<kbd>` chips.

- [ ] **Step 1:** Add the dependency and implement the component.
- [ ] **Step 2:** Run `npm run typecheck -w @workspace/ui` and `npm run lint -w @workspace/ui`. Expect both clean.
- [ ] **Step 3: Commit**

```bash
git add packages/ui/package.json packages/ui/src/components/command-palette.tsx package-lock.json
git commit -m "feat(ui): command palette shell on cmdk"
```

---

### Task 7: Ops palette

**Files:**
- Create: `apps/ops/lib/navigation.ts`. Move `dashboardNavItems`, `navItems`, `secondaryItems`, `hiddenNavItems`, `NavItem` and `isNavItemActive` out of `apps/ops/components/shell/ops-shell.tsx` unchanged, plus `canSeeNavItem(item, role, permissions)`.
- Create: `apps/ops/components/shell/ops-command-palette.tsx`
- Modify: `apps/ops/components/shell/ops-shell.tsx` (import from `lib/navigation`; mount `<OpsCommandPalette role permissions />` as the first item in the header's `ml-auto` group)

**Interfaces:**
- Consumes: `CommandPalette`, `PaletteItem` (Task 6); `useOpsClient().search.query` (Task 5).
- Produces: `OpsCommandPalette({ role, permissions })`.
  - Pages: every visible nav item, plus the finance tabs (`/finances?tab=<value>` from `FINANCE_TABS` in `apps/ops/components/finances/finance-view.tsx`; move that constant to `apps/ops/lib/navigation.ts` if importing it would pull server code into a client component) and the settings tabs (`/settings/flags`, `/settings/integrations`, `/settings/tour`). Each is gated like its parent.
  - Actions, each gated: "New invoice or quote" → `/finances/documents/new` (finances); "New payout run" → `/finances?tab=payouts` (payouts); "Record a transaction" → `/finances?tab=ledger` (finances); "New announcement" → `/announcements` (announcements); "Switch theme" → `onRun` toggling `next-themes` `setTheme`.
  - `storageKey: "ops-palette-recent-v1"`.

- [ ] **Step 1:** Do the move-only refactor of the nav constants. Run `npm run typecheck -w ops`, expect it clean, and confirm the sidebar is unchanged in the browser.
- [ ] **Step 2:** Implement the palette and mount it.
- [ ] **Step 3:** Run `npm run typecheck -w ops && npm run lint -w ops`. Expect both clean.
- [ ] **Step 4: Commit**

```bash
git add apps/ops/lib/navigation.ts apps/ops/components/shell/ops-shell.tsx apps/ops/components/shell/ops-command-palette.tsx
git commit -m "feat(ops): command palette in the header"
```

---

### Task 8: Customer and driver palettes

**Files:**
- Create: `apps/customer-web/components/shell/customer-command-palette.tsx`, `apps/driver-web/components/shell/driver-command-palette.tsx`
- Modify: `apps/customer-web/components/shell/app-shell.tsx`, `apps/driver-web/components/shell/app-shell.tsx` (mount before `NotificationBell`)

**Interfaces:**
- Consumes: `CommandPalette` (Task 6); `searchRecords` (Task 5); `visibleNavItems(flags)` from each app's `lib/navigation.ts`; settings links from each app's `lib/settings-navigation.ts`; `useOrgPermissions().can` (customer).
- Produces:
  - Customer pages: visible nav items, settings pages, billing tabs (`/billing?tab=overview|transactions|invoices|statements`, needs `billing:read`) and report tabs. Actions: "New campaign" → `/campaigns/new` (campaigns:write); "Top up funds" → `/billing?topup=` (billing:write; the existing `?topup` param opens the dialog); "Upload media" → `/media` (media:write); "Contact support" → `/settings/support/new`. `storageKey: "customer-palette-recent-v1"`. Accepts `enabledFlags: string[]` from `AppShell`.
  - Driver pages: visible nav items and settings pages. Actions: "Report an emergency (SOS)" → `/sos`; "Contact support" → `/settings/support/new`; "View payouts" → `/payouts`. `storageKey: "driver-palette-recent-v1"`.

- [ ] **Step 1:** Implement both and mount them.
- [ ] **Step 2:** Run `npm run typecheck -w customer-web -w driver-web && npm run lint -w customer-web -w driver-web`. Expect both clean.
- [ ] **Step 3: Commit**

```bash
git add apps/customer-web/components/shell apps/driver-web/components/shell
git commit -m "feat(customer-web, driver-web): command palette in the header"
```

---

### Task 9: Verify in the browser, document, refresh the graph

**Files:**
- Modify: `docs/ops/OPS-ADMIN.md` (a "Search (⌘K)" section: what it finds, the permission gating, ID formats)
- Modify: `docs/customer/` main guide (closest existing doc; same section for advertisers)
- Modify: `docs/driver/` main guide (same section for drivers)
- Modify: `docs/api/API.md` (the three endpoints: query param, response shape, gating, rate limit)

- [ ] **Step 1:** Run `npm run dev`. In each app, check:
  - ⌘K and the button both open the palette.
  - Esc closes it and focus returns to the trigger.
  - Typing `#<real case id>`, a real `INV/…` number and a campaign id each lands on the right page.
  - In the network tab, typing "inv" then "inv/2026" quickly cancels the first request and shows only the second's results.
  - A support-only ops role sees no finance groups.
  - Reduced motion has no scale or blur animation.
  - Light and dark themes both read well.
- [ ] **Step 2:** Write the four doc sections.
- [ ] **Step 3:** Run `npm test -w api -w @workspace/ops-contracts` (uppercase drive cwd). Expect PASS. Then run `graphify update .`.
- [ ] **Step 4: Commit**

```bash
git add docs/ops/OPS-ADMIN.md docs/customer docs/driver docs/api/API.md
git commit -m "docs: command palette search for ops, customers, drivers and API"
```
