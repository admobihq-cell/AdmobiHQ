import path from "node:path"
import { fileURLToPath } from "node:url"

import { withSentryConfig } from "@sentry/nextjs"

import { getSentryBuildPluginOptions } from "@workspace/sentry-config/build-options"

const appDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(appDir, "../..")

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: repoRoot,
  transpilePackages: [
    "@workspace/ui",
    "@workspace/sentry-config",
    "@workspace/ops-contracts",
    "@workspace/ops-api-client",
    "@workspace/geo",
    "@workspace/query-client",
  ],
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
  turbopack: {
    root: repoRoot,
  },
  async headers() {
    return [
      {
        source: "/icon",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/apple-icon",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, getSentryBuildPluginOptions())
