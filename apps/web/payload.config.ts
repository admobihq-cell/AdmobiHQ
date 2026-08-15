import "./lib/load-env.ts"

import path from "node:path"
import { fileURLToPath } from "node:url"

import { imageSearchPlugin } from "@payload-bites/image-search"
import { postgresAdapter } from "@payloadcms/db-postgres"
import { lexicalEditor } from "@payloadcms/richtext-lexical"
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob"
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

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, HelpCategories, HelpArticles, BlogPosts],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "dev-only-change-me",
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
            // Vercel Blob rejects re-uploading an existing path outright (no
            // overwrite support in this adapter version). Without this, any
            // upload that reuses a filename already in the bucket — a retried
            // seed run, two people uploading the same asset — fails hard.
            addRandomSuffix: true,
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
