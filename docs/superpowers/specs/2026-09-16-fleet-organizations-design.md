# Fleet Organizations (Driver-Side Orgs) — Design

**Date:** 2026-09-16
**Status:** Draft for review — **not approved for planning**. Two open items in §10
are potential blockers.
**Scope:** `apps/web/prisma`, `apps/api`, `apps/driver-web`, `apps/driver-mobile`,
`apps/ops`, a new fleet surface.

Adds an organization model on the **driver side**: a fleet account (Hakki and
similar) that enrols drivers, registers vehicles, and tracks the per-vehicle
compliance those vehicles need in order to carry advertising.

Related: [Advertiser Organizations & RBAC](./2026-09-07-advertiser-organizations-design.md)
(§12 of which argued against this — see §12 below for what changed) ·
[AUTH.md](../../shared/AUTH.md)

---

## 1. Problem

Admobi's driver side models exactly one actor: an individual driver, via
`DriverProfile` keyed on `driver_clerk_user_id`. There is no way to represent an
organization that brings many drivers to the platform at once.

The immediate case is **Hakki Africa** — a Nairobi vehicle financier
([hakki.co.ke](https://hakki.co.ke/)) that lends drivers up to 70% of a car's
value and has partnered with Bolt to finance 1,500 vehicles. Their borrowers pay
roughly KSh 40,000/month and want advertising revenue to offset it. Hakki wants
one dashboard across their book; Admobi wants the supply.

Three things make this awkward today:

1. **No fleet actor exists.** `FleetPartner` ([schema.prisma:42](../../../apps/web/prisma/schema.prisma#L42))
   is a marketing lead-capture row — `company_name`, `taxi_count`, `status:
   pending|verified|active`, `deleted_at`. No `clerk_user_id`, no login.
2. **No vehicle exists.** Campaigns, documents and compliance all hang off
   people. A logbook, an insurance certificate and an advertising licence all
   belong to a *vehicle*, and have nowhere to live.
3. **Advertising on a vehicle is licensed per vehicle, per county, per year**
   (§8). At Hakki's scale that is a KSh 60M/year exposure that nobody can track
   in a spreadsheet.

### 1.1 What this design does *not* unlock

**Admobi does not model playout or earnings at all.** There is no `Playout`,
`ProofOfPlay`, `Earning`, `Payout` or `Wallet` model in the schema — only payout
*destination* fields on `DriverProfile` (`payout_method`,
`payout_mpesa_msisdn`, `payout_bank_*`).

Hakki's headline ask — *"show me which of my vehicles are earning"* — is
therefore **downstream of a system that does not exist**. This design delivers
enrolment, the vehicle register and compliance tracking. It cannot deliver an
earnings dashboard, and no phase here should be sold as doing so. See §11.

---

## 2. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Are drivers members of the fleet org? | **No.** Fleet *staff* are members. Drivers are linked counterparties. | §3. A driver's account predates and outlives any fleet relationship, and the privacy consequences of membership are unacceptable (§7). |
| What is the unit of supply? | **`Vehicle`**, identified by number plate. | Licences, insurance, logbooks and screens all attach to a vehicle, not a person. A vehicle with no driver still exists and still counts. |
| When is the logbook captured? | **Later, by either the fleet or the driver.** `logbook_number` is nullable from the start. | Explicit product decision — enrolment must not stall on document collection. |
| Clerk instance | **Reuse the driver instance.** A `FleetMember` row distinguishes the actor. | Avoids a fourth billable instance (same reasoning as advertiser §3.1), and lets one person be both a driver and a small fleet owner — common in Kenya. |
| `FleetPartner` | **Stays a lead table.** `FleetOrg` is the live tenant, optionally linked back to the lead it came from. | The lead row carries triage and soft-delete fields that do not belong on a tenant. |
| Shared tables with advertiser orgs | **No.** Separate models, same *pattern*. | Advertiser §12 rejected a shared `Organization` with a type discriminator. Still right — the permission sets and the member semantics differ. |

---

## 3. Approach: three relationships, not one

The mistake to avoid is collapsing everything into "membership". There are three
distinct relationships with different lifetimes and different access rules.

```
FleetOrg (Hakki)
   │
   ├── members ──────────▶ Fleet staff        tenancy — owner, ops, finance
   │                                          peers over a shared pool
   │
   ├── driver links ─────▶ Driver             relationship — enrolled, consenting,
   │                                          keeps their own account + dashboard
   │
   └── vehicles ─────────▶ Vehicle            asset — plate-identified
                              │               permits, documents, devices
                              └── assignment ──▶ Driver (over time)
```

- **Membership** is Hakki's own staff. This is a genuine tenancy problem and it
  is the advertiser model almost exactly: peers over a shared pool, with roles so
  a dispatcher cannot see finance.
- **Driver links** are the financing/enrolment relationship. Many-to-many over
  time, ends without deleting anything, and **requires the driver's consent**.
- **Vehicle assignment** is possession over a time window. It is what earnings,
  playout and device custody will eventually attach to.

---

## 4. Data model

All additive. Nothing existing changes shape.

```prisma
/// A fleet tenant — a financier, operator or aggregator bringing drivers and
/// vehicles to the platform. Distinct from FleetPartner, which stays a
/// marketing lead row; lead_id traces where this org came from.
model FleetOrg {
  id         Int      @id @default(autoincrement())
  name       String
  lead_id    Int?     // FleetPartner this was converted from, if any
  status     String   @default("active") // active | suspended
  /// Finance contact for the org, independent of whoever is admin today.
  billing_email String?
  tax_pin       String?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  members     FleetMember[]
  roles       FleetRole[]
  driverLinks FleetDriverLink[]
  vehicles    Vehicle[]

  @@map("fleet_orgs")
}

/// Fleet STAFF. Mirrors AdvertiserMember — is_owner bypasses permission checks,
/// removal is soft. Drivers never appear here.
model FleetMember {
  id            Int        @id @default(autoincrement())
  fleet_org_id  Int
  clerk_user_id String     @unique   // driver Clerk instance
  role_id       Int?
  is_owner      Boolean    @default(false)
  removed_at    DateTime?
  created_at    DateTime   @default(now())
  updated_at    DateTime   @updatedAt

  @@index([fleet_org_id, removed_at])
  @@map("fleet_members")
}

/// Mirrors AdvertiserRole. fleet_org_id null = seeded starter shared by all.
model FleetRole {
  id           Int      @id @default(autoincrement())
  fleet_org_id Int?
  name         String
  permissions  String[] @default([])
  created_at   DateTime @default(now())

  @@unique([fleet_org_id, name])
  @@map("fleet_roles")
}

/// The enrolment relationship. NOT membership — the driver keeps their own
/// account, their own dashboard, and everything private stays private (§7).
/// Ends with ended_at rather than deletion so history stays attributable.
model FleetDriverLink {
  id                   Int       @id @default(autoincrement())
  fleet_org_id         Int
  driver_clerk_user_id String
  /// invited → active on the driver's own acceptance. Never auto-accepted.
  status               String    @default("invited") // invited | active | declined | ended
  /// What the driver agreed to, captured at acceptance for the audit trail.
  consent_version      String?
  invited_at           DateTime  @default(now())
  accepted_at          DateTime?
  ended_at             DateTime?

  @@unique([fleet_org_id, driver_clerk_user_id])
  @@index([driver_clerk_user_id, status])
  @@map("fleet_driver_links")
}

/// The unit of advertising supply. Plate-identified because that is what is
/// knowable at enrolment; logbook_number arrives later (§5.3).
model Vehicle {
  id            Int      @id @default(autoincrement())
  plate         String   @unique
  kind          String   // taxi | bike
  status        String   @default("pending") // pending | active | grounded | retired
  fleet_org_id  Int?     // enrolled via a fleet
  /// Set for an independent owner-driver with no fleet. Exactly one of this
  /// and fleet_org_id is expected to be set; neither is enforced by the DB
  /// because a vehicle may be registered by ops before either is known.
  owner_driver_clerk_user_id String?

  /// Deferred by design — Hakki or the driver supplies it later.
  logbook_number      String?
  logbook_verified_at DateTime?

  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  assignments VehicleAssignment[]
  permits     VehiclePermit[]
  documents   VehicleDocument[]

  @@index([fleet_org_id, status])
  @@map("vehicles")
}

/// Who holds the vehicle, over time. Repossession, reassignment and a driver
/// leaving are all just an ended_at.
model VehicleAssignment {
  id                   Int       @id @default(autoincrement())
  vehicle_id           Int
  driver_clerk_user_id String
  started_at           DateTime  @default(now())
  ended_at             DateTime?

  @@index([vehicle_id, ended_at])
  @@index([driver_clerk_user_id, ended_at])
  @@map("vehicle_assignments")
}

/// County advertising licence, insurance, inspection. Per vehicle, per county,
/// per year, with an expiry that gates campaign eligibility (§8).
model VehiclePermit {
  id          Int       @id @default(autoincrement())
  vehicle_id  Int
  kind        String    // advertising_licence | insurance | inspection
  county      String?   // advertising licences are county-scoped; insurance is not
  reference   String?
  issued_at   DateTime?
  expires_at  DateTime
  fee_kes     Decimal?  @db.Decimal(12, 2)

  @@index([vehicle_id, kind, expires_at])
  @@index([expires_at])
  @@map("vehicle_permits")
}

/// Vehicle paperwork — distinct from DriverDocument, which stays with the
/// person. A logbook does not follow a driver to their next car.
model VehicleDocument {
  id                   Int      @id @default(autoincrement())
  vehicle_id           Int
  type                 String   // logbook | insurance_certificate | inspection_certificate
  cloudinary_public_id String   @unique
  content_type         String
  size_bytes           Int
  uploaded_by_clerk_user_id String?
  created_at           DateTime @default(now())

  @@index([vehicle_id, type])
  @@map("vehicle_documents")
}
```

`Device` (Admobi's screens and bike boxes, their serials and custody chain) is
**deferred to a later phase** — see §9. It is a capital-asset tracking problem
that does not block enrolment.

---

## 5. Enrolment and consent

### 5.1 Fleet onboarding

Ops converts a `FleetPartner` lead into a `FleetOrg` and invites the first
admin. Fleet staff then invite each other, reusing the advertiser invite shape:
tokenised email invite, SHA-256 hash stored, 7-day expiry, explicit accept or
decline, owner-only promotion. That pattern is already proven — do not reinvent
it, and do not share its tables.

### 5.2 Driver enrolment — the driver always consents

Hakki can enrol drivers in bulk (CSV of phone numbers or emails), which creates
`FleetDriverLink` rows in `invited` status. **A link only becomes `active` when
the driver accepts it in their own app.** Nothing about a driver's account
changes on Hakki's say-so.

This is not ceremony. Per §10.1 Hakki is likely a *chargee* over the logbook,
not the registered owner, so their standing to consent to advertising on a
driver's vehicle is unsettled. Driver-side acceptance makes the arrangement
sound regardless of how that resolves.

A driver may hold links to more than one fleet, and may end any of them from
their own settings without the fleet's involvement.

### 5.3 Logbook capture is deferred, by decision

`Vehicle.logbook_number` starts null. Either the fleet or the driver supplies it
later, from their respective apps. Until it is present and
`logbook_verified_at` is set, the vehicle is `pending` and **not eligible to
carry a campaign**.

That keeps enrolment frictionless while making the gap visible and blocking on
it at the point where it actually matters.

---

## 6. Permissions and roles

Closed set, exported alongside `OpsPermission` and `AdvertiserPermission`:

```
vehicles:read · vehicles:write · permits:manage ·
drivers:read · earnings:read · reports:read ·
team:manage · org:manage · activity:read
```

Starter roles (`fleet_org_id = null`):

| Role | Permissions | For |
|---|---|---|
| **Fleet manager** | `vehicles:read/write`, `permits:manage`, `drivers:read`, `reports:read`, `activity:read` | Runs the fleet day to day |
| **Finance** | `vehicles:read`, `earnings:read`, `reports:read` | Reconciliation and offsetting |
| **Viewer** | `vehicles:read`, `reports:read` | Read-only stakeholder |

`is_owner` holds everything implicitly. As with advertiser orgs, **changing who
is an admin requires the caller to be an admin** — `team:manage` must never be a
path to minting one.

---

## 7. What a fleet can and cannot see

This is the section to argue with, because it is the one with real-world
consequences.

**Visible to a fleet holding the right permission**

- Their vehicles: plate, kind, status, permits and expiry, assignment history.
- Linked drivers: **display name and phone only**, plus which vehicles they are
  assigned to and when.
- Eventually, earnings attributable to their vehicles (§11, phase 4+).

**Never visible to a fleet, at any permission level**

| Withheld | Why |
|---|---|
| `DriverProfile.national_id_number`, `kra_pin` | Identity-theft surface. In Kenya an ID plus KRA PIN plus M-Pesa number is a workable fraud kit. |
| `DriverDocument` (ID scans, KRA certificate, payout proof) | Collected by Admobi for Admobi's purpose. Re-serving them changes the consent basis — even where the fleet already holds their own copies. |
| `payout_mpesa_msisdn`, `payout_bank_account` | Read enables reconnaissance; write is payout-redirection fraud. |
| `SafetyIncident` | **Non-negotiable.** A driver must be able to report an incident involving a repossession agent without their financier reading it. |

Hakki will already hold ID documents for drivers they financed. That is not an
argument for Admobi to hand over the copies Admobi collected — different
relationship, different consent.

Enforced by **never selecting these columns into a fleet-facing DTO**, the way
the advertiser activity feed refuses to pass `summary` through — not by hiding
them in the UI.

---

## 8. Regulatory: advertising is licensed per vehicle

Research dated 2026-09-16. **Sources are commercial branding agencies, not the
county.** Fees are revised through annual county Finance Acts and two sources
contradicted themselves (KSh 18,200 vs 20,000 for Nairobi). Treat as indicative
and confirm against the Nairobi City County Finance Act and the Tariffs and
Pricing Policy 2025–2030 before relying on any number here.

**Nairobi County, annual, per vehicle:** saloon / SUV / pick-up / van
KSh 20,000 · truck / bus KSh 25,000 · motorcycle / tuk-tuk KSh 10,000.

**Other counties, approximate:** Mombasa ~15,000 · Kisumu 8,500–20,000 by class ·
Kiambu ~5,000 · Nakuru 6,000–10,000 · Embu 4,000–10,000 · Kisii 5,000–20,000.

Mechanics that drive the data model:

- **Per county, per vehicle, per year.** Some counties charge vehicles merely
  passing through, so a vehicle working a corridor near a county boundary may
  need more than one live permit — hence `VehiclePermit.county`.
- Nairobi has scrapped monthly licences in favour of annual.
- Applications go through the NRS portal and require vehicle registration
  documents and **proof of ownership** — the logbook question again (§10.1).
- Non-compliance risks fines, removal of materials and **impounding**.

### 8.1 The number

3,000 taxis in Nairobi × KSh 20,000 = **KSh 60,000,000 per year** in licence
fees alone. Every vehicle must clear roughly KSh 20,000/year before contributing
anything.

Two consequences:

1. **Who pays — Admobi, the fleet, or the driver — is a larger commercial
   question than payout direction.** Unresolved (§10.3).
2. **License by corridor, not by roster.** Enrol broadly; licence only the
   vehicles actually sold into campaigns. `Vehicle.status` and permit expiry
   together decide campaign eligibility.

### 8.2 Expiry gates supply

An expired advertising licence or insurance certificate must **block a vehicle
from being sold into a campaign**, the same way a missing creative blocks a
campaign submit today. At 3,000 vehicles nobody runs that check by hand.

---

## 9. Explicitly out of scope

- **`Device` / screen custody.** Serial numbers, condition, custody chain and
  recovery on default. Real and needed — Admobi's screens are capital equipment
  on loan — but it does not block enrolment. Next design.
- **Earnings, playout and proof-of-play.** Does not exist (§1.1). A much larger
  programme; the fleet earnings view depends on it, not the reverse.
- **Modelling the loan.** Admobi should know a **payee per vehicle** and nothing
  more. Tracking driver balances and applying credits would make Admobi a party
  to a consumer-credit arrangement — regulatory exposure, plus a ledger of
  someone else's debt and every dispute about it. Let Hakki offset in their own
  books.
- **Fleet-initiated driver removal from the platform.** A fleet can end its
  link; it cannot deactivate a driver's Admobi account.
- **Per-fleet revenue share configuration.** Waits on earnings.

---

## 10. Open questions — two are potential blockers

### 10.1 🔴 Does Hakki have standing to consent? — blocker

Hakki does **logbook loans** and finances up to 70% of value. In that structure
the **driver is typically the registered owner** and Hakki holds a charge as
security. If so, Hakki is a chargee, not an owner, and may not be able to
authorise third-party advertising on 3,000 vehicles — nor supply the "proof of
ownership" the NRS licence application asks for.

**Ask Hakki directly:** *does your facility agreement permit you to authorise
third-party advertising on financed vehicles, or is per-driver consent
required?*

§5.2's driver-acceptance step is designed to make the answer not matter for
Admobi's own position. It still matters for whether Hakki can deliver the volume
they are promising.

### 10.2 🔴 NTSA rules on roof-mounted LED screens — blocker, unverified

A screen mounted on a taxi roof is plausibly a vehicle modification, and there
may be construction, fitting or driver-distraction rules. **Nothing
authoritative was found.** This is existential rather than a fee, and should be
settled with a direct NTSA enquiry before any fleet commitment is made.

Also unverified: whether digital or illuminated *moving* displays are treated
differently from static wraps under county by-laws and the Physical Planning
Act.

### 10.3 Who pays the licence fee?

Admobi, the fleet, or the driver. Decides the unit economics and whether
`VehiclePermit.fee_kes` needs a payer field.

### 10.4 Payee per vehicle

Does Admobi pay the driver, or the fleet who then credits the driver? Deferred
with earnings, but the answer shapes `Vehicle`.

### 10.5 Does a fleet need the driver's phone number?

Proposed yes, as an explicit `drivers:read` grant rather than a side effect of
linkage. Confirm.

> Neither §10.1 nor §10.2 blocks phases 1–2, which register and enrol but sell
> nothing. Both block any campaign actually playing out on a fleet vehicle.

---

## 11. Sequencing

| Phase | Delivers | Depends on |
|---|---|---|
| **1. Fleet tenancy** | `FleetOrg`, `FleetMember`, `FleetRole`, invites, fleet surface on the driver Clerk instance. Hakki's staff can log in. | — |
| **2. Enrolment + vehicle register** | `FleetDriverLink` with driver-side acceptance, bulk CSV invite, `Vehicle` with plate, `VehicleAssignment`. Hakki sees their roster and vehicles. | 1 |
| **3. Compliance** | `VehiclePermit`, `VehicleDocument`, logbook capture, expiry gating and renewal alerts. **The first phase with standalone commercial value** — it manages the §8.1 exposure. | 2 |
| **4. Devices** | Screen/box serials, custody, recovery. | 2 |
| **5. Earnings** | Playout, proof-of-play, earnings, payee. Separate programme. Unblocks the dashboard Hakki actually asked for. | 3, 4 |

Phases 1–3 are shippable without resolving §10.1 or §10.3, because nothing plays
out yet. **Do not promise Hakki an earnings view before phase 5.**

Scale shapes phase 2 and 3 from the start — the advertiser patterns will not
survive 3,000 rows: server-side pagination and plate search, CSV import with
dry-run and per-row errors, bulk assignment, and pre-aggregated counts.

---

## 12. What changed since advertiser §12

The advertiser design argued drivers should not get an organization model. Most
of that reasoning **still holds and is preserved here**:

- Fleet remains a *relationship* problem, not a tenancy one — which is why
  drivers are linked, not enrolled as members (§3).
- The privacy hazard it identified is the basis of §7.
- Its claim that *"the missing primitive is `Vehicle`, not `Organization`"* is
  adopted directly.

What changed is that a concrete counterparty appeared with 1,500–3,000 vehicles
and a commercial reason to integrate, and — the part §12 could not have
anticipated — **the fleet's own staff are a real tenancy problem**. Hakki at
3,000 vehicles has dispatchers, finance and ops. That is peers over a shared
pool, and it is the one place the advertiser model genuinely fits.

So this design is not a reversal. It splits §12's "fleet" into the two things it
conflated: a **tenant** (fleet staff) and a **relationship** (fleet to driver).

---

## 13. Testing

- A fleet member cannot read `DriverProfile` identity fields, `DriverDocument`,
  payout columns or `SafetyIncident` through any fleet route — asserted over a
  response body, not by checking the UI.
- A driver linked to two fleets appears correctly in both, and ending one link
  leaves the other untouched.
- A `FleetDriverLink` stays `invited` until the driver accepts; no fleet action
  can move it to `active`.
- A vehicle with no `logbook_verified_at` is not campaign-eligible.
- A vehicle whose advertising licence has expired is not campaign-eligible, and
  becomes eligible again on renewal.
- A vehicle needing permits in two counties is ineligible until both are live.
- Ending an assignment preserves history: the departed driver still resolves on
  past assignments.
- Fleet staff invite, promotion and last-owner protection mirror the advertiser
  suite — `team:manage` alone cannot mint an admin.
- CSV import of 3,000 vehicles reports per-row errors without partial commits.
