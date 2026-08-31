# Admobi — Company Valuation (2026-08-31)

A fresh, multi-method valuation built from the ground up, independent of the earlier
`AUDIT-VALUATION.md` (which is a single-method reconstruction-cost appraisal). This one
runs seven standard approaches, states every assumption, and says how much weight each
result deserves.

**Prepared for:** an internal cofounder / equity-split conversation — not a fundraising deck.
The framing is deliberately conservative and honest rather than promotional.

**FX:** KES 130 = USD 1 (state the rate you actually use; the KES figures scale linearly).

---

## 1. Bottom line

| | USD | KES |
|---|---:|---:|
| **Defensible range** | **$180k – $450k** | **KES 23M – 58M** |
| **Point estimate (internal use)** | **~$285k** | **~KES 37M** |
| Replacement-cost ceiling (rebuild the software) | $230k – $390k | KES 30M – 51M |
| Actual cash + sweat invested to date (floor) | $15k – $24k | KES 2.0M – 3.1M |

**Honest one-paragraph take.** Admobi today is a well-built, coherent software asset
(~96k lines of real code, 8 apps, 22 data models, a live marketing site and CMS) wrapped
around a clear plan for a real market — geotargeted LED taxi-top advertising in Nairobi.
But almost nothing is de-risked: no revenue, no paying advertisers, no payments integration
live, no telemetry / proof-of-play pipeline, **zero** physical ad units, no signed fleet
partners, and effectively a one-person bus factor. The methods that price the *business*
(VC method, risk-factor summation, market comps) cluster at **$150k–350k**. The methods
that price the *effort* (Berkus, scorecard, reconstruction cost) run higher, up to ~$530k,
because they reward what's been built without fully discounting what hasn't. The earlier
KES 50.7M reconstruction figure is not wrong — it's just the *ceiling* of this range, and
it answers "what would it cost to rebuild the code," not "what is the company worth."

---

## 2. What is being valued

**As of 2026-08-31**, per direct repo inspection (`git ls-files`, `AUDIT-VALUATION.md`,
`FEATURE-INVENTORY.md`, `ROADMAP.md`):

### Assets that exist
- **~96,053 lines** of hand-written TS/TSX/JS across **8 apps** (marketing site + CMS,
  business API with 68 `/v1` handlers, ops console, advertiser web, driver web, and three
  Expo mobile apps) and **9 shared packages** (design system with 41 components, typed API
  client, Zod contracts, geo fixtures).
- **22 Prisma models + 5 CMS collections** on a shared Neon Postgres.
- Wired integrations: **Clerk** (3 auth instances), **Cloudinary**, **Resend**, **Sentry**,
  **Payload CMS**, **MapLibre**, EAS mobile build pipeline, 5 Vercel projects.
- **Live production marketing site** (`admobihq.com`) with blog, help center, pricing
  simulator, and working lead-capture forms → database.
- The **brand, domain, positioning** (`PRODUCT.md`), and a detailed **actor-by-actor roadmap**.
- ~4 months of accumulated founder context on the market and the build.

### What does NOT exist yet (the value gaps)
- **No revenue. No paying advertisers. No campaigns run** — campaign and earnings screens
  still render local demo data.
- **No payments** — Pesapal (API v3) is specified but not integrated; no way to collect money.
- **No telemetry / proof-of-play** — the core trust mechanism of GPS-verified OOH is unbuilt.
  The driver earnings app is explicitly blocked on this.
- **Zero LED taxi-top units.** No hardware spec finalised, no supplier, no `Device` model.
  This is the capital-intensive half of the business and it is entirely ahead.
- **No fleet partners signed** — `FleetPartner` is a CRM record type only.
- **~0% product test coverage** (6 test files, 337 lines, repo-wide).
- **Team:** 1 full-time founder + ~1 part-time developer. No cofounder, no commercial hire,
  no OOH/adtech domain expert.
- Fully bootstrapped — no external capital raised.

### Market context (verify before relying on it)
- Kenya total measured ad spend is roughly **$600–800M/year**; formal **OOH is ~$30–60M**
  of that, with **digital OOH a small and early slice**. *These are rough industry figures —
  firm them up with a GroupM, Ipsos, or PwC Entertainment & Media Outlook report before using
  them in any negotiation.*
- Digital taxi-top advertising already has at least one operator in-market (`PRODUCT.md`
  acknowledges this), and static-OOH incumbents (Alliance Media, Magnate & Cecil) are well
  capitalised.
- Cautionary comp: **Firefly** (US digital taxi-top + rideshare screens) raised large rounds
  from 2018 and still found the unit economics and scaling hard.

### Traction check — live database pull, 2026-08-31

Queried directly against the production Neon database. It **confirms pure pre-revenue** and
adds a modest demand signal:

| Signal | What's actually there |
|---|---|
| **Campaign leads** | 14 inbound enquiries; ~6–7 look genuinely external, including **Strathmore University** (budget "500k+"), **Simbisa Brands** ("150k–500k"), and **Urban Rythmke** (marked *qualified*, "150k–500k", submitted 4×). **1 qualified, 0 converted, KES 0 collected.** |
| **Drivers** | ~3 genuine sign-ups (the rest are test rows); **all status "pending"**, none activated. 1 driver completed the full onboarding profile (approved). |
| **Fleet partners** | **1 real relationship — Hakki Finance — tracked off-system** (not in the DB). The `fleet_partners` table is test data plus one unverified "Safaricom PLC" row. |
| **Revenue-side tables** | **No `customers`, `campaigns`, `payments`, `devices`, or `earnings` tables exist in the database.** |
| **Data hygiene flag** | The business DB shares one Neon instance with a self-hosted n8n (100+ n8n tables). Three schema-defined tables (`customers`, `support_cases`, `audit_events`) are **absent from the live DB** — a migration/`db push` discipline gap. |

**Effect on the valuation:** firms up the demand side — real unsolicited interest from
recognisable Kenyan buyers is worth more than a cold idea — but creates no revenue value.
Net: higher confidence in the range, point estimate nudged from ~$275k to **~$285k**.

---

## 3. Method-by-method

### Method 1 — Reconstruction / replacement cost  *(cost approach)*

**Question:** what would it cost to rebuild this software from nothing at Nairobi contractor rates?

| Scenario | Hours | Blended rate | + Premiums / infra | Total |
|---|---:|---:|---|---:|
| Conservative (discount ~20% of LOC as boilerplate / near-duplicate mobile code; lean team) | ~5,000 | KES 5,000/hr | +15% integration, +KES 1.5M infra | **KES 30M / $231k** |
| Mid | ~6,000 | KES 5,300/hr | +20% coordination, +KES 1.5M infra | **KES 40M / $308k** |
| Generous (the published `AUDIT-VALUATION.md` figure — full 96k LOC, 1 lead + 3 mid-senior, +35% premiums) | ~6,400 | KES 5,625/hr | as documented | **KES 50.7M / $390k** |

- **Inputs:** 96,053 LOC ÷ ~15 finished lines/hr (blended for design, typed implementation,
  integration, deployment). Nairobi senior contractor rates KES 5,000–7,500/hr.
- **Trust: medium, as a ceiling only.** This prices the *labour to retype the system*, not
  the business. A skeptical buyer discounts it **30–50%** for near-zero test coverage, an
  unproven core product, heavy AI-assisted boilerplate, and single-author risk. It ignores
  brand, market position, and roadmap — but also ignores that most of this code is worth
  little without the unbuilt telemetry/payments/hardware layers.
- **Result: KES 30–51M / $230–390k**, best read as "you could not acquire an equivalent
  codebase for less than this," not "this is the price."

### Method 2 — Actual invested cost  *(cost approach, floor)*

**Question:** how much money and time has actually gone in?

| Input | Basis | Amount |
|---|---|---:|
| Founder labour | ~4 months full-time × KES 400–550k/mo market comp for a senior full-stack engineer | KES 1.6M – 2.2M |
| Part-time developer | ~0.3–0.4 FTE × ~3 months | KES 0.2M – 0.5M |
| Tooling, infra, domains, AI subscriptions | 4 months | KES 0.2M – 0.4M |
| **Total** | | **KES 2.0M – 3.1M / $15k – 24k** |

- **Trust: high, as a floor.** This is the genuine sunk contribution. It matters a lot for
  an equity split (see §5) and almost not at all for a sale price.

### Method 3 — Berkus method  *(pre-revenue framework)*

Caps scaled to the Kenyan market at ~$150k per element (US-scale caps of $500k shown for
reference).

| Element | Assessment | Value (Kenya-scaled) |
|---|---|---:|
| Sound idea / basic value | Clear, real market; specific wedge (geo + low minimums) | $130k |
| Prototype / technology de-risk | Substantial working software — but core product (telemetry, booking APIs, payments) not built | $140k |
| Quality management team | Strong solo execution; no cofounder, no adtech/OOH domain hire | $40k |
| Strategic relationships | One fleet partner in discussion (Hakki Finance); recognisable inbound leads; no hardware supplier, no signed advertiser | $35k |
| Product rollout / sales | Pre-launch; 1 qualified lead, nothing closed | $20k |
| **Total** | | **~$360k / KES 47M** |

- **Trust: low–medium.** Berkus rewards "we built a thing" heavily. With US-scale caps this
  method returns ~$1.1M, which is not credible for this stage and market — hence the scaled caps.

### Method 4 — Scorecard (Bill Payne) method  *(market-relative framework)*

Regional baseline pre-money for a pre-revenue Kenyan pre-seed startup: **$700k**
(plausible range $500k–1.0M — East Africa runs well below the US $2–2.5M).

| Factor | Weight | Multiplier | Contribution |
|---|---:|---:|---:|
| Team strength | 30% | 0.70 | 0.210 |
| Opportunity size (TAM) | 25% | 0.80 | 0.200 |
| Product / technology | 15% | 0.90 | 0.135 |
| Competitive environment | 10% | 0.80 | 0.080 |
| Marketing / sales / partnerships | 10% | 0.50 | 0.050 |
| Need for further investment | 5% | 0.70 | 0.035 |
| Other (brand, roadmap quality) | 5% | 1.00 | 0.050 |
| **Weighted factor** | | | **0.76** |

- **Result:** 0.76 × $700k ≈ **$530k / KES 69M** (range $380–760k on the baseline swing).
- **Trust: low–medium.** Scorecard is calibrated against companies that already have a team
  and often a pilot. Admobi is thinner than the median on team and traction, which the
  multipliers only partly capture.

### Method 5 — Risk Factor Summation  *(market-relative framework)*

Baseline $700k, adjusted across 12 risk categories at ±$125k each (double weight on stage
and hardware).

Material negative adjustments: **management** (solo, no cofounder), **stage** (pre-revenue,
pre-launch, −2×), **manufacturing/hardware** (not started, capex + supply chain ahead, −2×),
**sales & marketing** (unproven), **funding** (needs capital), **competition** (existing
digital taxi-top operator), **exit** (small market, unclear acquirers). Positives: reputation
(clean), technology (software strong).

- Net adjustment ≈ **−$1.4M** against a $700k baseline → method floors out.
- **Result: ~$150k – 350k / KES 20M – 46M**, point ~$250k.
- **Trust: medium.** RFS is deliberately harsh on early hardware-adjacent, pre-revenue
  companies — which is a fair description of Admobi.

### Method 6 — Venture Capital method  *(income approach, forward-looking)*

| Input | Assumption |
|---|---|
| Exit horizon | 6–7 years |
| Exit-year revenue | ~$2–3M net (e.g. ~1,000 screens × ~$150/screen/mo, or take-rate on ~$6–10M advertiser spend) — optimistic but not absurd |
| Exit multiple | 2–3× revenue (regional OOH / adtech trades on cashflow, **not** software multiples) → exit ~$5–8M; use **$6M** |
| Required return | 25× (seed-stage) |
| Future dilution | ~45% across two more rounds |

- Post-money today = $6M ÷ 25 = $240k; less dilution → **pre-money ~$130k – 260k / KES 17M – 34M**.
- **Trust: medium.** The small addressable market is what caps this. If regional expansion
  (Dar, Kampala, Kigali, Lagos) is genuinely executable, the exit could be $15–25M and this
  method returns $600k–1M — but that requires capital Admobi doesn't have and a team it
  hasn't hired.

### Method 7 — Market comparables & transactions  *(market approach)*

- **Strict revenue / transaction basis:** with zero revenue, revenue-multiple and
  comparable-transaction methods return **~$0**.
- **Comparable early-stage rounds:** pre-revenue African startups that *raise* typically do
  so at $1–3M post-money — but nearly always with a live pilot and usually a full founding team.
- **Sector caution:** Firefly's trajectory shows digital taxi-top is capital-hungry and
  operationally hard; static-OOH incumbents in Kenya are well funded.
- **Trust: low** as a point estimate, **useful** as a cross-check: it confirms the
  business-value methods clustering at **$150–500k** and argues against anything higher
  absent traction.

---

## 4. Synthesis

| Method | Result (USD) | What it really measures | Weight |
|---|---:|---|---|
| VC method | $130k – 260k | Business value, forward | High |
| Risk Factor Summation | $150k – 350k | Business value, risk-adjusted | High |
| Market comps | ~$0 strict / $150–500k cross-check | Business value | Medium |
| Berkus | ~$360k | Effort + potential | Medium |
| Scorecard | $380k – 760k | Effort + market-relative | Medium |
| Reconstruction cost | $230k – 390k | Cost to rebuild the code | Medium (ceiling) |
| Actual invested cost | $15k – 24k | Sunk contribution | High (floor) |

Weighting the business-value methods most heavily, treating reconstruction cost as a ceiling
and actual cost as a floor:

> ### Defensible range: **$180k – $450k  (KES 23M – 58M)**
> ### Point estimate: **~$285k  (KES ~37M)**

Nearly all of that value is: the software asset, the founder's accumulated market/build
context, and the brand/domain/roadmap. Very little of it is de-risked.

---

## 5. Using this for a cofounder equity split

**A single company valuation is a blunt tool for a pre-revenue two-person split.** The number
above is most useful as a *reference point*, not a mechanism. Some practical guidance
(not legal advice — get a Kenyan startup lawyer to paper whatever you agree):

1. **Separate "work done" from "work ahead."** The founder's contribution to date is best
   represented by the **actual invested cost (~KES 2–3M) plus a premium for carrying all the
   risk and context solo** — call it a KES 4–8M "head start," not the full KES 36M. The
   KES 36M is the whole company; the incoming cofounder is buying into a share of it by
   committing future work.

2. **Prefer contribution-based over a fixed handshake split.** Options:
   - **Dynamic split (Slicing Pie style):** log each person's hours/cash at agreed rates;
     equity tracks the running totals until a funding event freezes it. Fairest when the
     cofounder's commitment is unproven.
   - **Fixed split + heavy vesting:** e.g. 4-year vest, 1-year cliff, with the founder taking
     a **founder premium** (a chunk that vests immediately or on a shorter schedule) for the
     ~4 months and the whole asset already contributed.

3. **Rough anchors for a fixed split**, depending on what the cofounder brings:
   - Full-time, technical, no capital, no domain edge → founder keeps **~70–80%**.
   - Full-time + brings the OOH/fleet relationships or hardware capability the plan is
     missing → founder keeps **~60–70%**.
   - Full-time + putting in meaningful cash → negotiate the cash separately (as a loan or
     priced on the ~$275k pre-money) from the sweat split.

4. **Non-negotiables before you lock anything:** written founder agreement, vesting with a
   cliff for *both* parties, full IP assignment to the company, and a buyback right on
   unvested (and ideally vested) shares if someone leaves.

---

## 6. What would move the number

| Change | Effect on valuation |
|---|---|
| First paying campaigns + Pesapal checkout live | **+$100k – 200k** — de-risks the revenue model |
| 20–50 LED units on the road with working proof-of-play telemetry | **+$200k – 400k** — de-risks the hardest, most capital-intensive part |
| Signed fleet partner(s) and a hardware supplier agreement | **+$50k – 150k** |
| A second full-time cofounder (commercial or hardware) | **+$100k – 250k** — fixes the team-factor discount |
| Credible, funded regional expansion path | Shifts the VC method to $600k–1M+ |
| Raising external capital | Resets to a negotiated post-money — typically **$1M – 2.5M** in this market *with a pilot in place* |
| Founder leaves / no bus-factor mitigation | **−50% or more** |

---

## 7. Inputs to firm up

1. **KES/USD rate** on the valuation date (used 130).
2. **Actual cash spent to date** — pull receipts (infra, EAS, domains, contractor invoices, AI subs).
3. **Founder hours** — even a rough reconstruction from the git history and a calendar.
4. **Kenya OOH / DOOH market size** — from GroupM, Ipsos Kenya, or the PwC E&M Outlook, not estimates.
5. **Competitor data** — any recent rounds or acquisitions of Kenyan/African OOH or adtech
   startups (Briter Bridge, Disrupt Africa, Partech Africa reports).
6. **Any signed LOIs, pilot agreements, or advertiser commitments** — none assumed here; each
   real one moves the business-value methods up materially.

---

*Method: seven standard valuation approaches (two cost, two pre-revenue frameworks, one
market-relative, one income, one market-comp), each with stated assumptions and a trust
weighting, synthesised toward the business-value methods. Compiled 2026-08-31 from direct
repository inspection. Supersedes nothing — read alongside `AUDIT-VALUATION.md`, which is the
detailed version of Method 1 only.*
