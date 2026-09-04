# Richer Public-Form Fields + Ops Display — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add substantive, structured qualifying fields to all five public lead forms (drivers, partner fleet, start campaign, media kit, waitlist), persist them, and display them in the ops console and ops-mobile.

**Architecture:** Each form is a vertical slice through seven layers — Prisma model, additive SQL, `@workspace/ops-contracts` (enums / Zod schemas / DTOs / form-field defs + mappers), the public Zod schema pair (`apps/web` + `apps/api`), the public API route, the marketing form component, and the two ops read surfaces (`apps/ops` `EntityPage` detail fields + `apps/ops-mobile` `[id].tsx` sections). New columns are all nullable / array-defaulted, so old rows and pre-migration reads are safe, and the ops list/detail API routes need no change (their `findMany` calls have no explicit `select`).

**Tech Stack:** Next.js App Router, Prisma 7 + Neon Postgres, Zod, react-hook-form, TanStack Query, Expo / React Native (ops-mobile), Turborepo, vitest.

**Spec:** `docs/superpowers/specs/2026-09-04-public-form-fields-design.md`

## Global Constraints

- **No `prisma migrate`.** The Neon DB is shared with self-hosted n8n. Schema changes ship as an additive SQL file run via `prisma db execute`, exactly like the existing `apps/web/prisma/scripts/*-additive.sql` files. The `.prisma` schema is still edited (for the generated client) but no migration folder is created.
- **Every new field is optional** on the public form and `.optional()` in every Zod schema. No new required fields.
- **Array columns** are `String[] @default([])` in Prisma and `DEFAULT '{}'` in SQL.
- **The three parallel Zod schema copies are kept in sync by hand** (`apps/web/lib/validation/lead-schemas.ts`, `apps/api/lib/validation/lead-schemas.ts`, `packages/ops-contracts/src/schemas.ts`). Do not attempt to consolidate them in this plan.
- **`campaign_start_date` stays display-only in ops.** It already exists as a `DateTime?` column. Wire it into the public campaign form + public route only; do NOT add it to `leadCreateSchema` / `LEAD_FORM_FIELDS` (the ops create/update routes spread `parsed.data` straight into Prisma and a string would break the `DateTime` column).
- **Enum value style:** lowercase snake_case, `as const` tuple + exported type, matching `packages/ops-contracts/src/enums.ts`.
- **Commit** after each task with the message shown in its final step. End every commit message with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  ```
- Run commands from the repo root: `c:\Users\victo\Documents\GitHub\AdmobiHQ`.

---

## File Structure

**New files:**
- `apps/web/prisma/scripts/public-forms-fields-additive.sql` — one `ALTER TABLE … ADD COLUMN IF NOT EXISTS` block per table (Task 1).
- `packages/ops-contracts/src/form-fields.test.ts` — mapper round-trip tests (Task 3).

**Modified files (by layer):**
- `apps/web/prisma/schema.prisma` — new columns on `Driver`, `FleetPartner`, `Lead`, `MediaKitRequest`, `WaitlistEntry` (Task 1).
- `apps/web/package.json` — `db:public-forms-fields` + `:prod` scripts (Task 1).
- `packages/ops-contracts/src/enums.ts` — 7 new enum tuples (Task 2).
- `packages/ops-contracts/src/schemas.ts` — extend `driverCreateSchema`, `fleetCreateSchema`, `leadCreateSchema`, `mediaKitCreateSchema`, `waitlistCreateSchema` (Tasks 3–7).
- `packages/ops-contracts/src/types.ts` — extend `DriverDto`, `FleetPartnerDto`, `LeadDto`, `MediaKitRequestDto`, `WaitlistEntryDto` (Tasks 3–7).
- `packages/ops-contracts/src/form-fields.ts` — extend the 5 `*_FORM_FIELDS` arrays + their `*FormToPayload` / `*FormFromRecord` mappers (Tasks 3–7).
- `packages/ops-contracts/src/contracts.test.ts` — schema cases (Tasks 3–7).
- `apps/web/lib/validation/lead-schemas.ts` + `apps/api/lib/validation/lead-schemas.ts` — extend `driverJoinSchema`, `campaignLeadSchema`, `fleetLeadSchema`, `mediaKitSchema`, `waitlistSchema` (Tasks 3–7).
- `apps/api/app/v1/public/{drivers,leads,media-kit,waitlist}/route.ts` — write new fields; enrich `AdminAlert` `additionalInfo` (Tasks 3–7).
- `apps/web/app/(marketing)/drivers/drivers-client.tsx`, `.../partner-fleet/partner-fleet-form.tsx`, `.../start-campaign/page.tsx`, `.../media-kit/page.tsx`, `apps/web/components/landing/get-started-section.tsx` — new inputs (Tasks 3–7).
- `apps/ops/app/(dashboard)/{drivers,fleet,leads,media-kit,waitlist}/*-view.tsx` — `detailFields` rows + one `columns` entry (Tasks 3–7).
- `apps/ops-mobile/app/(ops)/{drivers,fleet,leads,media-kit,waitlist}/[id].tsx` — `sections` rows (Tasks 3–7).

---

## Task 1: Database layer — Prisma columns + additive SQL + scripts

**Files:**
- Modify: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/scripts/public-forms-fields-additive.sql`
- Modify: `apps/web/package.json`

**Interfaces:**
- Produces: the columns every later task reads/writes. Prisma model field names (snake_case) listed below are the exact names later tasks use in `prisma.*.create({ data: { … } })` and in DTOs.

- [ ] **Step 1: Add columns to `apps/web/prisma/schema.prisma`**

In `model Driver`, after the `heard_about` line and before `status`:

```prisma
  vehicle_make_model String?
  vehicle_year       String?
  vehicle_ownership  String? // "owned", "rented", "financed"
  routes_areas       String?
  hours_per_day      String? // "under_4", "4_8", "8_12", "over_12"
  platforms          String[] @default([]) // "uber", "bolt", "little", "faras", "independent"
  applicant_message  String?
```

In `model FleetPartner`, after `vehicles_active` and before `notes`:

```prisma
  taxi_count       String?
  bike_count       String?
  operating_cities String[] @default([]) // "Nairobi", "Mombasa", "Kisumu"
  ev_status        String? // "none", "some", "mostly", "all"
```

In `model Lead`, after `additional_info` and before `status`:

```prisma
  objective       String? // "awareness", "launch", "promo", "footfall", "other"
  industry        String?
  creative_status String? // "ready", "needs_design", "not_sure"
  target_audience String?
```

(`campaign_start_date DateTime?` already exists in `model Lead` — do not re-add.)

In `model MediaKitRequest`, after `email` and before `created_at`:

```prisma
  company  String?
  role     String?
  use_case String?
```

In `model WaitlistEntry`, after `source` and before `created_at`:

```prisma
  name    String?
  persona String? // "advertiser", "driver", "fleet", "other"
```

- [ ] **Step 2: Create `apps/web/prisma/scripts/public-forms-fields-additive.sql`**

```sql
-- Richer public-form fields (drivers, fleet, leads, media kit, waitlist).
-- Additive only — safe to run repeatedly. Neon DB is shared with n8n, so
-- this runs via `prisma db execute`, never `prisma migrate`.

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS vehicle_make_model text,
  ADD COLUMN IF NOT EXISTS vehicle_year       text,
  ADD COLUMN IF NOT EXISTS vehicle_ownership  text,
  ADD COLUMN IF NOT EXISTS routes_areas       text,
  ADD COLUMN IF NOT EXISTS hours_per_day      text,
  ADD COLUMN IF NOT EXISTS platforms          text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS applicant_message  text;

ALTER TABLE fleet_partners
  ADD COLUMN IF NOT EXISTS taxi_count       text,
  ADD COLUMN IF NOT EXISTS bike_count       text,
  ADD COLUMN IF NOT EXISTS operating_cities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ev_status        text;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS objective       text,
  ADD COLUMN IF NOT EXISTS industry        text,
  ADD COLUMN IF NOT EXISTS creative_status text,
  ADD COLUMN IF NOT EXISTS target_audience text;

ALTER TABLE media_kit_requests
  ADD COLUMN IF NOT EXISTS company  text,
  ADD COLUMN IF NOT EXISTS role     text,
  ADD COLUMN IF NOT EXISTS use_case text;

ALTER TABLE waitlist_entries
  ADD COLUMN IF NOT EXISTS name    text,
  ADD COLUMN IF NOT EXISTS persona text;
```

- [ ] **Step 3: Add npm scripts to `apps/web/package.json`**

Next to the other `db:*-additive` entries (e.g. after `"db:driver-notifications"` / its `:prod`):

```json
    "db:public-forms-fields": "dotenv -e .env.local -- prisma db execute --file prisma/scripts/public-forms-fields-additive.sql",
    "db:public-forms-fields:prod": "dotenv -e .env.production.local -- prisma db execute --file prisma/scripts/public-forms-fields-additive.sql",
```

- [ ] **Step 4: Validate the schema and regenerate the client**

Run: `cd apps/web && npx prisma validate && npx prisma generate`
Expected: `The schema at prisma/schema.prisma is valid` and client generated with no error.

- [ ] **Step 5: Verify the SQL parses (dry check, no DB write)**

Run: `cd apps/web && node -e "const fs=require('fs');const s=fs.readFileSync('prisma/scripts/public-forms-fields-additive.sql','utf8');if(!/ADD COLUMN IF NOT EXISTS/.test(s))process.exit(1);console.log('sql ok, statements:',s.split(';').filter(x=>x.trim()).length)"`
Expected: `sql ok, statements: 5`

- [ ] **Step 6: Commit**

```bash
git add apps/web/prisma/schema.prisma apps/web/prisma/scripts/public-forms-fields-additive.sql apps/web/package.json
git commit -m "feat(db): additive columns for richer public-form fields"
```

> **Note for the operator:** the SQL is NOT run against the DB by this plan. After merge, run `npm run db:public-forms-fields -w apps/web` (dev), verify, then `npm run db:public-forms-fields:prod -w apps/web` — **before** the app deploy.

---

## Task 2: ops-contracts enums

**Files:**
- Modify: `packages/ops-contracts/src/enums.ts`

**Interfaces:**
- Produces:
  - `VEHICLE_OWNERSHIP: readonly ["owned","rented","financed"]`
  - `HOURS_PER_DAY: readonly ["under_4","4_8","8_12","over_12"]`
  - `RIDEHAIL_PLATFORMS: readonly ["uber","bolt","little","faras","independent"]`
  - `FLEET_EV_STATUS: readonly ["none","some","mostly","all"]`
  - `CAMPAIGN_OBJECTIVES: readonly ["awareness","launch","promo","footfall","other"]`
  - `CREATIVE_STATUS: readonly ["ready","needs_design","not_sure"]`
  - `WAITLIST_PERSONA: readonly ["advertiser","driver","fleet","other"]`
  - plus a `type` alias per tuple.

- [ ] **Step 1: Append the enums to `packages/ops-contracts/src/enums.ts`**

Add after the `HEARD_ABOUT` block (keep the file's existing formatting — `as const`, exported `type`):

```ts
export const VEHICLE_OWNERSHIP = ["owned", "rented", "financed"] as const
export type VehicleOwnership = (typeof VEHICLE_OWNERSHIP)[number]

export const HOURS_PER_DAY = ["under_4", "4_8", "8_12", "over_12"] as const
export type HoursPerDay = (typeof HOURS_PER_DAY)[number]

/** Ride-hailing / delivery platforms a driver or fleet operates on. */
export const RIDEHAIL_PLATFORMS = [
  "uber",
  "bolt",
  "little",
  "faras",
  "independent",
] as const
export type RidehailPlatform = (typeof RIDEHAIL_PLATFORMS)[number]

export const FLEET_EV_STATUS = ["none", "some", "mostly", "all"] as const
export type FleetEvStatus = (typeof FLEET_EV_STATUS)[number]

export const CAMPAIGN_OBJECTIVES = [
  "awareness",
  "launch",
  "promo",
  "footfall",
  "other",
] as const
export type CampaignObjective = (typeof CAMPAIGN_OBJECTIVES)[number]

export const CREATIVE_STATUS = ["ready", "needs_design", "not_sure"] as const
export type CreativeStatus = (typeof CREATIVE_STATUS)[number]

export const WAITLIST_PERSONA = [
  "advertiser",
  "driver",
  "fleet",
  "other",
] as const
export type WaitlistPersona = (typeof WAITLIST_PERSONA)[number]
```

- [ ] **Step 2: Confirm they are re-exported**

`packages/ops-contracts/src/index.ts` should already `export * from "./enums"`. Verify:

Run: `grep -n "enums" packages/ops-contracts/src/index.ts`
Expected: a line like `export * from "./enums"`. If it instead names each export explicitly, add the 7 new `const` names and 7 `type` names to that list.

- [ ] **Step 3: Typecheck the package**

Run: `npx turbo typecheck --filter=@workspace/ops-contracts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/ops-contracts/src/enums.ts packages/ops-contracts/src/index.ts
git commit -m "feat(ops-contracts): enums for richer public-form fields"
```

---

## Task 3: Drivers vertical

**Files:**
- Modify: `packages/ops-contracts/src/schemas.ts` (`driverCreateSchema`)
- Modify: `packages/ops-contracts/src/types.ts` (`DriverDto`)
- Modify: `packages/ops-contracts/src/form-fields.ts` (`DRIVER_FORM_FIELDS`, `driverFormToPayload`, `driverFormFromRecord`)
- Modify: `packages/ops-contracts/src/contracts.test.ts`
- Create: `packages/ops-contracts/src/form-fields.test.ts`
- Modify: `apps/web/lib/validation/lead-schemas.ts` + `apps/api/lib/validation/lead-schemas.ts` (`driverJoinSchema`)
- Modify: `apps/api/app/v1/public/drivers/route.ts`
- Modify: `apps/web/app/(marketing)/drivers/drivers-client.tsx`
- Modify: `apps/ops/app/(dashboard)/drivers/drivers-view.tsx`
- Modify: `apps/ops-mobile/app/(ops)/drivers/[id].tsx`

**Interfaces:**
- Consumes: enums from Task 2 (`VEHICLE_OWNERSHIP`, `HOURS_PER_DAY`, `RIDEHAIL_PLATFORMS`), Prisma columns from Task 1.
- Produces: `DriverDto` gains `vehicle_make_model: string | null`, `vehicle_year: string | null`, `vehicle_ownership: string | null`, `routes_areas: string | null`, `hours_per_day: string | null`, `platforms: string[]`, `applicant_message: string | null`. Public `driverJoinSchema` gains the same as camelCase optionals plus `platforms: string[]`.

- [ ] **Step 1: Write failing schema + mapper tests**

Add to `packages/ops-contracts/src/contracts.test.ts` inside the `describe("zod schemas", …)` block:

```ts
  it("accepts a driver payload with all new qualifying fields", () => {
    const result = driverCreateSchema.safeParse({
      name: "Sam K",
      phone: "0700000000",
      city: "Nairobi",
      vehicle_make_model: "Toyota Vitz",
      vehicle_year: "2016",
      vehicle_ownership: "owned",
      routes_areas: "Kilimani, Lavington",
      hours_per_day: "8_12",
      platforms: ["uber", "bolt"],
      applicant_message: "Available weekday evenings",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a driver payload with an unknown vehicle_ownership", () => {
    const result = driverCreateSchema.safeParse({
      name: "Sam K",
      phone: "0700000000",
      city: "Nairobi",
      vehicle_ownership: "spaceship",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a driver payload omitting every new field", () => {
    const result = driverCreateSchema.safeParse({
      name: "Sam K",
      phone: "0700000000",
      city: "Nairobi",
    })
    expect(result.success).toBe(true)
  })
```

Add `driverCreateSchema` to the imports at the top of that file:
`import { driverCreateSchema, leadCreateSchema, waitlistCreateSchema } from "./schemas"`

Create `packages/ops-contracts/src/form-fields.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import {
  DRIVER_FORM_FIELDS,
  driverFormFromRecord,
  driverFormToPayload,
} from "./form-fields"

describe("driver form mappers", () => {
  it("round-trips the new qualifying fields incl. platforms array", () => {
    const record = {
      id: 1,
      name: "Sam K",
      phone: "0700000000",
      email: null,
      city: "Nairobi",
      vehicle_type: "taxi",
      days_per_week: "5_6",
      heard_about: "friend",
      status: "pending",
      notes: null,
      vehicle_make_model: "Toyota Vitz",
      vehicle_year: "2016",
      vehicle_ownership: "owned",
      routes_areas: "Kilimani",
      hours_per_day: "8_12",
      platforms: ["uber", "bolt"],
      applicant_message: "Evenings only",
      created_at: "2026-09-04T00:00:00.000Z",
      updated_at: "2026-09-04T00:00:00.000Z",
    } as never

    const payload = driverFormToPayload(driverFormFromRecord(record))

    expect(payload.vehicle_make_model).toBe("Toyota Vitz")
    expect(payload.vehicle_ownership).toBe("owned")
    expect(payload.hours_per_day).toBe("8_12")
    expect(payload.platforms).toEqual(["uber", "bolt"])
    expect(payload.applicant_message).toBe("Evenings only")
  })

  it("exposes the new fields in DRIVER_FORM_FIELDS", () => {
    const names = DRIVER_FORM_FIELDS.map((f) => f.name)
    expect(names).toEqual(
      expect.arrayContaining([
        "vehicle_make_model",
        "vehicle_ownership",
        "hours_per_day",
        "platforms",
        "applicant_message",
      ]),
    )
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run --project ops-contracts` (or `cd packages/ops-contracts && npx vitest run`)
Expected: FAIL — `driverCreateSchema` has no such keys / `form-fields.test.ts` cannot find new field names.

- [ ] **Step 3: Extend `driverCreateSchema` in `packages/ops-contracts/src/schemas.ts`**

Add the enum imports to the existing import block from `./enums`:
`RIDEHAIL_PLATFORMS`, `VEHICLE_OWNERSHIP`, `HOURS_PER_DAY`.

Change `driverCreateSchema` to:

```ts
export const driverCreateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  city: z.enum(CITIES),
  vehicle_type: z.enum(VEHICLE_TYPES).optional(),
  days_per_week: z.enum(DAYS_PER_WEEK).optional(),
  heard_about: z.enum(HEARD_ABOUT).optional(),
  status: z.enum(DRIVER_STATUSES).optional(),
  notes: z.string().optional(),
  vehicle_make_model: z.string().optional(),
  vehicle_year: z.string().optional(),
  vehicle_ownership: z.enum(VEHICLE_OWNERSHIP).optional(),
  routes_areas: z.string().optional(),
  hours_per_day: z.enum(HOURS_PER_DAY).optional(),
  platforms: z.array(z.enum(RIDEHAIL_PLATFORMS)).optional(),
  applicant_message: z.string().optional(),
})
```

(`driverUpdateSchema = driverCreateSchema.partial()` needs no edit.)

- [ ] **Step 4: Extend `DriverDto` in `packages/ops-contracts/src/types.ts`**

```ts
export type DriverDto = {
  id: number
  name: string
  phone: string
  email: string | null
  city: string
  vehicle_type: string | null
  days_per_week: string | null
  heard_about: string | null
  status: string | null
  notes: string | null
  vehicle_make_model: string | null
  vehicle_year: string | null
  vehicle_ownership: string | null
  routes_areas: string | null
  hours_per_day: string | null
  platforms: string[]
  applicant_message: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 5: Extend `DRIVER_FORM_FIELDS` + mappers in `packages/ops-contracts/src/form-fields.ts`**

Add enum imports to the block from `./enums`: `HOURS_PER_DAY`, `RIDEHAIL_PLATFORMS`, `VEHICLE_OWNERSHIP`.

In `DRIVER_FORM_FIELDS`, insert before the `status` field:

```ts
  {
    name: "vehicle_make_model",
    label: "Vehicle make & model",
    section: "Vehicle",
  },
  { name: "vehicle_year", label: "Vehicle year", section: "Vehicle" },
  {
    name: "vehicle_ownership",
    label: "Ownership",
    options: [
      { value: "owned", label: "Owned" },
      { value: "rented", label: "Rented" },
      { value: "financed", label: "Financed" },
    ],
    section: "Vehicle",
  },
  { name: "routes_areas", label: "Routes / areas", section: "Driving" },
  {
    name: "hours_per_day",
    label: "Hours per day",
    options: [
      { value: "under_4", label: "Under 4" },
      { value: "4_8", label: "4–8" },
      { value: "8_12", label: "8–12" },
      { value: "over_12", label: "Over 12" },
    ],
    section: "Driving",
  },
  {
    name: "platforms",
    label: "Platforms",
    multi: true,
    options: enumOptions(RIDEHAIL_PLATFORMS),
    section: "Driving",
  },
  {
    name: "applicant_message",
    label: "Applicant message",
    type: "multiline",
    section: "Driving",
  },
```

In `driverFormToPayload`, add to the returned object (before `status`):

```ts
    vehicle_make_model: values.vehicle_make_model?.trim() || undefined,
    vehicle_year: values.vehicle_year?.trim() || undefined,
    vehicle_ownership: (values.vehicle_ownership?.trim() || undefined) as DriverCreateInput["vehicle_ownership"],
    routes_areas: values.routes_areas?.trim() || undefined,
    hours_per_day: (values.hours_per_day?.trim() || undefined) as DriverCreateInput["hours_per_day"],
    platforms: splitCsv(values.platforms).filter((p) =>
      (RIDEHAIL_PLATFORMS as readonly string[]).includes(p),
    ) as DriverCreateInput["platforms"],
    applicant_message: values.applicant_message?.trim() || undefined,
```

In `driverFormFromRecord`, add (before `status`):

```ts
    vehicle_make_model: record.vehicle_make_model ?? "",
    vehicle_year: record.vehicle_year ?? "",
    vehicle_ownership: record.vehicle_ownership ?? "",
    routes_areas: record.routes_areas ?? "",
    hours_per_day: record.hours_per_day ?? "",
    platforms: record.platforms.join(", "),
    applicant_message: record.applicant_message ?? "",
```

- [ ] **Step 6: Run the ops-contracts tests — expect PASS**

Run: `cd packages/ops-contracts && npx vitest run`
Expected: PASS (all new cases green).

- [ ] **Step 7: Extend `driverJoinSchema` in BOTH `lead-schemas.ts` copies**

In `apps/api/lib/validation/lead-schemas.ts` AND `apps/web/lib/validation/lead-schemas.ts`, change `driverJoinSchema` to:

```ts
export const driverJoinSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z
    .union([z.literal(""), z.string().email()])
    .optional()
    .transform((v) => (!v || v === "" ? undefined : v)),
  city: z.enum(["Nairobi", "Mombasa", "Kisumu"]),
  vehicleType: z.enum(["taxi", "delivery_bike", "three_wheeler", "other"]),
  daysPerWeek: z.enum(["1_2", "3_4", "5_6", "daily"]),
  heardAbout: z.enum(["whatsapp", "facebook", "friend", "roadside", "other"]),
  vehicleMakeModel: z.string().trim().max(120).optional(),
  vehicleYear: z.string().trim().max(20).optional(),
  vehicleOwnership: z.enum(["owned", "rented", "financed"]).optional(),
  routesAreas: z.string().trim().max(500).optional(),
  hoursPerDay: z.enum(["under_4", "4_8", "8_12", "over_12"]).optional(),
  platforms: z
    .array(z.enum(["uber", "bolt", "little", "faras", "independent"]))
    .optional()
    .default([]),
  applicantMessage: z.string().trim().max(2000).optional(),
  consent: z
    .boolean()
    .refine(
      (val) => val === true,
      "You must agree to the privacy policy and working terms.",
    ),
})
```

- [ ] **Step 8: Write the new fields in `apps/api/app/v1/public/drivers/route.ts`**

In the `prisma.driver.create({ data: { … } })` call, add after `heard_about: parsed.data.heardAbout,`:

```ts
        vehicle_make_model: parsed.data.vehicleMakeModel || null,
        vehicle_year: parsed.data.vehicleYear || null,
        vehicle_ownership: parsed.data.vehicleOwnership || null,
        routes_areas: parsed.data.routesAreas || null,
        hours_per_day: parsed.data.hoursPerDay || null,
        platforms: parsed.data.platforms,
        applicant_message: parsed.data.applicantMessage || null,
```

In the `renderTemplate(AdminAlert, { … })` call for `adminDriverHtml`, change `additionalInfo` to:

```ts
        additionalInfo: [
          `Vehicle: ${parsed.data.vehicleType}`,
          parsed.data.vehicleMakeModel && `Make/model: ${parsed.data.vehicleMakeModel}`,
          parsed.data.vehicleYear && `Year: ${parsed.data.vehicleYear}`,
          parsed.data.vehicleOwnership && `Ownership: ${parsed.data.vehicleOwnership}`,
          `Days/week: ${parsed.data.daysPerWeek}`,
          parsed.data.hoursPerDay && `Hours/day: ${parsed.data.hoursPerDay}`,
          parsed.data.routesAreas && `Routes: ${parsed.data.routesAreas}`,
          parsed.data.platforms.length && `Platforms: ${parsed.data.platforms.join(", ")}`,
          parsed.data.applicantMessage && `Message: ${parsed.data.applicantMessage}`,
        ]
          .filter(Boolean)
          .join(" · "),
```

- [ ] **Step 9: Add the inputs to `apps/web/app/(marketing)/drivers/drivers-client.tsx`**

Add to `defaultValues` (after `heardAbout: "whatsapp",`):

```ts
      vehicleMakeModel: "",
      vehicleYear: "",
      vehicleOwnership: "owned",
      routesAreas: "",
      hoursPerDay: "4_8",
      platforms: [],
      applicantMessage: "",
```

Add a `platforms` toggle helper near the top of the component (after `const { register, handleSubmit, formState, reset } = form`):

```tsx
  const platformsWatch = form.watch("platforms")?.slice() ?? []
  const platformOptions = [
    { value: "uber", label: "Uber" },
    { value: "bolt", label: "Bolt" },
    { value: "little", label: "Little" },
    { value: "faras", label: "Faras" },
    { value: "independent", label: "Independent" },
  ] as const
  function togglePlatform(key: (typeof platformOptions)[number]["value"]) {
    const curr = platformsWatch.slice()
    const next = curr.includes(key) ? curr.filter((v) => v !== key) : [...curr, key]
    form.setValue("platforms", next, { shouldValidate: true })
  }
```

Insert the field markup into the `<form>` after the "How many days a week" `<select>` block and before the "How did you hear about Admobi?" block:

```tsx
              <div className="grid gap-2">
                <Label htmlFor="dr-make">Vehicle make &amp; model</Label>
                <Input id="dr-make" placeholder="Toyota Vitz" {...register("vehicleMakeModel")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dr-year">Vehicle year</Label>
                <Input id="dr-year" inputMode="numeric" placeholder="2016" {...register("vehicleYear")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dr-ownership">Is the vehicle yours?</Label>
                <select id="dr-ownership" className={selectClass} {...register("vehicleOwnership")}>
                  <option value="owned">I own it</option>
                  <option value="rented">I rent it</option>
                  <option value="financed">On finance / loan</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dr-routes">Areas you usually drive</Label>
                <Input id="dr-routes" placeholder="e.g. Kilimani, CBD, Rongai" {...register("routesAreas")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dr-hours">Hours on the road on a typical day</Label>
                <select id="dr-hours" className={selectClass} {...register("hoursPerDay")}>
                  <option value="under_4">Under 4</option>
                  <option value="4_8">4–8</option>
                  <option value="8_12">8–12</option>
                  <option value="over_12">Over 12</option>
                </select>
              </div>

              <fieldset className="space-y-3">
                <legend className="mb-1 text-sm font-medium text-foreground">Which apps do you drive on?</legend>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {platformOptions.map((p) => (
                    <label key={p.value} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        className="border-input accent-primary size-4 rounded border"
                        checked={platformsWatch.includes(p.value)}
                        onChange={() => togglePlatform(p.value)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-2">
                <Label htmlFor="dr-msg">Anything else we should know? (optional)</Label>
                <textarea
                  id="dr-msg"
                  rows={3}
                  className="border-input placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring flex min-h-20 w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
                  {...register("applicantMessage")}
                />
              </div>
```

- [ ] **Step 10: Add `detailFields` + one column to `apps/ops/app/(dashboard)/drivers/drivers-view.tsx`**

Add to the local `type Driver` the same new keys as `DriverDto` (`vehicle_make_model: string | null`, … `platforms: string[]`, `applicant_message: string | null`).

In `detailFields`, insert before the `status` entry:

```tsx
        {
          key: "vehicle_make_model",
          label: "Vehicle",
          render: (r) =>
            [r.vehicle_make_model, r.vehicle_year].filter(Boolean).join(" · ") || "—",
        },
        {
          key: "vehicle_ownership",
          label: "Ownership",
          render: (r) => formatLabel(r.vehicle_ownership),
        },
        { key: "routes_areas", label: "Routes / areas", render: (r) => r.routes_areas ?? "—" },
        {
          key: "hours_per_day",
          label: "Hours / day",
          render: (r) => formatLabel(r.hours_per_day),
        },
        {
          key: "platforms",
          label: "Platforms",
          render: (r) => (r.platforms.length ? r.platforms.map(formatLabel).join(", ") : "—"),
        },
        {
          key: "applicant_message",
          label: "Applicant message",
          render: (r) => r.applicant_message ?? "—",
        },
```

In `columns`, insert before the `status` column:

```tsx
        {
          key: "vehicle_ownership",
          header: "Ownership",
          render: (r) => formatLabel(r.vehicle_ownership),
          csv: (r) => r.vehicle_ownership,
        },
```

- [ ] **Step 11: Add `sections` rows to `apps/ops-mobile/app/(ops)/drivers/[id].tsx`**

In the `"Details"` section's `fields` array, insert before `{ label: "Notes", value: item.notes }`:

```tsx
            { label: "Vehicle", value: detailValue([item.vehicle_make_model, item.vehicle_year].filter(Boolean).join(" · ") || null) },
            { label: "Ownership", value: detailValue(item.vehicle_ownership) },
            { label: "Routes / areas", value: item.routes_areas },
            { label: "Hours / day", value: detailValue(item.hours_per_day) },
            { label: "Platforms", value: detailValue(item.platforms) },
            { label: "Applicant message", value: item.applicant_message },
```

- [ ] **Step 12: Typecheck everything touched**

Run: `npx turbo typecheck --filter=@workspace/ops-contracts --filter=api --filter=web --filter=ops --filter=ops-mobile`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add packages/ops-contracts apps/api apps/web apps/ops apps/ops-mobile
git commit -m "feat(forms): richer driver application fields + ops display"
```

---

## Task 4: Partner fleet vertical

**Files:**
- Modify: `packages/ops-contracts/src/schemas.ts` (`fleetCreateSchema`)
- Modify: `packages/ops-contracts/src/types.ts` (`FleetPartnerDto`)
- Modify: `packages/ops-contracts/src/form-fields.ts` (`FLEET_FORM_FIELDS`, `fleetFormToPayload`, `fleetFormFromRecord`)
- Modify: `packages/ops-contracts/src/contracts.test.ts`, `packages/ops-contracts/src/form-fields.test.ts`
- Modify: `apps/web/lib/validation/lead-schemas.ts` + `apps/api/lib/validation/lead-schemas.ts` (`fleetLeadSchema`)
- Modify: `apps/api/app/v1/public/leads/route.ts` (fleet branch)
- Modify: `apps/web/app/(marketing)/partner-fleet/partner-fleet-form.tsx`
- Modify: `apps/ops/app/(dashboard)/fleet/fleet-view.tsx`
- Modify: `apps/ops-mobile/app/(ops)/fleet/[id].tsx`

**Interfaces:**
- Consumes: `FLEET_EV_STATUS`, `CITIES` from Task 2 / enums; Prisma columns from Task 1.
- Produces: `FleetPartnerDto` gains `taxi_count: string | null`, `bike_count: string | null`, `operating_cities: string[]`, `ev_status: string | null`. Public `fleetLeadSchema` gains `taxiCount`, `bikeCount` (coerced-number-as-string), `operatingCities: string[]`, `evStatus`.

- [ ] **Step 1: Write failing tests**

Add to `contracts.test.ts` `describe("zod schemas")`:

```ts
  it("accepts a fleet payload with the new composition + EV fields", () => {
    const result = fleetCreateSchema.safeParse({
      email: "ops@fleet.co.ke",
      company_name: "Acme Cabs",
      primary_contact_name: "Jo",
      phone: "0700000000",
      city: "Nairobi",
      fleet_types: ["taxi"],
      taxi_count: "40",
      bike_count: "10",
      operating_cities: ["Nairobi", "Mombasa"],
      ev_status: "some",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a fleet payload with an unknown ev_status", () => {
    const result = fleetCreateSchema.safeParse({
      email: "ops@fleet.co.ke",
      company_name: "Acme Cabs",
      primary_contact_name: "Jo",
      phone: "0700000000",
      city: "Nairobi",
      fleet_types: ["taxi"],
      ev_status: "hydrogen",
    })
    expect(result.success).toBe(false)
  })
```

Add `fleetCreateSchema` to that file's import from `./schemas`.

Add to `form-fields.test.ts`:

```ts
import {
  FLEET_FORM_FIELDS,
  fleetFormFromRecord,
  fleetFormToPayload,
} from "./form-fields"

describe("fleet form mappers", () => {
  it("round-trips composition + EV fields incl. operating_cities array", () => {
    const record = {
      id: 1,
      email: "ops@fleet.co.ke",
      company_name: "Acme Cabs",
      primary_contact_name: "Jo",
      phone: "0700000000",
      city: "Nairobi",
      fleet_types: ["taxi"],
      fleet_size: "50",
      vehicles_active: "yes",
      notes: null,
      status: "pending",
      taxi_count: "40",
      bike_count: "10",
      operating_cities: ["Nairobi", "Mombasa"],
      ev_status: "some",
      created_at: "2026-09-04T00:00:00.000Z",
      updated_at: "2026-09-04T00:00:00.000Z",
    } as never

    const payload = fleetFormToPayload(fleetFormFromRecord(record))

    expect(payload.taxi_count).toBe("40")
    expect(payload.bike_count).toBe("10")
    expect(payload.operating_cities).toEqual(["Nairobi", "Mombasa"])
    expect(payload.ev_status).toBe("some")
  })
})
```

- [ ] **Step 2: Run tests, confirm FAIL**

Run: `cd packages/ops-contracts && npx vitest run`
Expected: FAIL on the new fleet cases.

- [ ] **Step 3: Extend `fleetCreateSchema` in `packages/ops-contracts/src/schemas.ts`**

Add `FLEET_EV_STATUS` to the `./enums` import. Then:

```ts
export const fleetCreateSchema = z.object({
  email: z.string().trim().email(),
  company_name: z.string().trim().min(1),
  primary_contact_name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  city: z.enum(CITIES),
  fleet_types: z.array(z.enum(FLEET_TYPES)).min(1, "Select at least one fleet type."),
  fleet_size: z.string().optional(),
  vehicles_active: z.enum(VEHICLES_ACTIVE).optional(),
  notes: z.string().optional(),
  status: z.enum(FLEET_STATUSES).optional(),
  taxi_count: z.string().optional(),
  bike_count: z.string().optional(),
  operating_cities: z.array(z.enum(CITIES)).optional(),
  ev_status: z.enum(FLEET_EV_STATUS).optional(),
})
```

- [ ] **Step 4: Extend `FleetPartnerDto` in `types.ts`**

Add after `status: string | null`:

```ts
  taxi_count: string | null
  bike_count: string | null
  operating_cities: string[]
  ev_status: string | null
```

- [ ] **Step 5: Extend `FLEET_FORM_FIELDS` + mappers in `form-fields.ts`**

Add `FLEET_EV_STATUS` to the `./enums` import. In `FLEET_FORM_FIELDS`, insert before the `status` field:

```ts
  { name: "taxi_count", label: "Number of taxis", section: "Fleet details" },
  { name: "bike_count", label: "Number of bikes", section: "Fleet details" },
  {
    name: "operating_cities",
    label: "Operating cities",
    multi: true,
    options: enumOptions(CITIES),
    section: "Fleet details",
  },
  {
    name: "ev_status",
    label: "Electric vehicles",
    options: [
      { value: "none", label: "None" },
      { value: "some", label: "Some" },
      { value: "mostly", label: "Mostly" },
      { value: "all", label: "All" },
    ],
    section: "Fleet details",
  },
```

In `fleetFormToPayload`, add before `status`:

```ts
    taxi_count: values.taxi_count?.trim() || undefined,
    bike_count: values.bike_count?.trim() || undefined,
    operating_cities: splitCsv(values.operating_cities).filter((c) =>
      (CITIES as readonly string[]).includes(c),
    ) as FleetCreateInput["operating_cities"],
    ev_status: (values.ev_status?.trim() || undefined) as FleetCreateInput["ev_status"],
```

In `fleetFormFromRecord`, add before `status`:

```ts
    taxi_count: record.taxi_count ?? "",
    bike_count: record.bike_count ?? "",
    operating_cities: record.operating_cities.join(", "),
    ev_status: record.ev_status ?? "",
```

- [ ] **Step 6: Run ops-contracts tests — expect PASS**

Run: `cd packages/ops-contracts && npx vitest run`

- [ ] **Step 7: Extend `fleetLeadSchema` in BOTH `lead-schemas.ts` copies**

```ts
export const fleetLeadSchema = z.object({
  audience: z.literal("fleet"),
  fleetOrCompanyName: z.string().trim().min(1),
  primaryContactName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  city: z.enum(["Nairobi", "Mombasa", "Kisumu"]),
  fleetTypes: z
    .array(z.enum(["taxi", "delivery_bike"]))
    .min(1, "Pick at least one fleet type"),
  vehicleCount: z.coerce.number().int().min(1),
  vehiclesActive: z.enum(["yes", "no", "some"]),
  taxiCount: z.coerce.number().int().min(0).optional(),
  bikeCount: z.coerce.number().int().min(0).optional(),
  operatingCities: z
    .array(z.enum(["Nairobi", "Mombasa", "Kisumu"]))
    .optional()
    .default([]),
  evStatus: z.enum(["none", "some", "mostly", "all"]).optional(),
  notes: z.string().trim().optional(),
  consent: z
    .boolean()
    .refine((val) => val === true, "You must agree to the privacy policy."),
})
```

- [ ] **Step 8: Write new fields in the fleet branch of `apps/api/app/v1/public/leads/route.ts`**

In `prisma.fleetPartner.create({ data: { … } })`, add after `vehicles_active: parsed.data.vehiclesActive,`:

```ts
          taxi_count:
            parsed.data.taxiCount != null ? String(parsed.data.taxiCount) : null,
          bike_count:
            parsed.data.bikeCount != null ? String(parsed.data.bikeCount) : null,
          operating_cities: parsed.data.operatingCities,
          ev_status: parsed.data.evStatus || null,
```

In the fleet `renderTemplate(AdminAlert, …)` call, change `additionalInfo` from `parsed.data.notes` to:

```ts
        additionalInfo: [
          `Fleet types: ${parsed.data.fleetTypes.join(", ")}`,
          `Vehicles: ${parsed.data.vehicleCount}`,
          parsed.data.taxiCount != null && `Taxis: ${parsed.data.taxiCount}`,
          parsed.data.bikeCount != null && `Bikes: ${parsed.data.bikeCount}`,
          parsed.data.operatingCities.length &&
            `Operating cities: ${parsed.data.operatingCities.join(", ")}`,
          parsed.data.evStatus && `EVs: ${parsed.data.evStatus}`,
          parsed.data.notes && `Notes: ${parsed.data.notes}`,
        ]
          .filter(Boolean)
          .join(" · "),
```

- [ ] **Step 9: Add inputs to `apps/web/app/(marketing)/partner-fleet/partner-fleet-form.tsx`**

Add to `defaultValues` (after `vehiclesActive: "yes",`):

```ts
      taxiCount: undefined,
      bikeCount: undefined,
      operatingCities: [],
      evStatus: "none",
```

Add an `operatingCities` toggle helper after the existing `fleetTypesWatch` line:

```tsx
  const operatingCitiesWatch = watch("operatingCities")?.slice() ?? []
  function toggleOperatingCity(key: "Nairobi" | "Mombasa" | "Kisumu") {
    const curr = operatingCitiesWatch.slice()
    const next = curr.includes(key) ? curr.filter((v) => v !== key) : [...curr, key]
    setValue("operatingCities", next, { shouldValidate: true })
  }
```

Insert markup after the "Number of vehicles available" block and before the "Are vehicles currently active?" fieldset:

```tsx
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="pf-taxis">Number of taxis</Label>
          <Input id="pf-taxis" type="number" min={0} step={1} {...register("taxiCount", { valueAsNumber: true })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pf-bikes">Number of bikes</Label>
          <Input id="pf-bikes" type="number" min={0} step={1} {...register("bikeCount", { valueAsNumber: true })} />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-3 text-sm font-medium text-foreground">Cities you operate in</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {(["Nairobi", "Mombasa", "Kisumu"] as const).map((city) => (
            <label key={city} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={operatingCitiesWatch.includes(city)}
                onChange={() => toggleOperatingCity(city)}
                className="border-input accent-primary size-4 rounded border"
              />
              <span>{city}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="pf-ev">Does your fleet include electric vehicles?</Label>
        <select id="pf-ev" className={selectClass} {...register("evStatus")}>
          <option value="none">No, none</option>
          <option value="some">Yes, some</option>
          <option value="mostly">Mostly electric</option>
          <option value="all">Fully electric</option>
        </select>
      </div>
```

- [ ] **Step 10: `apps/ops/app/(dashboard)/fleet/fleet-view.tsx` — detail fields + column**

Add the new keys to the local `type FleetPartner`. In `detailFields`, insert before `status`:

```tsx
        { key: "taxi_count", label: "Taxis", render: (r) => r.taxi_count ?? "—" },
        { key: "bike_count", label: "Bikes", render: (r) => r.bike_count ?? "—" },
        {
          key: "operating_cities",
          label: "Operating cities",
          render: (r) => (r.operating_cities.length ? r.operating_cities.join(", ") : "—"),
        },
        {
          key: "ev_status",
          label: "Electric vehicles",
          render: (r) => formatLabel(r.ev_status),
        },
```

In `columns`, insert before `status`:

```tsx
        {
          key: "ev_status",
          header: "EVs",
          render: (r) => formatLabel(r.ev_status),
          csv: (r) => r.ev_status,
        },
```

(If `fleet-view.tsx` does not already import `formatLabel` from `@/lib/format`, add it.)

- [ ] **Step 11: `apps/ops-mobile/app/(ops)/fleet/[id].tsx` — sections rows**

In the `"Fleet details"` section, insert before `{ label: "Notes", value: item.notes }`:

```tsx
            { label: "Taxis", value: item.taxi_count },
            { label: "Bikes", value: item.bike_count },
            { label: "Operating cities", value: detailValue(item.operating_cities) },
            { label: "Electric vehicles", value: detailValue(item.ev_status) },
```

- [ ] **Step 12: Typecheck**

Run: `npx turbo typecheck --filter=@workspace/ops-contracts --filter=api --filter=web --filter=ops --filter=ops-mobile`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add packages/ops-contracts apps/api apps/web apps/ops apps/ops-mobile
git commit -m "feat(forms): fleet composition + EV fields + ops display"
```

---

## Task 5: Start campaign vertical

**Files:**
- Modify: `packages/ops-contracts/src/schemas.ts` (`leadCreateSchema` — new string fields only, NOT `campaign_start_date`)
- Modify: `packages/ops-contracts/src/types.ts` (`LeadDto`)
- Modify: `packages/ops-contracts/src/form-fields.ts` (`LEAD_FORM_FIELDS`, `leadFormToPayload`, `leadFormFromRecord`)
- Modify: `packages/ops-contracts/src/contracts.test.ts`, `.../form-fields.test.ts`
- Modify: `apps/web/lib/validation/lead-schemas.ts` + `apps/api/lib/validation/lead-schemas.ts` (`campaignLeadSchema`)
- Modify: `apps/api/app/v1/public/leads/route.ts` (campaign branch)
- Modify: `apps/web/app/(marketing)/start-campaign/page.tsx`
- Modify: `apps/ops/app/(dashboard)/leads/leads-view.tsx`
- Modify: `apps/ops-mobile/app/(ops)/leads/[id].tsx`

**Interfaces:**
- Consumes: `CAMPAIGN_OBJECTIVES`, `CREATIVE_STATUS` from Task 2; `campaign_start_date` column (already existed).
- Produces: `LeadDto` gains `objective: string | null`, `industry: string | null`, `creative_status: string | null`, `target_audience: string | null` (`campaign_start_date` already present). Public `campaignLeadSchema` gains `objective`, `industry`, `creativeStatus`, `targetAudience`, `campaignStartDate` (all optional strings).

- [ ] **Step 1: Write failing tests**

Add to `contracts.test.ts` `describe("zod schemas")`:

```ts
  it("accepts a lead payload with the new campaign-intent fields", () => {
    const result = leadCreateSchema.safeParse({
      contact_name: "Jane Doe",
      email: "jane@brand.co.ke",
      company_name: "Brand Co",
      cities: ["Nairobi"],
      ad_formats: ["taxi_top"],
      objective: "launch",
      industry: "FMCG",
      creative_status: "needs_design",
      target_audience: "Urban 18-34",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a lead payload with an unknown creative_status", () => {
    const result = leadCreateSchema.safeParse({
      contact_name: "Jane Doe",
      email: "jane@brand.co.ke",
      company_name: "Brand Co",
      creative_status: "telepathy",
    })
    expect(result.success).toBe(false)
  })
```

Add to `form-fields.test.ts`:

```ts
import {
  LEAD_FORM_FIELDS,
  leadFormFromRecord,
  leadFormToPayload,
} from "./form-fields"

describe("lead form mappers", () => {
  it("round-trips the new campaign-intent fields", () => {
    const record = {
      id: 1,
      contact_name: "Jane Doe",
      email: "jane@brand.co.ke",
      company_name: "Brand Co",
      phone: null,
      audience: "campaign",
      cities: ["Nairobi"],
      ad_formats: ["taxi_top"],
      duration: "1_week",
      budget_range: "not_sure",
      campaign_start_date: null,
      additional_info: null,
      status: "new",
      objective: "launch",
      industry: "FMCG",
      creative_status: "needs_design",
      target_audience: "Urban 18-34",
      created_at: "2026-09-04T00:00:00.000Z",
      updated_at: "2026-09-04T00:00:00.000Z",
    } as never

    const payload = leadFormToPayload(leadFormFromRecord(record))
    expect(payload.objective).toBe("launch")
    expect(payload.industry).toBe("FMCG")
    expect(payload.creative_status).toBe("needs_design")
    expect(payload.target_audience).toBe("Urban 18-34")
  })
})
```

- [ ] **Step 2: Run tests — confirm FAIL**

Run: `cd packages/ops-contracts && npx vitest run`

- [ ] **Step 3: Extend `leadCreateSchema` in `schemas.ts`**

Add `CAMPAIGN_OBJECTIVES`, `CREATIVE_STATUS` to the `./enums` import. Then:

```ts
export const leadCreateSchema = z.object({
  contact_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  company_name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  cities: z.array(z.enum(LEAD_CITIES)).default([]),
  ad_formats: z.array(z.enum(AD_FORMATS)).default([]),
  duration: z.string().optional(),
  budget_range: z.enum(BUDGET_RANGES).optional(),
  additional_info: z.string().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  objective: z.enum(CAMPAIGN_OBJECTIVES).optional(),
  industry: z.string().optional(),
  creative_status: z.enum(CREATIVE_STATUS).optional(),
  target_audience: z.string().optional(),
})
```

Do **not** add `campaign_start_date` here — see Global Constraints.

- [ ] **Step 4: Extend `LeadDto` in `types.ts`**

Add after `campaign_start_date: string | null`:

```ts
  objective: string | null
  industry: string | null
  creative_status: string | null
  target_audience: string | null
```

- [ ] **Step 5: Extend `LEAD_FORM_FIELDS` + mappers in `form-fields.ts`**

Add `CAMPAIGN_OBJECTIVES`, `CREATIVE_STATUS` to the `./enums` import. In `LEAD_FORM_FIELDS`, insert before the `status` field:

```ts
  {
    name: "objective",
    label: "Objective",
    options: enumOptions(CAMPAIGN_OBJECTIVES),
    section: "Campaign",
  },
  { name: "industry", label: "Industry", section: "Campaign" },
  {
    name: "creative_status",
    label: "Creative status",
    options: [
      { value: "ready", label: "Artwork ready" },
      { value: "needs_design", label: "Needs design help" },
      { value: "not_sure", label: "Not sure yet" },
    ],
    section: "Campaign",
  },
  {
    name: "target_audience",
    label: "Target audience",
    type: "multiline",
    section: "Notes",
  },
```

In `leadFormToPayload`, add to the returned object (before `status`):

```ts
    objective: (values.objective?.trim() || undefined) as LeadCreateInput["objective"],
    industry: values.industry?.trim() || undefined,
    creative_status: (values.creative_status?.trim() || undefined) as LeadCreateInput["creative_status"],
    target_audience: values.target_audience?.trim() || undefined,
```

In `leadFormFromRecord`, add:

```ts
    objective: record.objective ?? "",
    industry: record.industry ?? "",
    creative_status: record.creative_status ?? "",
    target_audience: record.target_audience ?? "",
```

- [ ] **Step 6: Run ops-contracts tests — expect PASS**

Run: `cd packages/ops-contracts && npx vitest run`

- [ ] **Step 7: Extend `campaignLeadSchema` in BOTH `lead-schemas.ts` copies**

```ts
export const campaignLeadSchema = z.object({
  audience: z.literal("campaign"),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  company: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  cities: z
    .array(z.enum(["Nairobi", "Mombasa", "Kisumu", "All"]))
    .min(1, "Pick at least one city"),
  adFormats: z
    .array(z.enum(["taxi_top", "delivery_bike"]))
    .min(1, "Pick at least one format"),
  duration: z.enum(["1_day", "1_week", "2_weeks", "1_month", "ongoing"]),
  budget: z.enum(["under_50k", "50k_150k", "150k_500k", "500k_plus", "not_sure"]),
  objective: z
    .enum(["awareness", "launch", "promo", "footfall", "other"])
    .optional(),
  industry: z.string().trim().max(120).optional(),
  campaignStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
    .optional()
    .or(z.literal("")),
  creativeStatus: z.enum(["ready", "needs_design", "not_sure"]).optional(),
  targetAudience: z.string().trim().max(2000).optional(),
  brief: z.string().trim().optional(),
  consent: z
    .boolean()
    .refine((val) => val === true, "You must agree to the privacy policy."),
})
```

- [ ] **Step 8: Write new fields in the campaign branch of `apps/api/app/v1/public/leads/route.ts`**

Change `campaign_start_date: null,` to:

```ts
          campaign_start_date: parsed.data.campaignStartDate
            ? new Date(parsed.data.campaignStartDate)
            : null,
```

Add after `additional_info: parsed.data.brief || '',`:

```ts
          objective: parsed.data.objective || null,
          industry: parsed.data.industry || null,
          creative_status: parsed.data.creativeStatus || null,
          target_audience: parsed.data.targetAudience || null,
```

In the campaign `renderTemplate(AdminAlert, …)` call, change `additionalInfo: parsed.data.brief` to:

```ts
        additionalInfo: [
          parsed.data.objective && `Objective: ${parsed.data.objective}`,
          parsed.data.industry && `Industry: ${parsed.data.industry}`,
          parsed.data.campaignStartDate && `Start: ${parsed.data.campaignStartDate}`,
          parsed.data.creativeStatus && `Creative: ${parsed.data.creativeStatus}`,
          parsed.data.targetAudience && `Audience: ${parsed.data.targetAudience}`,
          parsed.data.brief && `Brief: ${parsed.data.brief}`,
        ]
          .filter(Boolean)
          .join(" · "),
```

- [ ] **Step 9: Add inputs to `apps/web/app/(marketing)/start-campaign/page.tsx`**

Add to `defaultValues` (after `budget: "not_sure",`):

```ts
      objective: undefined,
      industry: "",
      campaignStartDate: "",
      creativeStatus: undefined,
      targetAudience: "",
```

Insert markup after the "Estimated budget range" block and before the "Brief (optional)" block:

```tsx
            <div className="grid gap-2">
              <Label htmlFor="sc-objective">Campaign objective</Label>
              <select id="sc-objective" className={selectClass} {...register("objective")}>
                <option value="">Select…</option>
                <option value="awareness">Brand awareness</option>
                <option value="launch">Product / service launch</option>
                <option value="promo">Promotion / offer</option>
                <option value="footfall">Drive footfall / store visits</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sc-industry">Industry</Label>
              <Input id="sc-industry" placeholder="e.g. FMCG, fintech, retail" {...register("industry")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sc-start">Preferred start date</Label>
              <Input id="sc-start" type="date" {...register("campaignStartDate")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sc-creative">Creative status</Label>
              <select id="sc-creative" className={selectClass} {...register("creativeStatus")}>
                <option value="">Select…</option>
                <option value="ready">Artwork ready to go</option>
                <option value="needs_design">Need design help</option>
                <option value="not_sure">Not sure yet</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sc-audience">Who are you trying to reach? (optional)</Label>
              <textarea
                id="sc-audience"
                rows={3}
                placeholder="Age, location, interests, the customer you picture."
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring/50 aria-invalid:border-destructive focus-visible:border-ring flex min-h-20 w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
                {...register("targetAudience")}
              />
            </div>
```

- [ ] **Step 10: `apps/ops/app/(dashboard)/leads/leads-view.tsx` — detail fields + column**

Add the new keys + `campaign_start_date: string | null` to the local `type Lead`. In `detailFields`, insert before `status`:

```tsx
        {
          key: "objective",
          label: "Objective",
          render: (r) => formatLabel(r.objective),
        },
        { key: "industry", label: "Industry", render: (r) => r.industry ?? "—" },
        {
          key: "campaign_start_date",
          label: "Start date",
          render: (r) => (r.campaign_start_date ? formatDateTime(r.campaign_start_date) : "—"),
        },
        {
          key: "creative_status",
          label: "Creative status",
          render: (r) => formatLabel(r.creative_status),
        },
        {
          key: "target_audience",
          label: "Target audience",
          render: (r) => r.target_audience ?? "—",
        },
```

In `columns`, insert before `status`:

```tsx
        {
          key: "objective",
          header: "Objective",
          render: (r) => formatLabel(r.objective),
          csv: (r) => r.objective,
        },
```

- [ ] **Step 11: `apps/ops-mobile/app/(ops)/leads/[id].tsx` — sections rows**

In the `"Campaign"` section, insert before `{ label: "Notes", value: item.additional_info }` (note `Start date` already renders `item.campaign_start_date` — keep it):

```tsx
            { label: "Objective", value: detailValue(item.objective) },
            { label: "Industry", value: item.industry },
            { label: "Creative status", value: detailValue(item.creative_status) },
            { label: "Target audience", value: item.target_audience },
```

- [ ] **Step 12: Typecheck**

Run: `npx turbo typecheck --filter=@workspace/ops-contracts --filter=api --filter=web --filter=ops --filter=ops-mobile`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add packages/ops-contracts apps/api apps/web apps/ops apps/ops-mobile
git commit -m "feat(forms): campaign intent + creative-readiness fields + ops display"
```

---

## Task 6: Media kit vertical

**Files:**
- Modify: `packages/ops-contracts/src/schemas.ts` (`mediaKitCreateSchema`)
- Modify: `packages/ops-contracts/src/types.ts` (`MediaKitRequestDto`)
- Modify: `packages/ops-contracts/src/form-fields.ts` (`MEDIA_KIT_FORM_FIELDS`, `mediaKitFormToPayload`, `mediaKitFormFromRecord`)
- Modify: `packages/ops-contracts/src/contracts.test.ts`
- Modify: `apps/web/lib/validation/lead-schemas.ts` + `apps/api/lib/validation/lead-schemas.ts` (`mediaKitSchema`)
- Modify: `apps/api/app/v1/public/media-kit/route.ts`
- Modify: `apps/web/app/(marketing)/media-kit/page.tsx`
- Modify: `apps/ops/app/(dashboard)/media-kit/media-kit-view.tsx`
- Modify: `apps/ops-mobile/app/(ops)/media-kit/[id].tsx`

**Interfaces:**
- Produces: `MediaKitRequestDto` gains `company: string | null`, `role: string | null`, `use_case: string | null`. Public `mediaKitSchema` gains `company`, `role`, `useCase` (optional strings).

- [ ] **Step 1: Write failing test**

Add to `contracts.test.ts` `describe("zod schemas")`:

```ts
  it("accepts a media-kit payload with the optional profile fields", () => {
    const result = mediaKitCreateSchema.safeParse({
      name: "Ada",
      email: "ada@agency.co.ke",
      company: "Agency X",
      role: "Media planner",
      use_case: "Q1 taxi-top campaign for a bank client",
    })
    expect(result.success).toBe(true)
  })

  it("still accepts a bare media-kit payload", () => {
    const result = mediaKitCreateSchema.safeParse({ name: "Ada", email: "ada@agency.co.ke" })
    expect(result.success).toBe(true)
  })
```

Add `mediaKitCreateSchema` to that file's import from `./schemas`.

- [ ] **Step 2: Run — confirm FAIL**

Run: `cd packages/ops-contracts && npx vitest run`

- [ ] **Step 3: Extend `mediaKitCreateSchema` in `schemas.ts`**

```ts
export const mediaKitCreateSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  company: z.string().optional(),
  role: z.string().optional(),
  use_case: z.string().optional(),
})
```

- [ ] **Step 4: Extend `MediaKitRequestDto` in `types.ts`**

```ts
export type MediaKitRequestDto = {
  id: number
  name: string
  email: string
  company: string | null
  role: string | null
  use_case: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 5: Extend `MEDIA_KIT_FORM_FIELDS` + mappers in `form-fields.ts`**

```ts
export const MEDIA_KIT_FORM_FIELDS: FormFieldDef[] = [
  { name: "name", label: "Name", required: true, section: "Contact" },
  { name: "email", label: "Email", type: "email", required: true, section: "Contact" },
  { name: "company", label: "Company", section: "Details" },
  { name: "role", label: "Role", section: "Details" },
  { name: "use_case", label: "Evaluating for", type: "multiline", section: "Details" },
]
```

`mediaKitFormToPayload`:

```ts
export function mediaKitFormToPayload(
  values: Record<string, string>,
): MediaKitCreateInput | MediaKitUpdateInput {
  return {
    name: values.name?.trim(),
    email: values.email?.trim(),
    company: values.company?.trim() || undefined,
    role: values.role?.trim() || undefined,
    use_case: values.use_case?.trim() || undefined,
  }
}
```

`mediaKitFormFromRecord`:

```ts
export function mediaKitFormFromRecord(
  record: MediaKitRequestDto,
): Record<string, string> {
  return {
    name: record.name,
    email: record.email,
    company: record.company ?? "",
    role: record.role ?? "",
    use_case: record.use_case ?? "",
  }
}
```

- [ ] **Step 6: Run ops-contracts tests — expect PASS**

Run: `cd packages/ops-contracts && npx vitest run`

- [ ] **Step 7: Extend `mediaKitSchema` in BOTH `lead-schemas.ts` copies**

```ts
export const mediaKitSchema = z.object({
  name: z.string().trim().min(1, "Enter your name"),
  email: z.string().trim().email("Use a valid email address."),
  company: z.string().trim().max(120).optional(),
  role: z.string().trim().max(120).optional(),
  useCase: z.string().trim().max(2000).optional(),
})
```

- [ ] **Step 8: Write new fields in `apps/api/app/v1/public/media-kit/route.ts`**

In `prisma.mediaKitRequest.create({ data: { … } })`:

```ts
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        company: parsed.data.company || null,
        role: parsed.data.role || null,
        use_case: parsed.data.useCase || null,
      },
```

- [ ] **Step 9: Add inputs to `apps/web/app/(marketing)/media-kit/page.tsx`**

Add to `defaultValues`: `company: "", role: "", useCase: ""`.

Insert markup after the email `<div className="grid gap-2">` block and before the `{submitError ? …}` line:

```tsx
            <div className="grid gap-2">
              <Label htmlFor="mk-company">Company (optional)</Label>
              <Input id="mk-company" autoComplete="organization" {...register("company")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mk-role">Your role (optional)</Label>
              <Input id="mk-role" autoComplete="organization-title" {...register("role")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mk-usecase">What are you evaluating Admobi for? (optional)</Label>
              <Input id="mk-usecase" {...register("useCase")} />
            </div>
```

- [ ] **Step 10: `apps/ops/app/(dashboard)/media-kit/media-kit-view.tsx`**

Add `company`, `role`, `use_case` (`string | null`) to the local record type. Add `detailFields` (if the file currently relies on the `columns`→`detailRows` fallback, add an explicit `detailFields` prop mirroring the columns plus these). Minimum, add these three detail rows:

```tsx
        { key: "company", label: "Company", render: (r) => r.company ?? "—" },
        { key: "role", label: "Role", render: (r) => r.role ?? "—" },
        { key: "use_case", label: "Evaluating for", render: (r) => r.use_case ?? "—" },
```

Add one column before any trailing date/actions column:

```tsx
        { key: "company", header: "Company", render: (r) => r.company ?? "—", csv: (r) => r.company },
```

- [ ] **Step 11: `apps/ops-mobile/app/(ops)/media-kit/[id].tsx` — sections rows**

In the `"Contact"` section `fields`:

```tsx
          fields: [
            { label: "Email", value: item.email, copyable: true },
            { label: "Company", value: item.company },
            { label: "Role", value: item.role },
            { label: "Evaluating for", value: item.use_case },
          ],
```

- [ ] **Step 12: Typecheck**

Run: `npx turbo typecheck --filter=@workspace/ops-contracts --filter=api --filter=web --filter=ops --filter=ops-mobile`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add packages/ops-contracts apps/api apps/web apps/ops apps/ops-mobile
git commit -m "feat(forms): media kit company/role/use-case + ops display"
```

---

## Task 7: Waitlist vertical

**Files:**
- Modify: `packages/ops-contracts/src/schemas.ts` (`waitlistCreateSchema`)
- Modify: `packages/ops-contracts/src/types.ts` (`WaitlistEntryDto`)
- Modify: `packages/ops-contracts/src/form-fields.ts` (`WAITLIST_FORM_FIELDS`, `waitlistFormToPayload`, `waitlistFormFromRecord`)
- Modify: `packages/ops-contracts/src/contracts.test.ts`
- Modify: `apps/web/lib/validation/lead-schemas.ts` + `apps/api/lib/validation/lead-schemas.ts` (`waitlistSchema`)
- Modify: `apps/api/app/v1/public/waitlist/route.ts` (raw SQL upsert)
- Modify: `apps/web/components/landing/get-started-section.tsx`
- Modify: `apps/ops/app/(dashboard)/waitlist/waitlist-view.tsx`
- Modify: `apps/ops-mobile/app/(ops)/waitlist/[id].tsx`

**Interfaces:**
- Consumes: `WAITLIST_PERSONA` from Task 2.
- Produces: `WaitlistEntryDto` gains `name: string | null`, `persona: string | null`. Public `waitlistSchema` gains `name`, `persona` (optional).

- [ ] **Step 1: Write failing test**

Add to `contracts.test.ts` `describe("zod schemas")`:

```ts
  it("accepts a waitlist payload with name + persona", () => {
    const result = waitlistCreateSchema.safeParse({
      email: "hi@example.com",
      name: "Riri",
      persona: "advertiser",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a waitlist payload with an unknown persona", () => {
    const result = waitlistCreateSchema.safeParse({
      email: "hi@example.com",
      persona: "astronaut",
    })
    expect(result.success).toBe(false)
  })
```

(`waitlistCreateSchema` is already imported in this file.)

- [ ] **Step 2: Run — confirm FAIL**

Run: `cd packages/ops-contracts && npx vitest run`

- [ ] **Step 3: Extend `waitlistCreateSchema` in `schemas.ts`**

Add `WAITLIST_PERSONA` to the `./enums` import.

```ts
export const waitlistCreateSchema = z.object({
  email: z.string().trim().email(),
  source: z.string().optional(),
  name: z.string().optional(),
  persona: z.enum(WAITLIST_PERSONA).optional(),
})
```

- [ ] **Step 4: Extend `WaitlistEntryDto` in `types.ts`**

```ts
export type WaitlistEntryDto = {
  id: number
  email: string
  source: string | null
  name: string | null
  persona: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 5: Extend `WAITLIST_FORM_FIELDS` + mappers in `form-fields.ts`**

```ts
export const WAITLIST_FORM_FIELDS: FormFieldDef[] = [
  { name: "email", label: "Email", type: "email", required: true, section: "Details" },
  { name: "name", label: "Name", section: "Details" },
  {
    name: "persona",
    label: "They are a",
    options: [
      { value: "advertiser", label: "Advertiser" },
      { value: "driver", label: "Driver" },
      { value: "fleet", label: "Fleet operator" },
      { value: "other", label: "Other" },
    ],
    section: "Details",
  },
  { name: "source", label: "Source", placeholder: "homepage", section: "Details" },
]
```

`waitlistFormToPayload`:

```ts
export function waitlistFormToPayload(
  values: Record<string, string>,
): WaitlistCreateInput | WaitlistUpdateInput {
  return {
    email: values.email?.trim(),
    source: values.source?.trim() || undefined,
    name: values.name?.trim() || undefined,
    persona: (values.persona?.trim() || undefined) as WaitlistCreateInput["persona"],
  }
}
```

`waitlistFormFromRecord`:

```ts
export function waitlistFormFromRecord(
  record: WaitlistEntryDto,
): Record<string, string> {
  return {
    email: record.email,
    source: record.source ?? "",
    name: record.name ?? "",
    persona: record.persona ?? "",
  }
}
```

- [ ] **Step 6: Run ops-contracts tests — expect PASS**

Run: `cd packages/ops-contracts && npx vitest run`

- [ ] **Step 7: Extend `waitlistSchema` in BOTH `lead-schemas.ts` copies**

```ts
export const waitlistSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").email("Use a valid email address."),
  name: z.string().trim().max(120).optional(),
  persona: z.enum(["advertiser", "driver", "fleet", "other"]).optional(),
})
```

- [ ] **Step 8: Update the raw SQL upsert in `apps/api/app/v1/public/waitlist/route.ts`**

Add `name` and `persona` to `type WaitlistUpsertRow` (`name: string | null`, `persona: string | null`).

Change the `pool.query` call to:

```ts
    const result = await pool.query<WaitlistUpsertRow>(
      `
      INSERT INTO waitlist_entries (email, source, name, persona, created_at, updated_at)
      VALUES ($1, 'homepage', $2, $3, now(), now())
      ON CONFLICT (email) DO UPDATE
        SET deleted_at = NULL,
            deleted_by_email = NULL,
            name = COALESCE(EXCLUDED.name, waitlist_entries.name),
            persona = COALESCE(EXCLUDED.persona, waitlist_entries.persona),
            updated_at = now()
      RETURNING id, email, source, name, persona, created_at, updated_at,
        deleted_at, deleted_by_email, (xmax = 0) AS inserted
      `,
      [parsed.data.email, parsed.data.name ?? null, parsed.data.persona ?? null],
    )
```

Add `name: row.name, persona: row.persona,` to the `const data = { … }` object.

- [ ] **Step 9: Add inputs to `apps/web/components/landing/get-started-section.tsx`**

Add state after `const [email, setEmail] = useState("")`:

```tsx
  const [name, setName] = useState("")
  const [persona, setPersona] = useState("")
```

In `onNotify`, change the body to:

```tsx
      body: JSON.stringify({
        email,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(persona ? { persona } : {}),
      }),
```

In `handleReset`, add `setName(""); setPersona("")`.

Add fields inside the `<form id="waitlist" …>`, before the existing email `<Label>` / input row:

```tsx
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                aria-label="Your name (optional)"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={status === "loading"}
                className="sm:flex-1"
              />
              <select
                aria-label="I am a"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                disabled={status === "loading"}
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-lg border bg-transparent px-3 py-1 text-base outline-none focus-visible:ring-3 sm:w-48 md:text-sm"
              >
                <option value="">I am a…</option>
                <option value="advertiser">Advertiser</option>
                <option value="driver">Driver</option>
                <option value="fleet">Fleet operator</option>
                <option value="other">Other</option>
              </select>
            </div>
```

- [ ] **Step 10: `apps/ops/app/(dashboard)/waitlist/waitlist-view.tsx`**

Add `name`, `persona` (`string | null`) to the local record type. Add an explicit `detailFields` (or extend the existing one) with:

```tsx
        { key: "name", label: "Name", render: (r) => r.name ?? "—" },
        { key: "persona", label: "Persona", render: (r) => formatLabel(r.persona) },
```

Add one column before the trailing date/actions:

```tsx
        { key: "persona", header: "Persona", render: (r) => formatLabel(r.persona), csv: (r) => r.persona },
```

(Add the `formatLabel` import from `@/lib/format` if missing.)

- [ ] **Step 11: `apps/ops-mobile/app/(ops)/waitlist/[id].tsx` — sections rows**

In the `"Details"` section `fields`, insert after `{ label: "Email", value: item.email, copyable: true }`:

```tsx
            { label: "Name", value: item.name },
            { label: "Persona", value: detailValue(item.persona) },
```

- [ ] **Step 12: Typecheck**

Run: `npx turbo typecheck --filter=@workspace/ops-contracts --filter=api --filter=web --filter=ops --filter=ops-mobile`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add packages/ops-contracts apps/api apps/web apps/ops apps/ops-mobile
git commit -m "feat(forms): waitlist name + persona + ops display"
```

---

## Task 8: Full build gate + smoke checklist

**Files:** none modified (verification only; fix-forward if anything fails).

- [ ] **Step 1: Full monorepo typecheck**

Run: `npm run typecheck`
Expected: all packages PASS. Fix any DTO / schema / form-field drift before continuing.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors (pre-existing warnings are fine).

- [ ] **Step 3: Tests**

Run: `npm run test`
Expected: PASS, including the new `contracts.test.ts` cases and `form-fields.test.ts`.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: every app builds. Prisma client regenerates during `apps/web` / `apps/api` build.

- [ ] **Step 5: Prisma schema check**

Run: `cd apps/web && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`.

- [ ] **Step 6: Manual smoke (local, requires the DB migration to have been run against dev)**

Run: `npm run db:public-forms-fields -w apps/web` (dev DB), then start `apps/api`, `apps/web`, `apps/ops` dev servers.

For **each** of `/drivers`, `/partner-fleet`, `/start-campaign`, `/media-kit`, and the homepage waitlist:
- Fill every field including the new ones, submit, confirm the success state.
- In `apps/ops`, open that entity's list → click the new row → confirm every new field renders in the detail dialog (arrays comma-joined, empties as "—").
- Confirm the one new table column shows.

- [ ] **Step 7: e2e smoke**

Run: `npx playwright test e2e/marketing-smoke.spec.ts`
Expected: PASS.

- [ ] **Step 8: Update graphify + final commit if anything changed**

```bash
graphify update .
git add -A
git commit -m "chore: graphify refresh after public-form fields" || true
```

---

## Self-Review

**1. Spec coverage:**
- Drivers fields (make/model, year, ownership, routes, hours, platforms, applicant_message) → Task 3 ✓
- Fleet fields (taxi_count, bike_count, operating_cities, ev_status) → Task 4 ✓
- Campaign fields (objective, industry, campaign_start_date wiring, creative_status, target_audience) → Task 5 ✓
- Media kit (company, role, use_case) → Task 6 ✓
- Waitlist (name, persona) → Task 7 ✓
- Additive SQL + npm scripts, no `prisma migrate` → Task 1 ✓
- Enums in ops-contracts → Task 2 ✓
- Zod schema triple (web / api / ops-contracts) → each vertical's Steps 3 & 7 ✓
- API routes write fields + enrich AdminAlert → each vertical's Step 8 ✓
- Web form components → each vertical's Step 9 ✓
- Ops console detail + column → each vertical's Step 10 ✓
- Ops-mobile detail sections → each vertical's Step 11 ✓
- Ops-mobile forms auto-derive from form-fields (no per-field work) → covered by Task 2/3–7 form-fields edits; `detailValue()` already handles arrays (spec's "sanity-check" → confirmed, no change needed) ✓
- Tests (contracts.test.ts + form-fields.test.ts) → Tasks 3–7 Step 1 ✓
- Build gate → Task 8 ✓
- Rollout note (operator runs SQL before deploy) → Task 1 closing note ✓

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Media-kit/waitlist ops-view steps say "add explicit detailFields if the file uses the columns fallback" — this is a real conditional, not a placeholder; the concrete rows to add are given.

**3. Type consistency:** DTO field names (snake_case) match Prisma columns (Task 1) and `*FormFromRecord` reads. Public schema fields are camelCase (`vehicleMakeModel`, `taxiCount`, `campaignStartDate`, `useCase`) and the API routes map camelCase→snake_case explicitly. `driverFormToPayload` casts to `DriverCreateInput["…"]` — matches the `schemas.ts` key names. `splitCsv` / `.join(", ")` used consistently for every array field (`platforms`, `operating_cities`), mirroring the existing `cities` / `fleet_types` handling.

**Known limitation (documented, not fixed here):** `SimpleFormDialog` in `apps/ops/components/entity-page.tsx` renders any field with `options` as a single-select, so `multi: true` fields (`platforms`, `operating_cities` — like the existing `cities` / `ad_formats`) are single-select in the ops *web* add/edit dialog. Ops-mobile handles multi correctly. Detail display (the spec's "read and display" requirement) is unaffected. Fixing the web dialog's multi-select is out of scope for this plan.
