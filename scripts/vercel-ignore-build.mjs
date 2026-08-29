/**
 * Vercel ignoreCommand: exit 0 skips the build, exit 1 proceeds.
 *
 * Skips when the commit does not touch this app, shared packages, lockfiles,
 * or the ignore/icon scripts — so docs-only pushes do not invalidate ISR
 * on all five Fluid projects.
 *
 * Usage (from an app root directory, as Vercel runs it):
 *   node ../../scripts/vercel-ignore-build.mjs
 */
import { execSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SHARED_PREFIXES = [
  "packages/",
  "patches/",
  "scripts/generate-web-brand-icons.mjs",
  "scripts/vercel-ignore-build.mjs",
]

const SHARED_FILES = new Set(["package.json", "package-lock.json", "turbo.json", ".npmrc"])

export function appSlugFromCwd(cwd = process.cwd()) {
  return path.basename(cwd)
}

export function shouldSkipBuild(changedFiles, appSlug) {
  if (!changedFiles.length) return false

  const appPrefix = `apps/${appSlug}/`
  return !changedFiles.some((file) => {
    if (file.startsWith(appPrefix)) return true
    if (SHARED_FILES.has(file)) return true
    return SHARED_PREFIXES.some((prefix) => file === prefix || file.startsWith(prefix))
  })
}

function gitChangedFiles(from, to) {
  try {
    return execSync(`git diff --name-only ${from} ${to}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return null
  }
}

function main() {
  const appSlug = process.argv[2] || appSlugFromCwd()
  const from = process.env.VERCEL_GIT_PREVIOUS_SHA
  const to = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD"

  if (!from) {
    process.exit(1)
  }

  const changed = gitChangedFiles(from, to)
  if (!changed) {
    process.exit(1)
  }

  process.exit(shouldSkipBuild(changed, appSlug) ? 0 : 1)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main()
}
