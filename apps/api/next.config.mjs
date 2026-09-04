import path from "node:path"
import { fileURLToPath } from "node:url"

import { withSentryConfig } from "@sentry/nextjs"

import { getSentryBuildPluginOptions } from "@workspace/sentry-config/build-options"

const appDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(appDir, "../..")

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: repoRoot,
  transpilePackages: ["@workspace/sentry-config", "@workspace/ops-contracts"],
  // takumi-pdf loads a WASM asset via a Node-native path; letting webpack
  // bundle/rewrite that reference breaks it ("path argument must be of
  // type string ... Received an instance of URL"). Keeping it external
  // means Node requires it directly at runtime instead.
  serverExternalPackages: ["takumi-pdf"],
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
