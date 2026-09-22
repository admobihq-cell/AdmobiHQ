/**
 * Copies maplibre-gl's worker files into the calling app's `public/maplibre/`.
 *
 * maplibre-gl 6 dropped the inlined worker: it now derives the worker URL from
 * its own `import.meta.url` at runtime. Webpack inlines that as the *build
 * machine's* `file://` path, so maplibre's detection bails, returns "", and
 * ends up at `new Worker("")` — which loads the current HTML document as a
 * module script ("non-JavaScript MIME type text/html") and leaves the map on
 * its loading spinner forever. We serve the worker ourselves instead; see
 * MAPLIBRE_WORKER_URL in packages/ui/src/components/map.tsx.
 *
 * Run from an app directory (predev/prebuild). Both files must land in the
 * same directory — the worker imports ./maplibre-gl-shared.mjs relatively.
 */
import { copyFileSync, mkdirSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs"

// The served path and the URL maplibre is pointed at have to stay in step —
// if they drift, the map silently goes back to spinning forever.
const mapComponent = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../packages/ui/src/components/map.tsx",
)
if (!readFileSync(mapComponent, "utf8").includes(`"${WORKER_URL}"`)) {
  throw new Error(
    `MAPLIBRE_WORKER_URL in packages/ui/src/components/map.tsx no longer matches ${WORKER_URL}`,
  )
}

const dist = path.join(
  path.dirname(createRequire(import.meta.url).resolve("maplibre-gl/package.json")),
  "dist",
)
const target = path.join(process.cwd(), "public", path.dirname(WORKER_URL))

mkdirSync(target, { recursive: true })
for (const file of [path.basename(WORKER_URL), "maplibre-gl-shared.mjs"]) {
  copyFileSync(path.join(dist, file), path.join(target, file))
}
