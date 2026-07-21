/**
 * Pull Infisical secrets, then start local dev servers via Turbo.
 *
 * Usage (from repo root):
 *   npm run dev                 # pull dev secrets + web, api, ops, app
 *   npm run dev:all             # same + mobile (Expo)
 *   npm run dev:skip-pull       # skip Infisical, use existing .env.local
 *   npm run dev:staging         # pull staging secrets + start apps
 */
import { spawn, spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const args = new Set(process.argv.slice(2))

const skipPull = args.has("--skip-pull")
const staging = args.has("--staging")
const includeMobile = args.has("--mobile")
const envName = staging ? "staging" : "dev"
const pullScript = staging ? "env:pull:staging" : "env:pull"

const coreApps = ["web", "api", "ops", "app"]

function hasAnyEnvFile() {
  return coreApps.some((app) =>
    existsSync(resolve(root, "apps", app, ".env.local")),
  )
}

function runPull() {
  console.log(`[dev] Pulling secrets from Infisical (${envName})…`)
  const result = spawnSync("npm", ["run", pullScript], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  })

  if (result.status === 0) {
    console.log("[dev] Secrets pulled to apps/*/.env.local")
    return
  }

  if (hasAnyEnvFile()) {
    console.warn(
      "[dev] env:pull failed — continuing with existing apps/*/.env.local files",
    )
    console.warn(
      "      Fix: infisical login && cd apps/web && infisical init",
    )
    return
  }

  console.error("[dev] env:pull failed and no .env.local files were found.")
  console.error("      Run: infisical login && cd apps/web && infisical init")
  console.error("      Then: npm run env:pull")
  process.exit(result.status ?? 1)
}

if (!skipPull) {
  runPull()
} else {
  console.log("[dev] Skipping Infisical pull (--skip-pull)")
}

const filters = [...coreApps]
if (includeMobile) {
  filters.push("mobile")
}

const turboArgs = ["turbo", "dev", ...filters.flatMap((name) => ["--filter", name])]

console.log(`[dev] Starting ${filters.join(", ")}…`)
console.log(
  "      web :3000 | api :3003 | ops :3001 | app :3002" +
    (includeMobile ? " | mobile (Expo)" : ""),
)

const child = spawn("npx", turboArgs, {
  cwd: root,
  stdio: "inherit",
  shell: true,
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
