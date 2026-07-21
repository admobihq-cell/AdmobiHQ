import path from "node:path"
import { fileURLToPath } from "node:url"

import { withSentryConfig } from "@sentry/nextjs"

import { getSentryBuildPluginOptions } from "@workspace/sentry-config/build-options"

const appDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(appDir, "../..")

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo: trace deps from repo root on Vercel (matches apps/web).
  outputFileTracingRoot: repoRoot,
  transpilePackages: [
    "@workspace/ui",
    "@workspace/sentry-config",
    "@workspace/ops-contracts",
    "@workspace/ops-api-client",
    "@workspace/geo",
  ],
  // Monorepo: stop Turbopack from using C:\Users\victo\ as the workspace root
  turbopack: {
    root: repoRoot,
  },
}

export default withSentryConfig(nextConfig, getSentryBuildPluginOptions())
