# PDF Generation (Ops Export) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real, working "Export PDF" option next to the existing "Export CSV" option on every ops list page, and prove the PDF renderer (`takumi-pdf`) works in this stack before building anything else on top of it.

**Architecture:** PDF rendering lives entirely in `apps/api`, mirroring how `lib/email` already renders React components to HTML for Resend — a `lib/pdf/render-pdf.ts` wrapper around `takumi-pdf`, primitive components, and one generic `EntityExportPdf` template. `apps/ops` sends the same row data it already builds for CSV export to a new API route and downloads the PDF bytes back, via a new `documents.exportPdf` method on the shared `@workspace/ops-api-client`.

**Tech Stack:** Next.js 16 route handler (`apps/api`), `takumi-pdf` (WASM, no headless browser), React 19, Zod, vitest (already configured in `apps/api`).

**Spec:** `docs/superpowers/specs/2026-09-04-pdf-generation-design.md`

## Global Constraints

- Renderer is `takumi-pdf`, gated on Task 1's spike. If Task 1 fails to
  produce a valid PDF, stop and swap in `@react-pdf/renderer` before
  continuing — only `render-pdf.ts`'s internals change, no other task's
  code changes.
- No new `packages/pdf` workspace package. Everything lives in
  `apps/api/lib/pdf/`, importable only from within `apps/api` — exactly
  how `apps/api/lib/email/` already works. `apps/ops` never imports these
  components directly; it only calls the API.
- PDF export reuses each `ColumnDef<T>`'s existing `csv` accessor for cell
  text — no new per-entity `pdf` accessor, no entity view file changes.
  This is what makes the feature land on all five entity pages (leads,
  fleet, drivers, waitlist, media kit) from one change to `entity-page.tsx`.
- PDF export matches CSV export's existing scope exactly: the rows already
  fetched into the table (current page, or the checked selection) — not
  the full dataset. Do not add a "export everything" path.
- The new API route receives rows in its request body (it does not query
  them) but must still call `requireOpsPermissionAccess` for the claimed
  entity before rendering — same permission model every other `/v1/*` ops
  route already uses.
- UI: the existing "Export CSV" toolbar button and "Export selected" bulk
  button both become `DropdownMenu` triggers with "Export as CSV" /
  "Export as PDF" items, mirroring the "Set status" dropdown already in
  `entity-page.tsx` (same imported components, same visual pattern).
- The spec's font-licensing risk (embedding a real brand font requires the
  actual font file) does not need resolving in this plan: the ops
  document shell (Task 2) deliberately uses the renderer's default font
  and no logo image, since this is an internal export, not a
  customer-facing document. Revisit both when the deferred customer
  invoice/report are built.

---

## Task 1: Renderer spike — `takumi-pdf` go/no-go

**Files:**
- Modify: `apps/api/package.json` (add `takumi-pdf` dependency)
- Modify: `apps/api/vitest.config.ts` (enable JSX transform — see Step 2)
- Modify: `apps/api/next.config.mjs` (externalize `takumi-pdf` — see Step 6)
- Create: `apps/api/lib/pdf/render-pdf.ts`
- Create: `apps/api/lib/pdf/render-pdf.test.tsx`
- Create: `apps/api/app/v1/spike-pdf-test/route.tsx` (throwaway — deleted in
  Task 7; **not** `_spike/...` — Next's App Router treats any path segment
  starting with `_` as a private folder excluded from routing entirely,
  which silently 404s the whole route)

**Interfaces:**
- Produces: `renderPdf(element: ReactElement, options?: RenderOptions): Promise<Uint8Array>` — every later task's PDF rendering goes through this one function. If Task 1's go/no-go fails and falls back to `@react-pdf/renderer`, this signature must be preserved so no other task changes.

`takumi-pdf`'s exact API surface (confirmed real npm package, `takumi-pdf@0.14.1`, React `^18||^19` peer dep, WASM-based, has a dedicated Next.js bundler export) is not something this plan can verify with full certainty ahead of time — that verification **is** this task. The code below is the best-documented real usage found; **Step 1 below has you confirm it against the installed package before relying on it.**

- [x] **Step 1: Install the package and confirm its real API**

```bash
cd apps/api
npm install takumi-pdf
```

Then open `node_modules/takumi-pdf/README.md` (or the closest `.md` docs
file in that package) and `node_modules/takumi-pdf/dist/export.d.mts`, and
confirm:
- The main export is a `render(element, options)` function returning
  `Promise<Uint8Array>` (this plan assumes so below).
- Whether JSX elements style via a `tw="..."` Tailwind-string prop (as in
  the README example below) or via plain `style={}` objects.
- Whether importing from `"takumi-pdf"` directly works in a Next.js route,
  or whether `"takumi-pdf/next"` is required instead (the package ships a
  dedicated `next` export condition — check `package.json`'s `exports`
  field in the installed package).

If any of these differ from the assumptions below, adjust Steps 3-4
accordingly — the rest of this plan only depends on `renderPdf`'s
signature, not on Takumi's own API shape.

Confirmed against the real installed package (`takumi-pdf@0.14.1`):
`render(element, options): Promise<Uint8Array>` is correct, `tw="..."`
and plain `style={}` both work, and no `"takumi-pdf/next"` import is
needed — plain `"takumi-pdf"` resolves correctly under Next's bundler.
`takumi-pdf` does **not** fetch remote images itself (pass pre-fetched
bytes via the `images` option) — irrelevant here since the ops document
shell (Task 2) uses no images.

- [x] **Step 2: Enable Vitest's JSX transform for this app**

Every test in this app so far has been plain `.ts` with no JSX
(`lib/validation/lead-schemas.test.ts`). This task's tests render JSX
directly, and `apps/api`'s tsconfig sets `"jsx": "preserve"` (correct for
Next's own compiler, which transforms JSX in the real app) — that gives
Vitest's underlying esbuild no signal to use React's automatic JSX
runtime, and running a JSX test as-is fails with `ReferenceError: React
is not defined`. Fix once, here, rather than per test file:

```ts
// apps/api/vitest.config.ts
import { mergeConfig } from "vitest/config"

import shared from "@workspace/vitest-config/node"

export default mergeConfig(shared, {
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    include: ["lib/**/*.{test,spec}.{ts,tsx}"],
  },
})
```

- [x] **Step 3: Write the failing test**

```tsx
// apps/api/lib/pdf/render-pdf.test.tsx
import { describe, expect, it } from "vitest"

import { renderPdf } from "./render-pdf"

describe("renderPdf", () => {
  it("renders a minimal element to non-empty PDF bytes", async () => {
    const bytes = await renderPdf(
      <div tw="flex p-4 text-[12px]" style={{ color: "#b45309" }}>
        Admobi PDF spike
      </div>,
    )

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)

    // Every valid PDF file starts with this literal magic header.
    const header = Buffer.from(bytes.slice(0, 5)).toString("ascii")
    expect(header).toBe("%PDF-")
  })
})
```

- [x] **Step 4: Run the test to verify it fails**

```bash
cd apps/api
npx vitest run lib/pdf/render-pdf.test.tsx
```

Expected: FAIL — `render-pdf.ts` doesn't exist yet.

- [x] **Step 5: Write the implementation**

```ts
// apps/api/lib/pdf/render-pdf.ts
import { render, type RenderOptions } from "takumi-pdf"
import type { ReactElement } from "react"

/** Renders a JSX element tree to PDF bytes via Takumi (no headless
 * browser). Mirrors lib/email/render-template.ts's shape — the one seam
 * that changes if Takumi turns out not to work (see Task 1's go/no-go). */
export async function renderPdf(
  element: ReactElement,
  options: RenderOptions = { size: "a4" },
): Promise<Uint8Array> {
  try {
    return await render(element, options)
  } catch (error) {
    console.error("[PDF] Failed to render document:", error)
    throw error
  }
}
```

If Step 1 found the import path or options shape differs, adjust the
`import` line and the `options` default here — nothing else in this file
should need to change.

- [x] **Step 6: Run the test to verify it passes**

```bash
cd apps/api
npx vitest run lib/pdf/render-pdf.test.tsx
```

Expected: PASS.

**If it fails here and you can't get it passing after checking Step 1's
docs:** this is the go/no-go gate. Stop, and replace `takumi-pdf` with
`@react-pdf/renderer` inside `render-pdf.ts` only (its `renderToBuffer()`
API also returns a `Buffer`, compatible with this function's
`Promise<Uint8Array>` signature), then re-run this test before continuing
to Task 2.

- [x] **Step 7: Add the throwaway route and verify it end-to-end through Next.js**

```tsx
// apps/api/app/v1/spike-pdf-test/route.tsx
import { renderPdf } from "@/lib/pdf/render-pdf"

export async function GET() {
  const bytes = await renderPdf(
    <div tw="flex flex-col p-8 text-[14px]">
      <span tw="font-semibold" style={{ color: "#b45309" }}>Admobi</span>
      <span>PDF spike — if you can read this in a PDF viewer, Takumi works.</span>
    </div>,
  )
  // Buffer.from(), not the raw Uint8Array: TypeScript 5.9's generic
  // Uint8Array<ArrayBufferLike> isn't structurally assignable to BodyInit
  // in this lib config — a real typecheck error, not a hypothetical.
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: { "Content-Type": "application/pdf" },
  })
}
```

This will 500 as-is with `TypeError: The "path" argument must be of type
string or an instance of Buffer or URL. Received an instance of URL` —
`takumi-pdf` loads its WASM asset via a Node-native path, and letting
webpack bundle/rewrite that reference breaks it. Add it to
`serverExternalPackages` first so Node requires it directly at runtime
instead of webpack processing it:

```js
// apps/api/next.config.mjs — add alongside the existing nextConfig keys
  serverExternalPackages: ["takumi-pdf"],
```

Then run `apps/api`'s dev server (restart it if it was already running —
`next.config.mjs` changes need a restart, unlike route file edits) and
fetch the route:

```bash
cd apps/api
npm run dev
# in another terminal, once it's up:
curl -s http://localhost:3003/v1/spike-pdf-test -o /tmp/spike.pdf
```

Open `/tmp/spike.pdf` in a real PDF viewer and confirm: it opens without
error, the text is legible, and the color renders as the amber brand
color, not black. (Check `apps/api`'s dev port in `apps/api/package.json`
if `3003` isn't right.)

- [x] **Step 8: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/vitest.config.ts apps/api/next.config.mjs apps/api/lib/pdf/render-pdf.ts apps/api/lib/pdf/render-pdf.test.tsx apps/api/app/v1/spike-pdf-test/route.tsx
git commit -m "spike: verify takumi-pdf renders in apps/api"
```

---

## Task 2: `lib/pdf` foundation primitives

**Files:**
- Create: `apps/api/lib/pdf/primitives/document-shell.tsx`
- Create: `apps/api/lib/pdf/primitives/data-table.tsx`
- Create: `apps/api/lib/pdf/primitives/primitives.test.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 directly (no import from `render-pdf.ts`) — these are pure presentational components, testable by rendering them into a real PDF and checking the bytes are non-empty, same as Task 1.
- Produces: `DocumentShell({ title, subtitle?, children }): ReactElement` and `DataTable({ headers, rows }): ReactElement` — Task 3's `EntityExportPdf` composes both.

- [x] **Step 1: Write the failing test**

```tsx
// apps/api/lib/pdf/primitives/primitives.test.tsx
import { describe, expect, it } from "vitest"

import { renderPdf } from "../render-pdf"
import { DataTable } from "./data-table"
import { DocumentShell } from "./document-shell"

describe("pdf primitives", () => {
  it("DocumentShell + DataTable render together to non-empty PDF bytes", async () => {
    const bytes = await renderPdf(
      <DocumentShell title="Test export" subtitle="2 records">
        <DataTable
          headers={["Name", "City"]}
          rows={[
            ["Amina", "Nairobi"],
            ["Otieno", "Mombasa"],
          ]}
        />
      </DocumentShell>,
    )

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd apps/api
npx vitest run lib/pdf/primitives/primitives.test.tsx
```

Expected: FAIL — neither primitive file exists yet.

- [x] **Step 3: Write `document-shell.tsx`**

```tsx
// apps/api/lib/pdf/primitives/document-shell.tsx
import type { ReactElement, ReactNode } from "react"

/** Approximate sRGB match for this project's --primary token
 * (oklch(0.48 0.14 43)) — PDF rendering needs a literal color, not a CSS
 * variable, so this is duplicated here rather than shared with the web
 * app's token file. */
const BRAND_COLOR = "#b45309"

/** Page frame every generated document shares: wordmark, title, optional
 * subtitle, and a footer. No logo image — Takumi doesn't fetch remote
 * images itself (pre-fetched bytes only, confirmed in Task 1), and an
 * ops export doesn't need branding polish; revisit when a customer-facing
 * document needs it. */
export function DocumentShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}): ReactElement {
  return (
    <div tw="flex flex-col w-full h-full p-10 text-[11px] text-gray-800">
      <div tw="flex flex-col border-b pb-4 mb-6" style={{ borderColor: BRAND_COLOR }}>
        <span tw="text-sm font-semibold" style={{ color: BRAND_COLOR }}>
          Admobi
        </span>
        <span tw="text-xl font-semibold mt-1">{title}</span>
        {subtitle ? <span tw="text-xs text-gray-500 mt-1">{subtitle}</span> : null}
      </div>
      <div tw="flex-1">{children}</div>
      <div tw="flex justify-between border-t pt-3 mt-6 text-[9px] text-gray-400">
        <span>Admobi · admobihq.com</span>
        <span>Confidential — internal use only</span>
      </div>
    </div>
  )
}
```

- [x] **Step 4: Write `data-table.tsx`**

Uses real `<table>`/`<thead>`/`<tbody>` markup rather than flex divs —
Takumi's README (confirmed in Task 1) documents that a `<thead>` repeats
at the top of every page a table continues onto, and column x-positions
stay aligned across pages. Ops exports can run to hundreds of rows (the
API schema caps at 500), so multi-page overflow is a real case, not an
edge case — a flex-div table would lose its header on page 2 onward.

```tsx
// apps/api/lib/pdf/primitives/data-table.tsx
import type { ReactElement } from "react"

/** Generic header-row + data-rows table. Every cell is a plain string —
 * callers format numbers/dates/labels before passing them in, the same
 * way apps/ops/lib/format.ts's toCsv() expects pre-formatted cell text. */
export function DataTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}): ReactElement {
  return (
    <table tw="w-full border border-gray-200 text-[10px]" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr tw="bg-gray-100">
          {headers.map((header, i) => (
            <th key={i} tw="p-2 text-left font-semibold text-gray-700 border-b border-gray-200">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} tw={i % 2 === 1 ? "bg-gray-50" : ""}>
            {row.map((cell, j) => (
              <td key={j} tw="p-2 text-gray-800 border-b border-gray-100">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [x] **Step 5: Run test to verify it passes**

```bash
cd apps/api
npx vitest run lib/pdf/primitives/primitives.test.tsx
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add apps/api/lib/pdf/primitives/
git commit -m "feat: add PDF document-shell and data-table primitives"
```

---

## Task 3: `EntityExportPdf` template

**Files:**
- Create: `apps/api/lib/pdf/templates/entity-export-pdf.tsx`
- Create: `apps/api/lib/pdf/templates/entity-export-pdf.test.tsx`

**Interfaces:**
- Consumes: `DocumentShell`, `DataTable` (Task 2).
- Produces: `EntityExportPdf({ title, headers, rows, generatedAt }): ReactElement` — Task 4's route renders exactly this component with the request body's data.

- [x] **Step 1: Write the failing test**

```tsx
// apps/api/lib/pdf/templates/entity-export-pdf.test.tsx
import { describe, expect, it } from "vitest"

import { renderPdf } from "../render-pdf"
import { EntityExportPdf } from "./entity-export-pdf"

describe("EntityExportPdf", () => {
  it("renders a titled table export to non-empty PDF bytes", async () => {
    const bytes = await renderPdf(
      <EntityExportPdf
        title="Drivers"
        headers={["Name", "City", "Status"]}
        rows={[
          ["Amina Wanjiru", "Nairobi", "active"],
          ["Otieno Odhiambo", "Mombasa", "pending"],
        ]}
        generatedAt="4 Sep 2026"
      />,
    )

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(0)
  })

  it("renders correctly with zero rows", async () => {
    const bytes = await renderPdf(
      <EntityExportPdf title="Drivers" headers={["Name"]} rows={[]} generatedAt="4 Sep 2026" />,
    )
    expect(bytes.length).toBeGreaterThan(0)
  })
})
```

- [x] **Step 2: Run test to verify it fails**

```bash
cd apps/api
npx vitest run lib/pdf/templates/entity-export-pdf.test.tsx
```

Expected: FAIL — the template file doesn't exist yet.

- [x] **Step 3: Write the implementation**

```tsx
// apps/api/lib/pdf/templates/entity-export-pdf.tsx
import type { ReactElement } from "react"

import { DataTable } from "../primitives/data-table"
import { DocumentShell } from "../primitives/document-shell"

export type EntityExportPdfProps = {
  title: string
  headers: string[]
  rows: string[][]
  generatedAt: string
}

export function EntityExportPdf({
  title,
  headers,
  rows,
  generatedAt,
}: EntityExportPdfProps): ReactElement {
  const recordCount = `${rows.length} record${rows.length === 1 ? "" : "s"}`
  return (
    <DocumentShell title={title} subtitle={`${recordCount} · generated ${generatedAt}`}>
      <DataTable headers={headers} rows={rows} />
    </DocumentShell>
  )
}
```

- [x] **Step 4: Run test to verify it passes**

```bash
cd apps/api
npx vitest run lib/pdf/templates/entity-export-pdf.test.tsx
```

Expected: PASS (both tests).

- [x] **Step 5: Commit**

```bash
git add apps/api/lib/pdf/templates/
git commit -m "feat: add EntityExportPdf template"
```

---

## Task 4: API route — `POST /v1/ops/documents/export`

**Files:**
- Modify: `packages/ops-contracts/src/schemas.ts` (add
  `documentExportRequestSchema` — **not** `apps/api/lib/validation/schemas.ts`,
  which turns out to be a pure barrel: `export * from
  "@workspace/ops-contracts/schemas"`, no local definitions of its own.
  Every other request schema, e.g. `driverCreateSchema`, actually lives in
  `packages/ops-contracts/src/schemas.ts` and flows through that
  re-export — this one does too.)
- Modify: `apps/api/vitest.config.ts` (widen `include` — see Step 1)
- Create: `apps/api/app/v1/ops/documents/export/route.tsx`
- Create: `apps/api/app/v1/ops/documents/export/route.test.ts`

**Interfaces:**
- Consumes: `renderPdf` (Task 1), `EntityExportPdf` (Task 3), `requireOpsPermissionAccess`/`jsonError`/`parseJsonBody` (`@/lib/api-utils`, pre-existing), `OPS_PERMISSIONS` (`@workspace/ops-contracts`, pre-existing).
- Produces: `documentExportRequestSchema: ZodSchema<{ entity: OpsPermission; title: string; headers: string[]; rows: string[][] }>`, and the route itself at `POST /v1/ops/documents/export`, which Task 5's client method calls.

- [x] **Step 1: Widen the vitest include glob and resolve the `@/` alias**

`apps/api/vitest.config.ts` (already modified once in Task 1, to add the
`esbuild.jsx` options) still only discovers tests under `lib/**` — every
existing test in this app lives there, so route handlers have never had
a test of their own. Widen the `include` glob or Step 3's test will
silently never run.

Separately, and for the same underlying reason: every existing test file
in this app uses relative imports only (`lead-schemas.test.ts` imports
`from "./lead-schemas"`, never `@/lib/...`) — because the `@/*` → `./*`
alias in `apps/api/tsconfig.json` is understood by Next's own bundler,
not by Vitest's. The route in Step 5 imports `@/lib/api-utils`,
`@/lib/pdf/render-pdf`, etc. (matching every other route in this app,
e.g. `apps/api/app/v1/drivers/route.ts`), so without a matching
`resolve.alias`, Vitest fails with `Cannot find package '@/lib/api-utils'`
the moment it tries to load the route module — not a hypothetical, this
is what actually happens if you skip this step. Fix both in one edit:

```ts
// apps/api/vitest.config.ts
import path from "node:path"
import { fileURLToPath } from "node:url"
import { mergeConfig } from "vitest/config"

import shared from "@workspace/vitest-config/node"

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(shared, {
  resolve: {
    alias: {
      "@": dirname,
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    include: [
      "lib/**/*.{test,spec}.{ts,tsx}",
      "app/**/*.{test,spec}.{ts,tsx}",
    ],
  },
})
```

- [x] **Step 2: Add the request schema**

Open `packages/ops-contracts/src/schemas.ts`. Add `OPS_PERMISSIONS` to the
existing multi-line `import { ... } from "./enums"` block at the top, then
add the schema near the end, alongside the other schema definitions (do
not remove or reorder existing exports):

```ts
export const documentExportRequestSchema = z.object({
  entity: z.enum(OPS_PERMISSIONS),
  title: z.string().min(1).max(200),
  headers: z.array(z.string()).min(1).max(20),
  // Matches the current-page/selected-rows scope CSV export already
  // uses — this is not a full-dataset export.
  rows: z.array(z.array(z.string())).max(500),
})
```

Then add the matching type export alongside the file's other `z.infer<>`
exports at the very end of the file:

```ts
export type DocumentExportRequest = z.infer<typeof documentExportRequestSchema>
```

`documentExportRequestSchema` reaches `apps/api` automatically through
the existing barrel (`apps/api/lib/validation/schemas.ts`'s `export *`),
so the route in Step 5 imports it from `@/lib/validation/schemas` exactly
as planned — no change needed there.

(If `z` isn't already imported at the top of this file, add
`import { z } from "zod"` — check first, most validation-schema files in
this codebase already import it.)

- [x] **Step 3: Write the failing test**

```ts
// apps/api/app/v1/ops/documents/export/route.test.ts
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-utils")>("@/lib/api-utils")
  return {
    ...actual,
    requireOpsPermissionAccess: vi.fn().mockResolvedValue({ access: { userId: "test-user" } }),
  }
})

describe("POST /v1/ops/documents/export", () => {
  it("returns a PDF for a valid request body", async () => {
    const { POST } = await import("./route")
    const req = new Request("http://localhost/v1/ops/documents/export", {
      method: "POST",
      body: JSON.stringify({
        entity: "drivers",
        title: "Drivers",
        headers: ["Name", "City"],
        rows: [["Amina", "Nairobi"]],
      }),
    })

    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toBe("application/pdf")
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes.length).toBeGreaterThan(0)
  })

  it("rejects a body with an unknown entity", async () => {
    const { POST } = await import("./route")
    const req = new Request("http://localhost/v1/ops/documents/export", {
      method: "POST",
      body: JSON.stringify({
        entity: "not_a_real_permission",
        title: "Drivers",
        headers: ["Name"],
        rows: [["Amina"]],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [x] **Step 4: Run test to verify it fails**

```bash
cd apps/api
npx vitest run app/v1/ops/documents/export/route.test.ts
```

Expected: FAIL — `route.tsx` doesn't exist yet.

- [x] **Step 5: Write the route**

```tsx
// apps/api/app/v1/ops/documents/export/route.tsx
import { NextResponse } from "next/server"

import { jsonError, parseJsonBody, requireOpsPermissionAccess } from "@/lib/api-utils"
import { renderPdf } from "@/lib/pdf/render-pdf"
import { EntityExportPdf } from "@/lib/pdf/templates/entity-export-pdf"
import { documentExportRequestSchema } from "@/lib/validation/schemas"

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, documentExportRequestSchema)
  if ("error" in parsed) return parsed.error

  // Rows arrive in the body rather than being queried here, so the
  // permission check is on the claimed entity, not on a query result —
  // same trust boundary the existing CSV export already accepts (the
  // client already holds this data before either export path runs).
  const auth = await requireOpsPermissionAccess(parsed.data.entity)
  if (auth.error) return auth.error

  const { title, headers, rows } = parsed.data

  try {
    const bytes = await renderPdf(
      <EntityExportPdf
        title={title}
        headers={headers}
        rows={rows}
        generatedAt={new Date().toLocaleDateString("en-KE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      />,
    )
    // Buffer.from(), not the raw Uint8Array — see the note on this same
    // pattern in Task 1's spike route.
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    })
  } catch (error: unknown) {
    console.error("[ops /v1/ops/documents/export POST]", error)
    return jsonError(
      error instanceof Error ? error.message : "PDF generation failed",
      500,
    )
  }
}
```

- [x] **Step 6: Run test to verify it passes**

```bash
cd apps/api
npx vitest run app/v1/ops/documents/export/route.test.ts
```

Expected: PASS (both tests).

- [x] **Step 7: Typecheck**

```bash
cd apps/api
npx tsc --noEmit
```

Expected: no errors. If you hit `Type 'Uint8Array<ArrayBufferLike>' is
not assignable to parameter of type 'BodyInit'` on the route's
`NextResponse` call — a real TypeScript 5.9 friction point, not
hypothetical — wrap the bytes: `new NextResponse(Buffer.from(bytes), {
... })` instead of passing `bytes` directly. Apply the same fix to Task
1's spike route (`apps/api/app/v1/spike-pdf-test/route.tsx`) if it has
the same unwrapped `Response(bytes, ...)` — it typechecks clean today
only because Task 1 had no typecheck step of its own.

- [x] **Step 8: Commit**

```bash
git add packages/ops-contracts/src/schemas.ts apps/api/vitest.config.ts apps/api/app/v1/ops/documents/ apps/api/app/v1/spike-pdf-test/route.tsx
git commit -m "feat: add POST /v1/ops/documents/export route"
```

---

## Task 5: `documents.exportPdf` on the shared ops API client

**Files:**
- Modify: `packages/ops-api-client/src/index.ts`

**Interfaces:**
- Consumes: `POST /v1/ops/documents/export` (Task 4).
- Produces: `opsClient.documents.exportPdf(body: DocumentExportRequest): Promise<Blob>` — Task 6's `entity-page.tsx` calls exactly this.

- [x] **Step 1: Add a blob-returning fetch helper**

Add `type DocumentExportRequest` to the existing multi-line `import {
... } from "@workspace/ops-contracts"` block at the top of the file (it
already imports many sibling types from this package the same way, e.g.
`LeadDto`) — reuse the type Task 4 derived from the real Zod schema
(`z.infer<typeof documentExportRequestSchema>`) rather than declaring a
second, parallel type here that could drift out of sync with it. Re-export
it alongside this file's other pass-through type exports (near `export
type { PublicApiResult }`) so `apps/ops` can import it from
`@workspace/ops-api-client` without reaching into `ops-contracts`
directly, matching how this file already re-exports other types.

Inside `createOpsClient`, directly after the existing `async function
request<T>(...)` definition (the one ending around line 285 with `return
(await res.json()) as T`), add a sibling that returns a `Blob` instead of
parsed JSON — PDF bytes aren't JSON, so the existing `request()` can't be
reused as-is:

```ts
  async function requestBlob(
    path: string,
    init: RequestInit = {},
  ): Promise<Blob> {
    const token = await options.getToken()
    const headers = new Headers(init.headers)
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json")
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs)
    let res: Response
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      })
    } catch (err) {
      if (controller.signal.aborted) {
        throw new OpsApiError(
          "Request timed out. Check your connection and try again.",
          408,
        )
      }
      throw err
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      throw await parseError(res)
    }

    return res.blob()
  }
```

- [x] **Step 2: Add `documents` to the `OpsClient` type**

Find `export type OpsClient = {` (around line 95) and add a sibling to
`me`:

```ts
export type OpsClient = {
  me: {
    get: () => Promise<MeDto>
  }
  documents: {
    exportPdf: (body: DocumentExportRequest) => Promise<Blob>
  }
  leads: EntityResource<
  // ... (rest of the existing type is unchanged)
```

- [x] **Step 3: Add `documents` to the returned client object**

Find the `return {` inside `createOpsClient` (around line 333) and add a
sibling to `me`, mirroring the existing `pushTokens.register` method
right below it (same `POST` + `JSON.stringify(body)` shape, just returning
`requestBlob` instead of `request`):

```ts
  return {
    me: {
      get: () => request<MeDto>(`${apiPrefix}/me`),
    },
    documents: {
      exportPdf: (body: DocumentExportRequest) =>
        requestBlob(`${apiPrefix}/ops/documents/export`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
    },
    leads: createEntityResource(`${apiPrefix}/leads`),
    // ... (rest unchanged)
```

- [x] **Step 4: Typecheck**

```bash
cd packages/ops-api-client
npx tsc --noEmit
```

Expected: no errors. (This package has no test suite of its own — its
consumer, `apps/ops`, is exercised manually in Task 6/7.)

- [x] **Step 5: Commit**

```bash
git add packages/ops-api-client/src/index.ts
git commit -m "feat: add documents.exportPdf to the ops API client"
```

---

## Task 6: Wire "Export as PDF" into `EntityPage`

**Files:**
- Modify: `apps/ops/lib/format.ts` (add `downloadPdf`)
- Modify: `apps/ops/lib/ops-client.ts` (add `apiPathToPermission`)
- Modify: `apps/ops/components/entity-page.tsx` (dropdown UI + handlers)

**Interfaces:**
- Consumes: `opsClient.documents.exportPdf` (Task 5).
- Produces: nothing further downstream — this is the last code task; Task 7 is manual QA.

`apps/ops` has no test runner configured (no `vitest`/`jest` in its
`package.json`, and the existing `handleExport`/`handleBulkExport` this
mirrors have no tests either) — this task is verified manually in Task 7,
consistent with how the rest of this file is already tested.

- [x] **Step 1: Add `downloadPdf` to `apps/ops/lib/format.ts`**

Add directly below the existing `downloadCsv`:

```ts
export function downloadPdf(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [x] **Step 2: Add `apiPathToPermission` to `apps/ops/lib/ops-client.ts`**

Add directly below `resolveOpsResource`, mirroring its exact switch shape
(explicit cases, not a string-replace trick, so a future sixth entity
fails loudly if this is forgotten rather than silently guessing wrong):

```ts
export function apiPathToPermission(apiPath: string): OpsPermission {
  switch (apiPath) {
    case "/v1/leads":
      return "leads"
    case "/v1/fleet":
      return "fleet"
    case "/v1/drivers":
      return "drivers"
    case "/v1/waitlist":
      return "waitlist"
    case "/v1/media-kit":
      return "media_kit"
    default:
      throw new Error(`Unknown ops API path: ${apiPath}`)
  }
}
```

This needs `OpsPermission` imported — add to the top of the file:

```ts
import type { OpsPermission } from "@workspace/ops-contracts"
```

- [x] **Step 3: Add PDF-export handlers in `entity-page.tsx`**

Directly below the existing `handleExport` function (the one ending
around line 363), add:

```ts
  const handleExportPdf = async () => {
    if (!data?.items.length) return
    const pdfColumns = columns.filter((c) => c.csv)
    const headers = pdfColumns.map((c) => c.header)
    const rows = data.items.map((row) =>
      pdfColumns.map((c) => String(c.csv!(row) ?? "")),
    )
    try {
      const blob = await opsClient.documents.exportPdf({
        entity: apiPathToPermission(apiPath),
        title,
        headers,
        rows,
      })
      downloadPdf(`${apiPath.replace(/^\/v1\//, "")}.pdf`, blob)
    } catch (e) {
      toast.error(formatApiError(e))
    }
  }

  const handleBulkExportPdf = async () => {
    if (!selectedRows.length) return
    const pdfColumns = columns.filter((c) => c.csv)
    const headers = pdfColumns.map((c) => c.header)
    const rows = selectedRows.map((row) =>
      pdfColumns.map((c) => String(c.csv!(row) ?? "")),
    )
    try {
      const blob = await opsClient.documents.exportPdf({
        entity: apiPathToPermission(apiPath),
        title,
        headers,
        rows,
      })
      downloadPdf(`${apiPath.replace(/^\/v1\//, "")}-selected.pdf`, blob)
      toast.success(
        `Exported ${selectedRows.length} record${selectedRows.length === 1 ? "" : "s"}`,
      )
    } catch (e) {
      toast.error(formatApiError(e))
    }
  }
```

This uses `opsClient` (bound via `const opsClient = useOpsClient()`,
already present at line 137) and `title` (the component's destructured
prop, already used in the `<PageHero title={title} ... />` call) — both
already in scope, no new binding needed.

Add the two new imports at the top of the file:

```ts
import { downloadCsv, downloadPdf, formatDateTime, toCsv } from "@/lib/format"
import { apiPathToPermission, resolveOpsResource, useOpsClient } from "@/lib/ops-client"
```

- [x] **Step 4: Replace the toolbar "Export CSV" button with a dropdown**

Find (around line 457):

```tsx
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.items.length}>
          <Download data-icon="inline-start" />
          Export CSV
        </Button>
```

Replace with:

```tsx
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!data?.items.length}>
              <Download data-icon="inline-start" />
              Export
              <ChevronDown data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExport}>Export as CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleExportPdf()}>
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
```

- [x] **Step 5: Replace the bulk "Export selected" button with a dropdown**

Find (around line 550):

```tsx
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkExport}
              disabled={bulkMutation.isPending}
            >
              <Download data-icon="inline-start" />
              Export selected
            </Button>
```

Replace with:

```tsx
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={bulkMutation.isPending}>
                  <Download data-icon="inline-start" />
                  Export selected
                  <ChevronDown data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleBulkExport}>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleBulkExportPdf()}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
```

- [x] **Step 6: Typecheck**

```bash
cd apps/ops
npx tsc --noEmit
```

Expected: no errors.

- [x] **Step 7: Commit**

```bash
git add apps/ops/lib/format.ts apps/ops/lib/ops-client.ts apps/ops/components/entity-page.tsx
git commit -m "feat: add Export as PDF to ops list pages"
```

---

## Task 7: Manual QA + remove the spike route

**Files:**
- Delete: `apps/api/app/v1/spike-pdf-test/route.tsx`

- [ ] **Step 1: Run both dev servers**

```bash
# terminal 1
cd apps/api && npm run dev
# terminal 2
cd apps/ops && npm run dev
```

- [ ] **Step 2: Exercise all five entity pages**

For each of Leads, Fleet, Drivers, Waitlist, and Media Kit in the ops
console:
1. Open the list page. Click the "Export" dropdown → "Export as PDF".
   Confirm a `.pdf` file downloads and opens correctly, showing the same
   columns/rows visible in the on-screen table.
2. Select 2-3 rows via the checkboxes. Click "Export selected" → "Export
   as PDF". Confirm the downloaded PDF contains exactly those rows.
3. Confirm "Export as CSV" in both dropdowns still works exactly as
   before (this task must not regress the existing CSV path).

- [ ] **Step 3: Confirm the permission check is real**

Using an ops account with a role that does **not** have access to one of
the five entities (or by temporarily editing a role in the ops team
settings), confirm that entity's "Export as PDF" fails with an
authorization error rather than silently succeeding.

- [ ] **Step 4: Delete the throwaway spike route**

```bash
rm -rf apps/api/app/v1/spike-pdf-test
```

- [ ] **Step 5: Final typecheck across both apps**

```bash
cd apps/api && npx tsc --noEmit
cd apps/ops && npx tsc --noEmit
```

Expected: no errors in either.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove PDF renderer spike route"
```
