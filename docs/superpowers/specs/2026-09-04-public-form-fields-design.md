# Richer public-form fields + ops display

**Date:** 2026-09-04
**Status:** Approved design, pre-implementation

## Problem

The five public-facing lead forms on the marketing site (`apps/web`) collect
little beyond contact details. The ops team cannot qualify or prioritise a
driver, fleet, or advertiser lead without a phone call. We want each form to
ask for substantive, structured information, store it, and surface it in the
ops console (and ops-mobile, which comes along for free).

## Scope

All five forms get new fields. The three substantive lead forms (drivers,
partner fleet, start campaign) get the most; media kit and waitlist get a
light touch. Every new field is **optional** on the public form so completion
rates are not hurt.

Out of scope: consolidating the three parallel Zod schema copies
(`apps/web/lib/validation/lead-schemas.ts`,
`apps/api/lib/validation/lead-schemas.ts`,
`packages/ops-contracts/src/schemas.ts`); the authenticated `DriverProfile`
KYC stepper; any change to ops list/detail API routes (new columns serialize
through automatically — the `findMany` calls have no explicit `select`).

## New fields

### Drivers — `Driver` / `drivers` table

Public form is at `apps/web/app/(marketing)/drivers/drivers-client.tsx`.
There is a separate authenticated `DriverProfile` stepper for KYC (national
ID, KRA PIN, payout, documents) — this public form stays pre-approval
qualifying info and must not duplicate that. **No plate number** (sensitive).

| Column | Type | Public control | Enum |
|---|---|---|---|
| `vehicle_make_model` | `String?` | text ("Toyota Vitz") | — |
| `vehicle_year` | `String?` | text | — |
| `vehicle_ownership` | `String?` | select | `VEHICLE_OWNERSHIP = ["owned","rented","financed"]` |
| `routes_areas` | `String?` | text ("estates/areas you usually cover") | — |
| `hours_per_day` | `String?` | select | `HOURS_PER_DAY = ["under_4","4_8","8_12","over_12"]` |
| `platforms` | `String[] @default([])` | checkboxes | `RIDEHAIL_PLATFORMS = ["uber","bolt","little","faras","independent"]` |
| `applicant_message` | `String?` | textarea ("anything else we should know") | — |

The existing `notes` column stays ops-internal and is never shown to the
applicant.

### Partner fleet — `FleetPartner` / `fleet_partners` table

Public form is at `apps/web/app/(marketing)/partner-fleet/partner-fleet-form.tsx`.
`company_name` and `primary_contact_name` are already collected and required —
unchanged. No `platforms` field here (dropped in review).

| Column | Type | Public control | Enum |
|---|---|---|---|
| `taxi_count` | `String?` | number input | — |
| `bike_count` | `String?` | number input | — |
| `operating_cities` | `String[] @default([])` | checkboxes | reuse `CITIES` |
| `ev_status` | `String?` | select ("does your fleet include EVs?") | `FLEET_EV_STATUS = ["none","some","mostly","all"]` |

### Start campaign — `Lead` / `leads` table

Public form is at `apps/web/app/(marketing)/start-campaign/page.tsx`.

| Column | Type | Public control | Enum |
|---|---|---|---|
| `objective` | `String?` | select | `CAMPAIGN_OBJECTIVES = ["awareness","launch","promo","footfall","other"]` |
| `industry` | `String?` | text | — |
| `campaign_start_date` | `DateTime?` | `<input type="date">` | already in schema, currently written as `null` |
| `creative_status` | `String?` | select | `CREATIVE_STATUS = ["ready","needs_design","not_sure"]` |
| `target_audience` | `String?` | textarea | — |

### Media kit — `MediaKitRequest` / `media_kit_requests` table (light touch)

Public form is at `apps/web/app/(marketing)/media-kit/page.tsx`.

| Column | Type | Public control |
|---|---|---|
| `company` | `String?` | text |
| `role` | `String?` | text |
| `use_case` | `String?` | text ("what are you evaluating Admobi for?") |

### Waitlist — `WaitlistEntry` / `waitlist_entries` table (light touch)

Public form is the hand-rolled `useState` email input in
`apps/web/components/landing/get-started-section.tsx` (no react-hook-form, no
Zod schema today — posts `{ email }` straight to `/waitlist`).

| Column | Type | Public control | Enum |
|---|---|---|---|
| `name` | `String?` | text | — |
| `persona` | `String?` | select | `WAITLIST_PERSONA = ["advertiser","driver","fleet","other"]` |

## Layered changes (per form, all following existing patterns)

1. **`apps/web/prisma/schema.prisma`** — add the nullable columns to each
   model. `campaign_start_date` already exists.

2. **`apps/web/prisma/scripts/public-forms-fields-additive.sql`** — one new
   file: `ALTER TABLE … ADD COLUMN IF NOT EXISTS …` for every column across
   all five tables (array columns default `'{}'`). Add `db:public-forms-fields`
   and `db:public-forms-fields:prod` scripts to `apps/web/package.json`,
   mirroring the existing `db:*-additive` entries. This is the
   Neon-shared-with-n8n-safe path — **no `prisma migrate`**. The SQL file is
   written and committed but not run against the DB as part of this work; the
   operator runs it (dev, then `:prod`) when ready.

3. **`packages/ops-contracts/src/enums.ts`** — new enums:
   `VEHICLE_OWNERSHIP`, `HOURS_PER_DAY`, `RIDEHAIL_PLATFORMS`,
   `FLEET_EV_STATUS`, `CAMPAIGN_OBJECTIVES`, `CREATIVE_STATUS`,
   `WAITLIST_PERSONA` (each `as const` + exported type, matching the file's
   style).

4. **`packages/ops-contracts/src/schemas.ts`** — extend `driverCreateSchema`,
   `fleetCreateSchema`, `leadCreateSchema`, `mediaKitCreateSchema`,
   `waitlistCreateSchema` with the new fields, all `.optional()`. Array
   fields `z.array(z.enum(...)).default([])`. `*UpdateSchema` are
   `.partial()` derivations and need no direct edit.

5. **`packages/ops-contracts/src/types.ts`** — extend `DriverDto`,
   `FleetPartnerDto`, `LeadDto`, `MediaKitRequestDto`, `WaitlistEntryDto`.

6. **`packages/ops-contracts/src/form-fields.ts`** — add `FormFieldDef`
   entries to `DRIVER_FORM_FIELDS`, `FLEET_FORM_FIELDS`, `LEAD_FORM_FIELDS`,
   `MEDIA_KIT_FORM_FIELDS`, `WAITLIST_FORM_FIELDS` (drives the ops add/edit
   dialog and ops-mobile). Use `section` titles ("Vehicle", "Operations",
   "Campaign details") to group them. Update the `*FormToPayload` /
   `*FormFromRecord` mappers for every new field, including CSV handling for
   the multi-select array fields (`splitCsv` / `.join(", ")`, same as the
   existing `cities` / `fleet_types` handling).

7. **`apps/api/lib/validation/lead-schemas.ts`** and
   **`apps/web/lib/validation/lead-schemas.ts`** — mirror the new fields into
   `driverJoinSchema`, `campaignLeadSchema`, `fleetLeadSchema`,
   `mediaKitSchema`, `waitlistSchema` (kept in sync by hand today; keep that).
   `get-started-section.tsx` keeps its `useState` approach — add two more
   `useState` values for `name` and `persona`, post them in the body, and let
   the `ops-contracts` + API `waitlistSchema` be the real validation gate
   (the `persona` `<select>` can only emit valid enum values anyway).

8. **API public routes** — `apps/api/app/v1/public/drivers/route.ts`,
   `…/public/leads/route.ts`, `…/public/media-kit/route.ts`,
   `…/public/waitlist/route.ts`: pass the new fields into the
   `prisma.*.create` calls. For campaign, parse the date input to a `Date`
   for `campaign_start_date`. Enrich each `AdminAlert` template's
   `additionalInfo` string so the new info shows in the ops alert email.

9. **Web form components** — `drivers-client.tsx`, `partner-fleet-form.tsx`,
   `start-campaign/page.tsx`, `media-kit/page.tsx`, `get-started-section.tsx`:
   add the inputs inline, matching each file's existing hand-written field
   markup (`selectClass`, `radioClass`, `Label` + `Input`, error `<p>`).
   Update each form's `defaultValues`.

10. **Ops views** — `apps/ops/app/(dashboard)/{drivers,fleet,leads,media-kit,waitlist}/*-view.tsx`:
    add a `detailFields` row for every new column (arrays rendered as
    `formatLabel`-joined lists; empty → `"—"`). Add at most one high-signal
    `columns` entry per form (Drivers: "Ownership"; Fleet: "EVs"; Leads:
    "Objective"). **No `apps/api` list/detail route changes.**

**Ops mobile** picks up the new fields via `form-fields.ts` and
`EntityDetail`. Sanity-check `apps/ops-mobile/components/EntityDetail.tsx`
`detailValue()` renders the new `String[]` fields; add array handling there
if missing.

## Testing

- **`packages/ops-contracts/src/contracts.test.ts`** (vitest, exists) — add:
  each extended create schema accepts a payload with all new fields; rejects
  an unknown enum value; still accepts a payload omitting every new field.
- **`packages/ops-contracts/src/form-fields.test.ts`** (new) — round-trip
  `*FormToPayload(*FormFromRecord(record))` preserves new fields, including
  the CSV multi-select array fields.
- **Build gate, run in order before done:** `npm run typecheck` (catches
  DTO/schema/form-field drift across all consumers — the primary safety net),
  `npm run lint`, `npm run test`, `npm run build`, and
  `cd apps/web && npx prisma validate`.
- **Manual smoke** with dev servers: submit each of the five public forms
  with new fields populated → row lands with new columns → ops console detail
  view renders every new field. `e2e/marketing-smoke.spec.ts` still passes.

## Rollout

1. Run `npm run db:public-forms-fields` against dev, verify the columns, then
   `npm run db:public-forms-fields:prod` — do this **before** the app deploy
   so the regenerated Prisma client never queries a column that isn't there
   yet. All new columns are nullable/defaulted, so existing rows are fine.
2. Merge and deploy the code. Prisma client regenerates as part of each
   app's `build`.
