import "./lib/load-env.ts"

import path from "node:path"
import { fileURLToPath } from "node:url"

import { imageSearchPlugin } from "@payload-bites/image-search"
import { postgresAdapter } from "@payloadcms/db-postgres"
import { EXPERIMENTAL_TableFeature, lexicalEditor } from "@payloadcms/richtext-lexical"
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob"
import { attachDatabasePool } from "@vercel/functions"
import { buildConfig } from "payload"
import sharp from "sharp"

import { patchVercelBlobClientImport } from "@/lib/payload/patch-vercel-blob-client-import"
import { resolvePayloadDatabaseUrlForConfig } from "@/lib/resolve-database-url"

import { BlogPosts } from "./collections/BlogPosts"
import { HelpArticles } from "./collections/HelpArticles"
import { HelpCategories } from "./collections/HelpCategories"
import { Media } from "./collections/Media"
import { Users } from "./collections/Users"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const payloadDatabaseUrl = resolvePayloadDatabaseUrlForConfig()

const blobToken = process.env.BLOB_READ_WRITE_TOKEN?.trim()

// Payload signs admin session JWTs with this. A known fallback on a deployed
// site would let anyone forge a CMS admin session, so only local dev gets one.
function resolvePayloadSecret(): string {
  const secret = process.env.PAYLOAD_SECRET?.trim()
  if (secret) return secret
  if (process.env.VERCEL) throw new Error("PAYLOAD_SECRET must be set on every Vercel deployment")
  return "dev-only-change-me"
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, HelpCategories, HelpArticles, BlogPosts],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [...defaultFeatures, EXPERIMENTAL_TableFeature()],
  }),
  secret: resolvePayloadSecret(),
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    // Isolates every Payload table/enum in its own Postgres schema so Prisma's
    // migration engine (scoped to `public`) never sees them and can't propose
    // dropping them. Existing rows were moved here via the one-time
    // prisma/scripts/isolate-payload-schema.sql cutover — see that file.
    schemaName: "cms",
    pool: {
      connectionString: payloadDatabaseUrl,
      // Neon scale-to-zero often needs >10s to accept TCP. max: 1 plus parallel
      // finds (header + page, categories + articles) queued waiters on the same
      // connect timeout — that is the production admin/blog outage.
      max: process.env.VERCEL ? 2 : payloadDatabaseUrl.includes("neon.tech") ? 3 : 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: process.env.VERCEL ? 30_000 : 10_000,
      allowExitOnIdle: true,
    },
    // Never auto-push: Drizzle would drop Prisma tables (leads, drivers, fleet_partners).
    push: false,
  }),
  // @payloadcms/db-postgres never listens for 'error' on the pool itself, only on the
  // one-off startup client. When the DB provider (Neon/Vercel Postgres) kills an idle
  // pooled connection (e.g. "terminating connection due to administrator command"),
  // pg emits an unhandled 'error' on the pool, which Node treats as an uncaught
  // exception and crashes the whole function. Attach a listener so pg just drops the
  // dead client and reconnects on the next query instead of taking the process down.
  onInit: async (payload) => {
    const pool = (payload.db as { pool?: import("pg").Pool }).pool
    pool?.on("error", (err) => {
      payload.logger.error({ err }, "Postgres pool idle client error")
    })
    if (process.env.VERCEL && pool) {
      attachDatabasePool(pool)
    }
  },
  plugins: [
    ...(blobToken
      ? [
          vercelBlobStorage({
            collections: {
              media: true,
            },
            // Server-side uploads only, avoids browser → Blob direct upload path.
            clientUploads: false,
            // No addRandomSuffix. The adapter only writes the suffixed name back
            // for the ORIGINAL file — thumbnail/card/hero keep their plain
            // names in the DB while Blob stores them suffixed, so every resized
            // URL 404s. It's not needed anyway: the adapter put()s with
            // allowOverwrite (a retried seed run just overwrites), and Payload
            // already renames a clashing upload to `name-1.ext` per collection.
            token: blobToken,
          }),
        ]
      : []),
    imageSearchPlugin({
      enabled: true,
      providerAccess: ({ req: { user } }) => Boolean(user),
      enablePreview: true,
    }),
    // After vercelBlobStorage, rewrite client handler to local stub for import map / webpack.
    patchVercelBlobClientImport(),
  ],
  sharp,
})
