import path from "node:path"
import { fileURLToPath } from "node:url"

import { withSentryConfig } from "@sentry/nextjs"

import { getSentryBuildPluginOptions } from "@workspace/sentry-config/build-options"

const appDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(appDir, "../..")

// Baseline hardening on every response. frame-ancestors / X-Frame-Options stop
// clickjacking (nothing legitimately frames this app); nosniff stops browsers second-guessing
// the Content-Type of proxied uploads. HSTS is left to Vercel, which already
// sends it. See docs/shared/SECURITY.md.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
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
  async redirects() {
    return [
      // Land straight on the first settings tab — no /settings render + hop.
      { source: "/settings", destination: "/settings/profile", permanent: false },
    ]
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
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
