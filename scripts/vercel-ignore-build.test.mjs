import assert from "node:assert/strict"
import test from "node:test"

import { appSlugFromCwd, shouldSkipBuild } from "./vercel-ignore-build.mjs"

test("docs-only commits skip every app", () => {
  const files = ["docs/shared/DEPLOYMENT.md", "README.md", "CLAUDE.md"]
  assert.equal(shouldSkipBuild(files, "web"), true)
  assert.equal(shouldSkipBuild(files, "api"), true)
  assert.equal(shouldSkipBuild(files, "ops"), true)
  assert.equal(shouldSkipBuild(files, "customer-web"), true)
  assert.equal(shouldSkipBuild(files, "driver-web"), true)
})

test("app-local changes only build that app", () => {
  assert.equal(shouldSkipBuild(["apps/web/app/page.tsx"], "web"), false)
  assert.equal(shouldSkipBuild(["apps/web/app/page.tsx"], "api"), true)
  assert.equal(shouldSkipBuild(["apps/api/app/v1/health/route.ts"], "api"), false)
  assert.equal(shouldSkipBuild(["apps/customer-web/app/layout.tsx"], "driver-web"), true)
})

test("shared packages and lockfiles rebuild every app", () => {
  assert.equal(shouldSkipBuild(["packages/ui/src/components/button.tsx"], "web"), false)
  assert.equal(shouldSkipBuild(["package-lock.json"], "ops"), false)
  assert.equal(shouldSkipBuild(["turbo.json"], "api"), false)
  assert.equal(shouldSkipBuild(["patches/next+16.2.11.patch"], "driver-web"), false)
})

test("empty diff does not skip (safer to build)", () => {
  assert.equal(shouldSkipBuild([], "web"), false)
})

test("appSlugFromCwd uses the last path segment", () => {
  assert.equal(appSlugFromCwd("/repo/apps/customer-web"), "customer-web")
})
