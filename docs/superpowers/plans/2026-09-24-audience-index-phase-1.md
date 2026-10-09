# Audience Index — Phase 1: Foot-traffic index for area targeting

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give advertisers a modelled 0–100 **foot-traffic index** per area and time of day, so they can pick the market and daypart where the most people are, on the customer map and in the campaign wizard.

**Architecture:** An offline script bins open population data (Meta HRSL) and OpenStreetMap places into H3 hexagons (resolution 8, ~0.74 km²) covering Nairobi. The result is committed as a generated TS data file in `@workspace/geo`. A pure scoring function turns raw counts into a percentile index per daypart. Market-level scores average the hexes inside each wizard market's rectangle. The customer web map draws the hexes as a choropleth, and the wizard shows the chosen market's score. There is no DB table, API route or paid API in this phase.

**Tech Stack:** TypeScript, `h3-js` v4 (new dep, `packages/geo` only), Vitest, tsx (already at root), MapLibre via `@workspace/ui/components/map`, Next.js App Router (`apps/customer-web`).

**Spec:** No separate spec. This plan comes out of the 2026-09-24 research on population and foot-traffic data. The roadmap section at the end holds the decisions from that research.

## Global Constraints

- The index is **modelled, not measured**. Every surface that shows it labels it as a modelled estimate and credits sources: "Meta HRSL population · © OpenStreetMap contributors" (ODbL + CC BY 4.0 attribution).
- `@workspace/geo`'s root export (`src/index.ts`) must **not** re-export the audience module. It is exposed only as the subpath `@workspace/geo/audience`, so the mobile apps and every other consumer of `@workspace/geo` don't bundle `h3-js` or the data file.
- Market keys must stay identical to the wizard's `MARKETS` in [campaign-wizard.tsx:30](../../../apps/customer-web/components/campaigns/campaign-wizard.tsx#L30) and `marketZoneIds` in [pricing.ts:248](../../../packages/ops-contracts/src/pricing.ts#L248): `CBD`, `Westlands`, `Karen`, `Kilimani`, `Mombasa Rd`, `Eastlands`.
- Dayparts are exactly `morning` (6–10am), `midday` (10am–4pm), `evening` (4–8pm), `night` (8pm–6am), in Kenya time.
- The index is never NaN. Unknown or empty inputs return `null`, and the UI renders nothing for `null`.
- Per CLAUDE.md: no Co-Authored-By trailers. Stage by explicit path, because a concurrent agent may share the worktree.

## Review Focus

1. **Legacy or unknown market string** (a campaign saved with a market not in `MARKET_AREAS`, or `null`): `marketAudience` returns `null` and the wizard shows no note instead of crashing. Test in Task 4.
2. **A market rectangle with no scored hexes** (e.g. data regenerated with a smaller bbox): returns `null`, not `NaN` from 0/0. Test in Task 4.
3. **Degenerate score inputs** (one cell, all-equal values, a column of all zeros because Overpass returned nothing): no NaN, all-equal scores 50. Tests in Task 2.
4. **Messy population CSV** (quoted header, blank lines, rows with scientific notation such as `1.2e-3`, rows outside Nairobi, zero-population rows): header detected once, bad rows skipped, scientific notation parsed. Tests in Task 3.
5. **Daypart switch on the map**: the choropleth must re-shade without remounting the map. `MapGeoJSON` already calls `setData` when `data` changes ([map.tsx](../../../packages/ui/src/components/map.tsx), "Sync data when it changes"), so `data` must be memoised per daypart. Manual check in Task 6.

---

### Task 1: Market areas + Nairobi bbox in `@workspace/geo`

**Files:**
- Modify: `packages/geo/src/types.ts`
- Modify: `packages/geo/src/nairobi.ts` (append after `COVERAGE_ZONES`)
- Modify: `packages/geo/src/index.ts`
- Test: `packages/geo/src/geo.test.ts`

**Interfaces:**
- Produces: `type BBox = [west, south, east, north]`, `NAIROBI_BBOX: BBox`, `MARKET_AREAS: Record<string, BBox>`

- [ ] **Step 1: Write the failing test.** Append to `packages/geo/src/geo.test.ts`, and add `MARKET_AREAS, NAIROBI_BBOX` to its import from `"./index"`:

```ts
/** The wizard's market list, duplicated on purpose (same as pricing.test.ts):
 * adding a market without drawing its area must fail here. */
const WIZARD_MARKETS = ["CBD", "Westlands", "Karen", "Kilimani", "Mombasa Rd", "Eastlands"]

describe("market areas", () => {
  it("draws an area for every wizard market and nothing else", () => {
    expect(Object.keys(MARKET_AREAS).sort()).toEqual([...WIZARD_MARKETS].sort())
  })

  it("keeps every area a valid box inside the Nairobi bbox", () => {
    const [W, S, E, N] = NAIROBI_BBOX
    for (const [market, [w, s, e, n]] of Object.entries(MARKET_AREAS)) {
      expect(w < e && s < n, `${market} is inverted`).toBe(true)
      expect(w >= W && e <= E && s >= S && n <= N, `${market} is outside Nairobi`).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run it to confirm it fails.**
Run: `npm run test -w @workspace/geo`
Expected: FAIL, `MARKET_AREAS` is not exported.

- [ ] **Step 3: Implement.** In `packages/geo/src/types.ts` append:

```ts
/** [west, south, east, north] in degrees — lng/lat order like everything else here. */
export type BBox = [number, number, number, number]
```

In `packages/geo/src/nairobi.ts`, add `BBox` to the type import and append after `COVERAGE_ZONES`:

```ts
/** Everything the audience index covers: Nairobi city plus the ring estates. */
export const NAIROBI_BBOX: BBox = [36.65, -1.45, 37.05, -1.16]

/**
 * Rough rectangle per campaign-wizard market, used to average the audience
 * index over a market. Hand-drawn like the corridors — not survey-grade.
 * Keys must match the wizard's MARKETS and pricing's marketZoneIds.
 */
export const MARKET_AREAS: Record<string, BBox> = {
  CBD: [36.805, -1.305, 36.835, -1.275],
  Westlands: [36.795, -1.275, 36.815, -1.255],
  Kilimani: [36.775, -1.3, 36.8, -1.28],
  Karen: [36.68, -1.36, 36.74, -1.3],
  "Mombasa Rd": [36.83, -1.35, 36.91, -1.3],
  Eastlands: [36.86, -1.3, 36.92, -1.26],
}
```

In `packages/geo/src/index.ts`, add `BBox` to the type export list and `MARKET_AREAS, NAIROBI_BBOX` to the `./nairobi` export list.

- [ ] **Step 4: Run it to confirm it passes.**
Run: `npm run test -w @workspace/geo && npm run typecheck -w @workspace/geo`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add packages/geo/src/types.ts packages/geo/src/nairobi.ts packages/geo/src/index.ts packages/geo/src/geo.test.ts
git commit -m "feat(geo): add Nairobi bbox and per-market areas"
```

---

### Task 2: Audience scoring (`h3-js` + `scoreCells`)

**Files:**
- Modify: `packages/geo/package.json` (dependency + `./audience` export)
- Create: `packages/geo/src/audience.ts`
- Test: `packages/geo/src/audience.test.ts`

**Interfaces:**
- Produces (from `packages/geo/src/audience.ts`):
  - `AUDIENCE_H3_RES = 8`
  - `DAYPARTS = ["morning", "midday", "evening", "night"] as const`, `type Daypart`
  - `DAYPART_LABELS: Record<Daypart, string>`
  - `type AudienceCellRaw = { h: string; pop: number; poi: number }`
  - `type AudienceIndex = Record<Daypart, number>`, `type AudienceCell = { h: string; index: AudienceIndex }`
  - `DAYPART_WEIGHTS: Record<Daypart, { residents: number; places: number }>`
  - `scoreCells(raw: AudienceCellRaw[]): AudienceCell[]`

- [ ] **Step 1: Add the dependency and subpath.**
Run: `npm install h3-js@^4 -w @workspace/geo`
Then in `packages/geo/package.json` `"exports"` add `"./audience": "./src/audience.ts",` after `"./types"`.

- [ ] **Step 2: Write the failing tests.** Create `packages/geo/src/audience.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { DAYPARTS, scoreCells, type AudienceCellRaw } from "./audience"

const cell = (h: string, pop: number, poi: number): AudienceCellRaw => ({ h, pop, poi })

describe("scoreCells", () => {
  it("ranks an office district above an estate at midday, and the estate above it at night", () => {
    const [office, estate] = scoreCells([
      cell("office", 200, 400),
      cell("estate", 9000, 20),
      cell("filler-a", 1000, 50),
      cell("filler-b", 500, 10),
    ])
    expect(office!.index.midday).toBeGreaterThan(estate!.index.midday)
    expect(estate!.index.night).toBeGreaterThan(office!.index.night)
  })

  it("keeps every index an integer in 0–100", () => {
    const scored = scoreCells([cell("a", 1, 0), cell("b", 50, 3), cell("c", 7000, 90)])
    for (const c of scored)
      for (const d of DAYPARTS) {
        expect(Number.isInteger(c.index[d])).toBe(true)
        expect(c.index[d]).toBeGreaterThanOrEqual(0)
        expect(c.index[d]).toBeLessThanOrEqual(100)
      }
  })

  it("returns [] for no cells", () => {
    expect(scoreCells([])).toEqual([])
  })

  it("scores a single cell 50, not NaN", () => {
    const [only] = scoreCells([cell("only", 10, 1)])
    for (const d of DAYPARTS) expect(only!.index[d]).toBe(50)
  })

  it("scores all-equal cells 50", () => {
    const scored = scoreCells([cell("a", 5, 5), cell("b", 5, 5), cell("c", 5, 5)])
    for (const c of scored) for (const d of DAYPARTS) expect(c.index[d]).toBe(50)
  })

  it("survives a places column of all zeros (Overpass returned nothing)", () => {
    const scored = scoreCells([cell("a", 100, 0), cell("b", 900, 0)])
    for (const c of scored) for (const d of DAYPARTS) expect(Number.isNaN(c.index[d])).toBe(false)
    expect(scored[1]!.index.night).toBeGreaterThan(scored[0]!.index.night)
  })
})
```

- [ ] **Step 3: Run them to confirm they fail.**
Run: `npm run test -w @workspace/geo`
Expected: FAIL, cannot resolve `./audience`.

- [ ] **Step 4: Implement.** Create `packages/geo/src/audience.ts`:

```ts
/**
 * Modelled foot-traffic index: residents (Meta HRSL) and places (OSM POIs)
 * per H3 cell, blended per daypart and ranked 0–100 across Nairobi. It is an
 * estimate of where people are, not a measurement — label it that way.
 */

/** ~0.74 km² hexagons: fine enough for estates, coarse enough to stay a few thousand cells. */
export const AUDIENCE_H3_RES = 8

export const DAYPARTS = ["morning", "midday", "evening", "night"] as const
export type Daypart = (typeof DAYPARTS)[number]

export const DAYPART_LABELS: Record<Daypart, string> = {
  morning: "Morning · 6–10am",
  midday: "Midday · 10am–4pm",
  evening: "Evening · 4–8pm",
  night: "Night · 8pm–6am",
}

export type AudienceCellRaw = { h: string; pop: number; poi: number }
export type AudienceIndex = Record<Daypart, number>
export type AudienceCell = { h: string; index: AudienceIndex }

// ponytail: hand-set weights, not fitted. Replace with weights fitted to ops'
// ground pedestrian counts (roadmap step 1b) — the data file stays as is.
export const DAYPART_WEIGHTS: Record<Daypart, { residents: number; places: number }> = {
  morning: { residents: 0.5, places: 0.5 },
  midday: { residents: 0.2, places: 0.8 },
  evening: { residents: 0.5, places: 0.5 },
  night: { residents: 0.9, places: 0.1 },
}

/** value / p95, capped at 1, so one stadium-sized outlier doesn't flatten
 * every other cell. An all-zero column normalises to 0, never NaN. */
function normalizer(values: number[]): (v: number) => number {
  const sorted = [...values].sort((a, b) => a - b)
  const cap = sorted[Math.floor(0.95 * (sorted.length - 1))] ?? 0
  return (v) => (cap > 0 ? Math.min(1, v / cap) : 0)
}

/** 0–100 percentile by mid-rank, so ties (and a lone cell) land on 50. */
function percentileRanks(values: number[]): number[] {
  if (values.length === 1) return [50]
  const sorted = [...values].sort((a, b) => a - b)
  return values.map((v) => {
    const midRank = (sorted.indexOf(v) + sorted.lastIndexOf(v)) / 2
    return Math.round((100 * midRank) / (values.length - 1))
  })
}

export function scoreCells(raw: AudienceCellRaw[]): AudienceCell[] {
  if (raw.length === 0) return []
  const pop = normalizer(raw.map((c) => c.pop))
  const poi = normalizer(raw.map((c) => c.poi))
  const ranks = Object.fromEntries(
    DAYPARTS.map((d) => {
      const w = DAYPART_WEIGHTS[d]
      return [d, percentileRanks(raw.map((c) => w.residents * pop(c.pop) + w.places * poi(c.poi)))]
    }),
  ) as Record<Daypart, number[]>
  return raw.map((c, i) => ({
    h: c.h,
    index: Object.fromEntries(DAYPARTS.map((d) => [d, ranks[d][i]!])) as AudienceIndex,
  }))
}
```

- [ ] **Step 5: Run them to confirm they pass.**
Run: `npm run test -w @workspace/geo && npm run typecheck -w @workspace/geo`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add packages/geo/package.json package-lock.json packages/geo/src/audience.ts packages/geo/src/audience.test.ts
git commit -m "feat(geo): add audience index scoring per daypart"
```

---

### Task 3: Build script + generated Nairobi data

**Files:**
- Create: `packages/geo/src/audience-build.ts` (pure binning helpers, Node-free)
- Test: `packages/geo/src/audience-build.test.ts`
- Create: `packages/geo/scripts/build-audience-index.ts`
- Modify: `packages/geo/package.json` (`build:audience` script)
- Create (generated): `packages/geo/src/audience-index.data.ts`

**Interfaces:**
- Consumes: `AUDIENCE_H3_RES`, `AudienceCellRaw` (Task 2); `BBox`, `NAIROBI_BBOX` (Task 1)
- Produces:
  - `binPopulation(lines: Iterable<string> | AsyncIterable<string>, bbox: BBox): Promise<Map<string, number>>`
  - `binPlaces(elements: { lat?: number; lon?: number }[], bbox: BBox): Map<string, number>`
  - `mergeRaw(pop: Map<string, number>, poi: Map<string, number>): AudienceCellRaw[]` (sorted by `h`)
  - `AUDIENCE_RAW: AudienceCellRaw[]` exported from `audience-index.data.ts`

- [ ] **Step 1: Write the failing tests.** Create `packages/geo/src/audience-build.test.ts`:

```ts
import { latLngToCell } from "h3-js"
import { describe, expect, it } from "vitest"

import { AUDIENCE_H3_RES } from "./audience"
import { binPlaces, binPopulation, mergeRaw } from "./audience-build"
import { NAIROBI_BBOX } from "./nairobi"

const CBD = latLngToCell(-1.2864, 36.8172, AUDIENCE_H3_RES)

describe("binPopulation", () => {
  it("reads a quoted lat-first header and sums rows into one cell", async () => {
    const pop = await binPopulation(
      ['"latitude","longitude","ken_general_2020"', "-1.2864,36.8172,2.5", "-1.2864,36.8172,1.5"],
      NAIROBI_BBOX,
    )
    expect(pop.get(CBD)).toBe(4)
  })

  it("skips blank, malformed, zero and out-of-bbox rows but parses scientific notation", async () => {
    const pop = await binPopulation(
      [
        "longitude,latitude,population",
        "",
        "36.8172,-1.2864",
        "36.8172,-1.2864,0",
        "39.6682,-4.0435,50", // Mombasa
        "36.8172,-1.2864,1e-1",
      ],
      NAIROBI_BBOX,
    )
    expect([...pop.keys()]).toEqual([CBD])
    expect(pop.get(CBD)).toBeCloseTo(0.1)
  })

  it("assumes lon,lat,value when there is no header (WorldPop XYZ)", async () => {
    const pop = await binPopulation(["36.8172,-1.2864,3"], NAIROBI_BBOX)
    expect(pop.get(CBD)).toBe(3)
  })
})

describe("binPlaces", () => {
  it("counts nodes per cell and ignores elements without coordinates", () => {
    const poi = binPlaces(
      [{ lat: -1.2864, lon: 36.8172 }, { lat: -1.2864, lon: 36.8172 }, {}, { lat: -4.04, lon: 39.66 }],
      NAIROBI_BBOX,
    )
    expect(poi.get(CBD)).toBe(2)
    expect(poi.size).toBe(1)
  })
})

describe("mergeRaw", () => {
  it("unions both maps, fills the missing side with 0, rounds population, sorts by h", () => {
    const merged = mergeRaw(new Map([["b", 10.6]]), new Map([["a", 3]]))
    expect(merged).toEqual([
      { h: "a", pop: 0, poi: 3 },
      { h: "b", pop: 11, poi: 0 },
    ])
  })
})
```

- [ ] **Step 2: Run them to confirm they fail.**
Run: `npm run test -w @workspace/geo`
Expected: FAIL, cannot resolve `./audience-build`.

- [ ] **Step 3: Implement the helpers.** Create `packages/geo/src/audience-build.ts`:

```ts
import { latLngToCell } from "h3-js"

import { AUDIENCE_H3_RES, type AudienceCellRaw } from "./audience"
import type { BBox } from "./types"

function inBBox([w, s, e, n]: BBox, lng: number, lat: number): boolean {
  return lng >= w && lng <= e && lat >= s && lat <= n
}

/**
 * Sums a lon/lat/value CSV (Meta HRSL on HDX, or headerless WorldPop XYZ)
 * into H3 cells. The first non-numeric row is the header; blank, short,
 * zero-value and out-of-bbox rows are skipped.
 */
export async function binPopulation(
  lines: Iterable<string> | AsyncIterable<string>,
  bbox: BBox,
): Promise<Map<string, number>> {
  const cells = new Map<string, number>()
  let lngIdx = 0
  let latIdx = 1
  let valIdx = 2
  let sawHeader = false
  for await (const line of lines) {
    const cols = line.split(",").map((c) => c.replace(/"/g, "").trim())
    if (cols.length < 3) continue
    const nums = cols.map(Number)
    if (nums.some(Number.isNaN)) {
      if (!sawHeader) {
        sawHeader = true
        const names = cols.map((c) => c.toLowerCase())
        const lng = names.findIndex((n) => n.startsWith("lon") || n === "x")
        const lat = names.findIndex((n) => n.startsWith("lat") || n === "y")
        if (lng >= 0 && lat >= 0) {
          lngIdx = lng
          latIdx = lat
          valIdx = names.findIndex((_, i) => i !== lng && i !== lat)
        }
      }
      continue
    }
    const lng = nums[lngIdx]!
    const lat = nums[latIdx]!
    const value = nums[valIdx]!
    if (!(value > 0) || !inBBox(bbox, lng, lat)) continue
    const h = latLngToCell(lat, lng, AUDIENCE_H3_RES)
    cells.set(h, (cells.get(h) ?? 0) + value)
  }
  return cells
}

/** Counts OSM nodes per cell. Nodes only — ways (malls, markets drawn as
 * areas) are skipped; ponytail: add `out center` ways if malls under-score. */
export function binPlaces(elements: { lat?: number; lon?: number }[], bbox: BBox): Map<string, number> {
  const cells = new Map<string, number>()
  for (const { lat, lon } of elements) {
    if (lat === undefined || lon === undefined || !inBBox(bbox, lon, lat)) continue
    const h = latLngToCell(lat, lon, AUDIENCE_H3_RES)
    cells.set(h, (cells.get(h) ?? 0) + 1)
  }
  return cells
}

export function mergeRaw(pop: Map<string, number>, poi: Map<string, number>): AudienceCellRaw[] {
  return [...new Set([...pop.keys(), ...poi.keys()])]
    .sort()
    .map((h) => ({ h, pop: Math.round(pop.get(h) ?? 0), poi: poi.get(h) ?? 0 }))
}
```

- [ ] **Step 4: Run the tests to confirm they pass.**
Run: `npm run test -w @workspace/geo`
Expected: PASS.

- [ ] **Step 5: Write the script.** Create `packages/geo/scripts/build-audience-index.ts`:

```ts
// Regenerates src/audience-index.data.ts. Usage (from repo root):
//   npm run build:audience -w @workspace/geo -- <path/to/ken_general_2020.csv>
// Population CSV: "Kenya: High Resolution Population Density Maps" on HDX
// (https://data.humdata.org/dataset/highresolutionpopulationdensitymaps-ken),
// the general-population CSV. Places: live Overpass query (OSM, ODbL).
import { createReadStream, writeFileSync } from "node:fs"
import { createInterface } from "node:readline"

import { binPlaces, binPopulation, mergeRaw } from "../src/audience-build"
import { NAIROBI_BBOX } from "../src/nairobi"

const csvPath = process.argv[2]
if (!csvPath) throw new Error("Pass the population CSV path as the first argument.")

const [w, s, e, n] = NAIROBI_BBOX
const area = `(${s},${w},${n},${e})`
const query = `[out:json][timeout:180];(
  node["amenity"]${area};
  node["shop"]${area};
  node["office"]${area};
  node["highway"="bus_stop"]${area};
  node["public_transport"]${area};
);out;`

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  body: new URLSearchParams({ data: query }),
})
if (!res.ok) throw new Error(`Overpass responded ${res.status}`)
const { elements } = (await res.json()) as { elements: { lat?: number; lon?: number }[] }
if (elements.length === 0) throw new Error("Overpass returned no places — refusing to write an all-residents index.")

const pop = await binPopulation(createInterface({ input: createReadStream(csvPath) }), NAIROBI_BBOX)
const cells = mergeRaw(pop, binPlaces(elements, NAIROBI_BBOX))

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  new URL("../src/audience-index.data.ts", import.meta.url),
  `// Generated by scripts/build-audience-index.ts on ${today}. Do not edit by hand.
// Sources: Meta HRSL population (CC BY 4.0) + OpenStreetMap places via Overpass (© OpenStreetMap contributors, ODbL).
import type { AudienceCellRaw } from "./audience"

export const AUDIENCE_RAW: AudienceCellRaw[] = ${JSON.stringify(cells)}
`,
)
console.log(`Wrote ${cells.length} cells (${elements.length} places, ${pop.size} populated cells).`)
```

In `packages/geo/package.json` `"scripts"` add `"build:audience": "tsx scripts/build-audience-index.ts",`.

- [ ] **Step 6: Generate the data.** Download and unzip the HDX general-population CSV (it's large; keep it **outside** the repo, e.g. the scratchpad), then:
Run: `npm run build:audience -w @workspace/geo -- "<path>/ken_general_2020.csv"`
Expected: `Wrote N cells (...)` with N roughly 1,500–2,500. If the HDX file's name differs, the header detection handles any `longitude`/`latitude` column order.

- [ ] **Step 7: Lint and typecheck.**
Run: `npm run lint -w @workspace/geo && npm run typecheck -w @workspace/geo`
Expected: PASS. If ESLint flags `console.log` in `scripts/`, add a single `// eslint-disable-next-line no-console` on that line.

- [ ] **Step 8: Commit.**

```bash
git add packages/geo/src/audience-build.ts packages/geo/src/audience-build.test.ts packages/geo/scripts/build-audience-index.ts packages/geo/package.json packages/geo/src/audience-index.data.ts
git commit -m "feat(geo): build Nairobi audience cells from HRSL population and OSM places"
```

---

### Task 4: Market queries + map GeoJSON

**Files:**
- Modify: `packages/geo/src/audience.ts`
- Test: `packages/geo/src/audience.test.ts`

**Interfaces:**
- Consumes: `AUDIENCE_RAW` (Task 3), `MARKET_AREAS` + `BBox` (Task 1), `scoreCells` (Task 2)
- Produces (all from `@workspace/geo/audience`):
  - `audienceCells(): AudienceCell[]` (memoised)
  - `type AudienceFeatureCollection = FeatureCollection<Polygon, { h: string; index: number }>`
  - `audienceGeoJSON(daypart: Daypart, cells?: AudienceCell[]): AudienceFeatureCollection`
  - `marketAudience(market: string | null | undefined, daypart: Daypart, cells?: AudienceCell[]): number | null`
  - `busiestDaypart(market: string | null | undefined, cells?: AudienceCell[]): Daypart | null`
  - `type AudienceBand = "Very high" | "High" | "Medium" | "Low"`, `audienceBand(index: number): AudienceBand`

- [ ] **Step 1: Write the failing tests.** Append to `packages/geo/src/audience.test.ts`. Replace the top import with `import { AUDIENCE_H3_RES, DAYPARTS, audienceBand, audienceCells, audienceGeoJSON, busiestDaypart, marketAudience, scoreCells, type AudienceCell, type AudienceCellRaw } from "./audience"` and add `import { latLngToCell } from "h3-js"` and `import { MARKET_AREAS } from "./nairobi"`:

```ts
const at = (lat: number, lng: number) => latLngToCell(lat, lng, AUDIENCE_H3_RES)
const fixed = (h: string, morning: number, midday: number, evening: number, night: number): AudienceCell => ({
  h,
  index: { morning, midday, evening, night },
})

describe("market queries", () => {
  const cbd = fixed(at(-1.2864, 36.8172), 70, 90, 80, 20)
  const outsideAnyMarket = fixed(at(-1.42, 36.98), 10, 10, 10, 10)
  const cells = [cbd, outsideAnyMarket]

  it("averages only the cells inside the market's area", () => {
    expect(marketAudience("CBD", "midday", cells)).toBe(90)
  })

  it("returns null for an unknown or missing market", () => {
    expect(marketAudience("Timbuktu", "midday", cells)).toBeNull()
    expect(marketAudience(null, "midday", cells)).toBeNull()
    expect(marketAudience(undefined, "midday", cells)).toBeNull()
  })

  it("returns null, not NaN, for a market with no scored cells", () => {
    expect(marketAudience("Eastlands", "midday", cells)).toBeNull()
    expect(busiestDaypart("Eastlands", cells)).toBeNull()
  })

  it("picks the daypart with the highest market score", () => {
    expect(busiestDaypart("CBD", cells)).toBe("midday")
  })

  it("draws closed hexagon rings carrying the daypart's index", () => {
    const fc = audienceGeoJSON("night", cells)
    expect(fc.features).toHaveLength(2)
    const ring = fc.features[0]!.geometry.coordinates[0]!
    expect(ring[0]).toEqual(ring[ring.length - 1])
    expect(fc.features[0]!.properties.index).toBe(20)
  })

  it("bands the index", () => {
    expect([audienceBand(80), audienceBand(79), audienceBand(60), audienceBand(40), audienceBand(39)]).toEqual([
      "Very high",
      "High",
      "High",
      "Medium",
      "Low",
    ])
  })
})

describe("generated Nairobi data", () => {
  it("scores every wizard market in every daypart", () => {
    for (const market of Object.keys(MARKET_AREAS))
      for (const d of DAYPARTS) expect(marketAudience(market, d), `${market} ${d}`).not.toBeNull()
  })

  it("puts the CBD in at least the High band at midday (sanity check on the sources)", () => {
    expect(marketAudience("CBD", "midday")!).toBeGreaterThanOrEqual(60)
    expect(audienceCells().length).toBeGreaterThan(500)
  })
})
```

- [ ] **Step 2: Run them to confirm they fail.**
Run: `npm run test -w @workspace/geo`
Expected: FAIL, `marketAudience` is not exported.

- [ ] **Step 3: Implement.** In `packages/geo/src/audience.ts` add these imports at the top:

```ts
import type { FeatureCollection, Polygon } from "geojson"
import { cellToBoundary, polygonToCells } from "h3-js"

import { AUDIENCE_RAW } from "./audience-index.data"
import { MARKET_AREAS } from "./nairobi"
import type { BBox } from "./types"
```

and append:

```ts
// ponytail: whole index ships in the client bundle (~2k cells). Move behind an
// API route when a second city makes it heavy.
let scored: AudienceCell[] | undefined
export function audienceCells(): AudienceCell[] {
  return (scored ??= scoreCells(AUDIENCE_RAW))
}

export type AudienceFeatureCollection = FeatureCollection<Polygon, { h: string; index: number }>

export function audienceGeoJSON(daypart: Daypart, cells = audienceCells()): AudienceFeatureCollection {
  return {
    type: "FeatureCollection",
    features: cells.map((c) => ({
      type: "Feature",
      properties: { h: c.h, index: c.index[daypart] },
      geometry: { type: "Polygon", coordinates: [cellToBoundary(c.h, true)] },
    })),
  }
}

function cellsIn([w, s, e, n]: BBox): Set<string> {
  return new Set(polygonToCells([[w, s], [e, s], [e, n], [w, n], [w, s]], AUDIENCE_H3_RES, true))
}

/** Mean index of the scored cells inside a market's area. Null for an unknown
 * market or an area with no data — callers render nothing for null. */
export function marketAudience(
  market: string | null | undefined,
  daypart: Daypart,
  cells = audienceCells(),
): number | null {
  const area = market ? MARKET_AREAS[market] : undefined
  if (!area) return null
  const inside = cellsIn(area)
  const hits = cells.filter((c) => inside.has(c.h))
  if (hits.length === 0) return null
  return Math.round(hits.reduce((sum, c) => sum + c.index[daypart], 0) / hits.length)
}

export function busiestDaypart(market: string | null | undefined, cells = audienceCells()): Daypart | null {
  let best: Daypart | null = null
  let bestScore = -1
  for (const d of DAYPARTS) {
    const score = marketAudience(market, d, cells)
    if (score !== null && score > bestScore) {
      best = d
      bestScore = score
    }
  }
  return best
}

export type AudienceBand = "Very high" | "High" | "Medium" | "Low"

export function audienceBand(index: number): AudienceBand {
  return index >= 80 ? "Very high" : index >= 60 ? "High" : index >= 40 ? "Medium" : "Low"
}
```

- [ ] **Step 4: Run them to confirm they pass.**
Run: `npm run test -w @workspace/geo && npm run typecheck -w @workspace/geo && npm run lint -w @workspace/geo`
Expected: PASS. If the CBD sanity test fails, **stop and report**: it means the sources or weights are off, and that needs a decision, not a lower threshold.

- [ ] **Step 5: Commit.**

```bash
git add packages/geo/src/audience.ts packages/geo/src/audience.test.ts
git commit -m "feat(geo): market-level audience index and hexagon GeoJSON"
```

---

### Task 5: `MapCanvas` accepts map layers

**Files:**
- Modify: `packages/ui/src/components/map-canvas.tsx`

**Interfaces:**
- Produces: `MapCanvasProps.layers?: ReactNode`, rendered inside `<Map>` before the rail. Optional, so the ops and driver map pages are unchanged.

- [ ] **Step 1: Implement.** In `MapCanvasProps` add, after `children`:

```ts
  /** Map layers (`<MapGeoJSON>`, `<MapRoute>`, markers) drawn under the rail */
  layers?: ReactNode
```

Destructure `layers` in `MapCanvas({ … })` and render `{layers}` directly after `<MapBuildings3D enabled={is3D} />`.

- [ ] **Step 2: Typecheck.**
Run: `npm run typecheck -w @workspace/ui && npm run lint -w @workspace/ui`
Expected: PASS.

- [ ] **Step 3: Commit.**

```bash
git add packages/ui/src/components/map-canvas.tsx
git commit -m "feat(ui): let MapCanvas render map layers"
```

---

### Task 6: Customer map shows the foot-traffic layer

**Files:**
- Modify: `apps/customer-web/components/maps/customer-map-view.tsx`

**Interfaces:**
- Consumes: `DAYPARTS`, `DAYPART_LABELS`, `type Daypart`, `audienceGeoJSON`, `marketAudience`, `audienceBand` from `@workspace/geo/audience`; `MARKET_AREAS` from `@workspace/geo`; `MapCanvas.layers` (Task 5); `MapGeoJSON` from `@workspace/ui/components/map`

- [ ] **Step 1: Implement.** Add these imports:

```ts
import { useMemo, useState } from "react"

import { MARKET_AREAS } from "@workspace/geo"
import {
  DAYPARTS,
  DAYPART_LABELS,
  audienceBand,
  audienceGeoJSON,
  marketAudience,
  type Daypart,
} from "@workspace/geo/audience"
import { Button } from "@workspace/ui/components/button"
import { MapGeoJSON } from "@workspace/ui/components/map"
```

Inside `CustomerMapView`, before the `return`:

```ts
  const [daypart, setDaypart] = useState<Daypart>("midday")
  // Memoised per daypart: MapGeoJSON re-syncs its source whenever `data` changes identity.
  const audience = useMemo(() => audienceGeoJSON(daypart), [daypart])
  const rankedMarkets = useMemo(
    () =>
      Object.keys(MARKET_AREAS)
        .map((market) => ({ market, index: marketAudience(market, daypart) }))
        .filter((m): m is { market: string; index: number } => m.index !== null)
        .sort((a, b) => b.index - a.index),
    [daypart],
  )
```

Pass to `MapCanvas`:

```tsx
      note="Foot-traffic index is modelled from population and places (Meta HRSL · © OpenStreetMap contributors). Corridor stats are illustrative."
      layers={
        <MapGeoJSON
          id="audience"
          data={audience}
          linePaint={false}
          fillPaint={{
            "fill-color": "#0B6E4F",
            "fill-opacity": ["interpolate", ["linear"], ["get", "index"], 0, 0.04, 100, 0.55],
          }}
        />
      }
```

Put these rows first inside the `MapCanvas` children, before the existing `COVERAGE_CORRIDORS.map(…)`:

```tsx
      <div className="space-y-2 px-4 py-3.5">
        <p className="text-xs font-medium text-muted-foreground">Foot traffic by time of day</p>
        <div className="flex flex-wrap gap-1.5">
          {DAYPARTS.map((d) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant={d === daypart ? "default" : "outline"}
              aria-pressed={d === daypart}
              onClick={() => setDaypart(d)}
            >
              {DAYPART_LABELS[d].split(" · ")[0]}
            </Button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">{DAYPART_LABELS[daypart]}</p>
      </div>
      {rankedMarkets.map(({ market, index }) => (
        <div key={market} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <p className="truncate text-sm font-semibold">{market}</p>
          <p className="shrink-0 text-xs text-muted-foreground">
            {index}/100 · {audienceBand(index)}
          </p>
        </div>
      ))}
```

- [ ] **Step 2: Typecheck and lint.**
Run: `npm run typecheck -w customer-web && npm run lint -w customer-web`
Expected: PASS.

- [ ] **Step 3: Check it in the running app.**
Run: `npm run dev:customer-web`, open http://localhost:3002/map.
Expected:
- Green hexes cover Nairobi, darkest over the CBD at Midday.
- Switching to Night re-shades toward the estates without the map flashing or re-centring.
- The market list re-orders when the daypart changes.
- The rail note shows the attribution line.
- Dark theme still looks right.

- [ ] **Step 4: Commit.**

```bash
git add apps/customer-web/components/maps/customer-map-view.tsx
git commit -m "feat(customer-web): foot-traffic index layer on the campaign map"
```

---

### Task 7: Wizard shows the chosen market's foot traffic

**Files:**
- Modify: `apps/customer-web/components/campaigns/campaign-wizard.tsx` (below the Market `ChoiceRow`, ~line 381)

**Interfaces:**
- Consumes: `audienceBand`, `busiestDaypart`, `marketAudience`, `DAYPART_LABELS` from `@workspace/geo/audience`

- [ ] **Step 1: Implement.** Add the import:

```ts
import { DAYPART_LABELS, audienceBand, busiestDaypart, marketAudience } from "@workspace/geo/audience"
```

Add this component next to `ChoiceRow`:

```tsx
/** Renders nothing for a market the index doesn't cover (e.g. a legacy value). */
function MarketAudienceNote({ market }: { market: string }) {
  const best = busiestDaypart(market)
  const index = best ? marketAudience(market, best) : null
  if (!best || index === null) return null
  return (
    <p className="text-xs text-muted-foreground">
      Foot-traffic index {index}/100 ({audienceBand(index)}), busiest in the{" "}
      {DAYPART_LABELS[best].split(" · ")[0]!.toLowerCase()}. Modelled estimate — compare areas on the Map page.
    </p>
  )
}
```

Directly under `<ChoiceRow options={MARKETS} value={market as never} onChange={setMarket} />` add:

```tsx
            {market ? <MarketAudienceNote market={market} /> : null}
```

- [ ] **Step 2: Typecheck, lint, check.**
Run: `npm run typecheck -w customer-web && npm run lint -w customer-web`, then in the dev server open `/campaigns/new` and pick each market.
Expected: PASS. Each market shows one line, and the CBD reads High or Very high, busiest midday.

- [ ] **Step 3: Commit.**

```bash
git add apps/customer-web/components/campaigns/campaign-wizard.tsx
git commit -m "feat(customer-web): show market foot-traffic index in the campaign wizard"
```

---

### Task 8: Docs + graph

**Files:**
- Modify: `docs/customer/APP.md` (the `/map` row, plus a short section)
- Modify: `docs/shared/FEATURE-INVENTORY.md` (the map paragraph, ~line 176)

- [ ] **Step 1: Update `docs/customer/APP.md`.** Replace the `/map` row with:

```md
| `/map` | mapcn/MapLibre with `@workspace/geo` Nairobi fixtures, plus the **foot-traffic index** hexagon layer with a daypart switch and markets ranked by index (see below) |
```

Then add this section after "Org permissions in the UI":

```md
### Foot-traffic index (modelled)

`@workspace/geo/audience` scores Nairobi H3 cells (res 8) 0–100 per daypart (morning 6–10, midday 10–4, evening 4–8, night 8–6) from Meta HRSL residents + OpenStreetMap places, blended with hand-set `DAYPART_WEIGHTS` and ranked city-wide. Market scores average the cells inside `MARKET_AREAS`. It is a **modelled estimate** — always labelled as such with source attribution. Shown on `/map` and under the Market choice in the campaign wizard. Regenerate the data with `npm run build:audience -w @workspace/geo -- <hrsl.csv>`. Imported only via the `@workspace/geo/audience` subpath so other apps don't bundle `h3-js`.
```

- [ ] **Step 2: Update `docs/shared/FEATURE-INVENTORY.md`.** At the end of the map paragraph, append: `The customer map also draws a modelled foot-traffic index (H3 hexagons from HRSL population + OSM places, per daypart) — see docs/customer/APP.md.`

- [ ] **Step 3: Refresh the graph.**
Run: `graphify update .`

- [ ] **Step 4: Commit.**

```bash
git add docs/customer/APP.md docs/shared/FEATURE-INVENTORY.md
git commit -m "docs: document the modelled foot-traffic index"
```

---

## Roadmap after Phase 1 (separate plans, not part of this one)

The decisions from the 2026-09-24 research. Each step gets its own plan when it starts.

| Step | What | Why this order |
|---|---|---|
| **1b. Calibrate** | Ops runs manual pedestrian counts at 20–30 points across markets and dayparts. Fit `DAYPART_WEIGHTS` to those counts, which changes only the constants. | Turns "modelled" into "calibrated". It's the cheapest step that makes the numbers defensible to buyers. |
| **1c. Places upgrade** | If OSM under-counts estates, swap or blend in Google Places Aggregate API counts per H3 cell. | Only if the calibration shows OSM gaps. |
| **2. GPS pings + play log** | A new table of pings (unit, lat, lng, ts, speed, screen_on), from the driver app or the screen supplier's player, plus map-matching. | Prerequisite for any per-campaign audience number. There is no telemetry today. |
| **3. Estimated impressions in proof of play** | For each ping interval: people in the swept area (index-derived density × distance × 2 × ~35 m view radius) plus people passing during dwell time, × visibility factor ~0.3–0.5, following the industry (Geopath) method. Add low / likely / high per zone to the **existing** proof-of-play PDF. | Uses 1b's calibrated density and 2's tracks. |
| **4. Hex / daypart targeting** | Let advertisers book specific hexes or dayparts (a Campaign schema change plus ops dispatch). Consider tying zone-tier pricing to the index. | Only once pings can prove the screen actually went there at that time. |
| **5. Live layer** | TomTom Traffic Flow (congestion = dwell time) and BestTime live busyness for hubs such as malls and stages, as "busy now vs usual". | Nice for dispatch and a live view, but not needed for reports. |
| **6. Telco density** | A business-development deal with Safaricom for aggregated network density (CAMARA Population Density or a custom arrangement). It replaces the modelled density with measured data and supports CPM pricing. | Best data source, longest lead time. Start the conversation early. |

Also later: port the index to the customer-mobile wizard and map, which renders through a WebView, so it can take the same GeoJSON.

---

## Addendum (2026-10-09)

`h3-js@^4` is already a dependency of `packages/geo` (added for the ops demo-fleet map), so Task 2 Step 1's `npm install` is a no-op — still add the `./audience` subpath. A sibling subpath `@workspace/geo/markets` ([`markets.ts`](../../../packages/geo/src/markets.ts)) now defines the six wizard markets as H3 resolution-8 cell sets (`MARKET_H3_RES = 8`, `MARKET_CELLS`, `marketAt`). The audience index can reuse it to aggregate cell scores per market instead of re-deriving market areas. Like `./audience`, it is not re-exported from the package root.
