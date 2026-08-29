import path from "node:path"
import { fileURLToPath } from "node:url"

import { withPayload } from "@payloadcms/next/withPayload"
import { withSentryConfig } from "@sentry/nextjs"

import { getSentryBuildPluginOptions } from "@workspace/sentry-config/build-options"

import { CONTENT_SIGNAL_HEADER } from "./lib/seo/robots-content-signals.js"

const appDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(appDir, "../..")

/** Webpack on Windows needs forward slashes in resolve.alias targets. */
function webpackPath(...segments) {
  return path.resolve(...segments).replace(/\\/g, "/")
}

const vercelBlobClientStub = webpackPath(appDir, "lib/payload/vercel-blob-client-stub.tsx")
const cloudStorageClientUtilities = webpackPath(
  appDir,
  "lib/payload/cloud-storage-client-utilities.js",
)

function mediaHostnamesFromEnv() {
  const hosts = new Set(["admobihq.com", "staging.admobihq.com"])
  const fromEnv = process.env.NEXT_PUBLIC_SERVER_URL?.trim()
  if (fromEnv) {
    try {
      hosts.add(new URL(fromEnv.replace(/\/$/, "")).hostname)
    } catch {
      // ignore invalid URL
    }
  }
  return [...hosts]
}

const mediaImagePatterns = [
  ...mediaHostnamesFromEnv().map((hostname) => ({
    protocol: "https",
    hostname,
    pathname: "/api/media/**",
  })),
  {
    protocol: "http",
    hostname: "localhost",
    port: "3000",
    pathname: "/api/media/**",
  },
  {
    protocol: "https",
    hostname: "*.public.blob.vercel-storage.com",
    pathname: "/**",
  },
]

const allowSiteIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false"

/** Node built-ins that must never ship in the Payload admin client bundle. */
const CLIENT_NODE_FALLBACKS = {
  worker_threads: false,
  child_process: false,
  fs: false,
  net: false,
  tls: false,
  dns: false,
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Monorepo root: avoids Next picking C:\Users\victo\package-lock.json and breaking CSS traces.
  outputFileTracingRoot: repoRoot,
  experimental: {
    // Custom 404 for unmatched URLs when using multiple root layouts.
    globalNotFound: true,
  },
  transpilePackages: ["@workspace/ui", "@workspace/sentry-config", "@workspace/ops-api-client", "@payload-bites/image-search"],
  images: {
    remotePatterns: mediaImagePatterns,
    minimumCacheTTL: 60 * 60 * 24 * 31,
  },
  // Payload DB adapters pull in drizzle-kit/esbuild; must not be bundled (Turbopack dev especially).
  serverExternalPackages: [
    "payload",
    "@payloadcms/db-postgres",
    "@payloadcms/drizzle",
    "drizzle-kit",
    "esbuild",
    "pino",
    "pino-pretty",
    "sharp",
  ],
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@prisma/engines/**",
      "node_modules/.prisma/client/**",
      "node_modules/@payloadcms/**/dist/admin/**",
    ],
  },
  // Mirror webpack aliases when using `npm run dev:turbo` (Turbopack ignores webpack config).
  turbopack: {
    resolveAlias: {
      "@payloadcms/storage-vercel-blob/client": vercelBlobClientStub,
      "@payloadcms/plugin-cloud-storage/utilities": cloudStorageClientUtilities,
      "@payloadcms/plugin-cloud-storage/dist/exports/utilities.js":
        cloudStorageClientUtilities,
    },
  },
  async rewrites() {
    return [
      { source: "/icon", destination: "/icon.png" },
      { source: "/apple-icon", destination: "/apple-icon.png" },
      { source: "/opengraph-image", destination: "/opengraph-image.png" },
      { source: "/logo", destination: "/logo.png" },
      // apps/customer-mobile's web export (public/app-demo, see its
      // export:web-demo script) is served under its exact index.html file —
      // Next's static handling doesn't do directory-index resolution — but
      // expo-router's client-side routing expects the clean /app-demo path
      // it was built with (experiments.baseUrl in customer-mobile's
      // app.config.js), so this rewrites the clean URL to the real file
      // without changing what the browser shows.
      { source: "/app-demo", destination: "/app-demo/index.html" },
    ]
  },
  async headers() {
    const stagingNoIndex = allowSiteIndexing
      ? []
      : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]

    return [
      {
        source: "/icon",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/apple-icon",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/opengraph-image",
        headers: [
          { key: "X-Robots-Tag", value: "noindex" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/logo",
        headers: [
          { key: "X-Robots-Tag", value: "noindex" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/icon.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/apple-icon.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/opengraph-image.png",
        headers: [
          { key: "X-Robots-Tag", value: "noindex" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/logo.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:path*",
        headers: [CONTENT_SIGNAL_HEADER, ...stagingNoIndex],
      },
    ]
  },
  webpack: (webpackConfig, { webpack, isServer }) => {
    // Payload always registers VercelBlobClientUploadHandler in the import map even when
    // clientUploads is false. The real handler pulls server-only code into the admin bundle.
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      "@payloadcms/storage-vercel-blob/client": vercelBlobClientStub,
      "@payloadcms/plugin-cloud-storage/utilities": cloudStorageClientUtilities,
      "@payloadcms/plugin-cloud-storage/dist/exports/utilities.js":
        cloudStorageClientUtilities,
    }

    if (!isServer) {
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        ...CLIENT_NODE_FALLBACKS,
      }
    }

    webpackConfig.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@payloadcms[\\/]storage-vercel-blob[\\/]dist[\\/]client[\\/]VercelBlobClientUploadHandler\.js$/,
        vercelBlobClientStub,
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@payloadcms[\\/]storage-vercel-blob[\\/]dist[\\/]exports[\\/]client\.js$/,
        vercelBlobClientStub,
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@payloadcms[\\/]plugin-cloud-storage[\\/]dist[\\/]exports[\\/]utilities\.js$/,
        cloudStorageClientUtilities,
      ),
    )

    return webpackConfig
  },
}

export default withSentryConfig(withPayload(nextConfig), getSentryBuildPluginOptions())
