# PDF generation (ops export, invoice architecture)

**Date:** 2026-09-04
**Status:** Approved design, pre-implementation

## Problem

Two unrelated gaps, deliberately built in one pass because they share a
renderer:

1. **Ops has CSV export but no PDF export.** Five list pages in
   `apps/ops` (leads, fleet partners, drivers, waitlist, media kit) already
   export their rows as CSV. Staff who need to hand a filtered list to
   someone outside ops, or print one, have no PDF option.
2. **Advertisers using `apps/customer-web` have no shareable document at
   all** — no quote to forward to finance before committing budget, no
   report to forward after a flight runs. But `customer-web`'s campaign and
   wallet data is 100% placeholder (browser `localStorage`, no real
   backend) — wiring a working button to fake data would just be theater.

**Build order follows the data, not the app.** Ops has real,
database-backed rows today; `customer-web` doesn't. So the renderer gets
proven against ops first — a real, shipped feature — and the customer
documents stay a spec (this doc) until campaigns/payments are real.

## Scope

1. **Renderer spike** (Phase 0, throwaway) — de-risk Takumi before building
   anything real on top of it.
2. **Ops PDF export** (Phase 1, real, shipped this cycle) — a "Export PDF"
   button next to "Export CSV" on all five `EntityPage`-based list pages,
   implemented once in the shared component the same way CSV is.
3. **Customer invoice + campaign report** (documented here, **not built**
   this cycle) — kept as architecture only until `customer-web` has real
   campaign/payment data to wire it to.

**Out of scope entirely:**

- Campaign-list export, media plan/booking confirmation, wallet statement
  (customer-web) — thin compositions on the same primitives, once the
  customer documents themselves are unblocked.
- Real tax receipt — waits on Pesapal.
- Driver/fleet payout statements — different app, separate spec.
- Full-dataset ops export (all pages, not just the current page) — today's
  CSV export doesn't do this either; PDF matches that scope exactly.

## Renderer choice: pdfcn on Takumi, gated on a spike

Compared against a `window.print()` print-stylesheet approach and
`@react-pdf/renderer`. Takumi renders paged PDFs from JSX/HTML/CSS with no
headless browser (Node/Vercel-function-friendly), and pdfcn wraps it in
copy-paste, shadcn-style components — closest to normal CSS of the three,
and the only one of the three that does genuine server-side generation
(needed for a real downloadable file now, and to email a receipt later).

**Phase 0 — spike, throwaway, go/no-go before anything else is built:**
render a paged PDF — a small table plus the Admobi brand color and a real
embedded font — from a React component in an `apps/api` Vercel Node
function, confirm it opens correctly in a real PDF viewer, and sanity-check
cold start / function bundle size. Lives at
`apps/api/app/v1/_spike/pdf-test/route.ts` — the `_spike` prefix marks it
for deletion once Phase 1 lands.

**No-go fallback:** `@react-pdf/renderer` (mature, widely adopted), same
architecture below — only the renderer swaps; `lib/pdf/render-pdf.ts` is
the single seam that would change.

## Architecture: mirrors `lib/email`, not a new shared package

`apps/api` already owns every piece of document rendering + delivery in
this codebase — `lib/email/templates/*.tsx` (React components) go through
`lib/email/render-template.ts` (`react-email`'s `render()`) and out through
`lib/email/send-email.ts` (Resend). PDF rendering follows the identical
shape, and lives in `apps/api` regardless of which app calls it:

```
apps/api/lib/pdf/
  render-pdf.ts              # renderPdf(component, props) -> Uint8Array, mirrors renderTemplate()
  primitives/
    document-shell.tsx       # page frame: logo, doc title, doc number/date, footer
    data-table.tsx           # generic column-header + rows table (ops export uses only this)
    meta-block.tsx           # key-value pairs — invoice/report only, not needed by ops export
    totals-block.tsx         # subtotal / total, KES formatting — invoice/report only
  templates/
    EntityExportPdf.tsx      # ops: title + DataTable, built this cycle
    ProformaInvoice.tsx      # customer: spec'd below, NOT built this cycle
    CampaignReport.tsx       # customer: spec'd below, NOT built this cycle
```

No new `packages/pdf` workspace package — `lib/email` isn't one either, and
nothing outside `apps/api` needs to import these components directly;
every consumer calls the API.

## Phase 1 (real) — Ops PDF export

**Mirrors the existing CSV export exactly**, which is itself implemented
once and shared: `apps/ops/components/entity-page.tsx`'s `EntityPage<T>`
renders both "Export CSV" and "Export selected" buttons and a
`handleExport` that reads `columns.filter(c => c.csv)`, maps
`data.items`/selected rows through each column's `csv` accessor, and pipes
the result through `toCsv`/`downloadCsv` (`apps/ops/lib/format.ts`) — a
`Blob` + `<a download>`, no server involved. All five entity views (leads,
fleet, drivers, waitlist, media kit) get this for free because they all go
through `EntityPage`; none of them hand-roll their own export.

**UI:** both export buttons ("Export CSV" in the toolbar, "Export selected"
in the bulk-selection bar) become `DropdownMenu` triggers ("Export ▾") with
"Export as CSV" / "Export as PDF" items — mirroring the "Set status"
dropdown already in the same file (`entity-page.tsx` line ~508), which
uses the same `DropdownMenu`/`DropdownMenuTrigger`/`DropdownMenuContent`/
`DropdownMenuItem` imports already present. No new UI primitives.

PDF export adds a **second export path** alongside the existing CSV one:

- `handleExportPdf` builds the same row data `handleExport` already builds
  (same `columns[].csv` accessors — **no new per-entity `pdf` accessor**,
  the CSV cell text is exactly what a PDF cell should show too) and POSTs
  `{ title, columns: string[], rows: string[][] }` to a new route.
- `POST /v1/ops/documents/export` (guarded by `requireOpsPermissionAccess`
  for the entity being exported, same as `GET /v1/drivers` etc. already
  do) renders `EntityExportPdf` — page header with the entity title and
  row count, a paginated table — through `renderPdf`, returns
  `application/pdf` bytes.
- The client turns the response into a blob URL and triggers the download,
  same pattern as `downloadCsv`, named `downloadPdf` alongside it in
  `apps/ops/lib/format.ts`.

Net new code: one API route, one PDF template, `data-table.tsx` +
`document-shell.tsx` primitives, and ~20 lines in `EntityPage` — every
other entity view file is untouched.

## Deferred (architectural only) — customer invoice + campaign report

Documented so the shape is settled before `customer-web` has real data to
back it — **no code for this section ships in this cycle.**

**Proforma invoice** — trigger: "Download quote (PDF)" on
`new-campaign-form.tsx`, pre-submission. Input: the form's current values
(`name`, `market`, `format`, `budgetKes`, `duration`), POSTed as-is — no
persistence. Output: Admobi header, a visible **"Proforma — not a tax
invoice"** label (load-bearing — nothing about payments is real yet),
campaign summary, one line item derived from `budgetKes`, totals, a note
that final pricing is confirmed by the account manager.

**Campaign performance report** — trigger: "Download report (PDF)" on
`campaign-detail-view.tsx`. Input: the campaign's existing client-side
fields (`name`, `market`, `dates`, `impressions`, `budget`, `format`).
Output: one page, labeled as illustrative figures per `PRODUCT.md`'s
"Placeholder honesty" principle — never presented as verified analytics.

Both would POST to `apps/api` (`/v1/customer/documents/invoice`,
`/v1/customer/documents/campaign-report`) and use the `meta-block` /
`totals-block` primitives, following the same architecture as the ops
export. **Unblocked by:** real campaign records (a `campaigns` table +
API route) and, for the invoice specifically, Pesapal.

## Testing

One `demo()`/smoke script for `render-pdf` + `EntityExportPdf` (representative
columns/rows, asserts non-empty PDF bytes and no throw) — matches this
project's "non-trivial logic leaves one runnable check" convention. No
framework, no fixtures.

## Risks

- **Vercel function size / cold start with Takumi** — the reason Phase 0 is
  a gate, not an assumption.
- **Brand font licensing** — embedding a PDF font requires the actual font
  file, not just a CSS `@font-face`; confirm the current site font is
  freely embeddable before the document shell is finalized.
- **Ops auth on the new route** — the export route accepts rows in its
  request body rather than querying them itself, so it must still call
  `requireOpsPermissionAccess` for the relevant entity before rendering;
  otherwise a PDF export becomes a way to read data a role couldn't
  otherwise see (or export rows the client fabricated in the request).
