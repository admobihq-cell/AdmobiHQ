import path from "node:path"
import { fileURLToPath } from "node:url"

import { withSentryConfig } from "@sentry/nextjs"

import { getSentryBuildPluginOptions } from "@workspace/sentry-config/build-options"

const appDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(appDir, "../..")

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: repoRoot,
  transpilePackages: ["@workspace/ui", "@workspace/sentry-config"],
  turbopack: {
    root: repoRoot,
  },
}

export default withSentryConfig(nextConfig, getSentryBuildPluginOptions())
