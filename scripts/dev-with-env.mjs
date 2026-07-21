/**
 * Pull Infisical secrets, then start local dev servers via Turbo.
 *
 * Usage (from repo root):
 *   npm run dev                      # pull all secrets + web, api, ops, app
 *   npm run dev:all                  # same + both Expo apps
 *   npm run dev:stack:mobile         # pull api + mobile secrets; api + both Expo apps
 *   npm run dev:stack:mobile:ops     # pull api + mobile secrets; api + ops Expo only
 *   npm run dev:stack:mobile:customer  # pull api + app-mobile secrets; api + customer Expo only
 *   npm run dev:skip-pull            # skip Infisical, use existing .env.local
 *   npm run dev:staging              # pull staging secrets + start web stack
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
const mobileStack = args.has("--mobile-stack")
const opsOnly = args.has("--ops-only")
const customerOnly = args.has("--customer-only")
const envName = staging ? "staging" : "dev"
const pullScript = staging ? "env:pull:staging" : "env:pull"

const coreApps = ["web", "api", "ops", "app"]

function pullTargets() {
  if (mobileStack) {
    if (opsOnly) return ["api", "mobile"]
    if (customerOnly) return ["api", "app-mobile"]
    return ["api", "mobile", "app-mobile"]
  }
  return null
}

function devFilters() {
  if (mobileStack) {
    if (opsOnly) return ["api", "mobile"]
    if (customerOnly) return ["api", "app-mobile"]
    return ["api", "mobile", "app-mobile"]
  }

  const filters = [...coreApps]
  if (includeMobile) {
    filters.push("mobile", "app-mobile")
  }
  return filters
}

function hasAnyEnvFile(apps) {
  return apps.some((app) =>
    existsSync(resolve(root, "apps", app, ".env.local")),
  )
}

function runPull() {
  const targets = pullTargets()

  if (targets) {
    console.log(
      `[dev] Pulling secrets for ${targets.join(", ")} from Infisical (${envName})…`,
    )
    for (const app of targets) {
      const result = spawnSync("npm", ["run", pullScript, "-w", app], {
        cwd: root,
        stdio: "inherit",
        shell: true,
      })
      if (result.status !== 0) {
        if (hasAnyEnvFile(targets)) {
          console.warn(
            `[dev] env:pull failed for ${app} — continuing with existing .env.local files`,
          )
          continue
        }
        console.error(`[dev] env:pull failed for ${app} and no .env.local found.`)
        console.error("      Run: infisical login && cd apps/web && infisical init")
        process.exit(result.status ?? 1)
      }
    }
    console.log("[dev] Mobile stack secrets pulled")
    return
  }

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

  if (hasAnyEnvFile(coreApps)) {
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

const filters = devFilters()

const turboArgs = ["turbo", "dev", ...filters.flatMap((name) => ["--filter", name])]

console.log(`[dev] Starting ${filters.join(", ")}…`)

if (mobileStack) {
  console.log(
    "      api :3003 | mobile :8081 | app-mobile :8082 (Expo — press i on a task in Turbo to interact)",
  )
} else {
  console.log(
    "      web :3000 | api :3003 | ops :3001 | app :3002" +
      (includeMobile ? " | mobile :8081 | app-mobile :8082 (Expo)" : ""),
  )
}

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
