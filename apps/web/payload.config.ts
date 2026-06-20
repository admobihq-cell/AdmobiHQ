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
    pool: {
      connectionString: payloadDatabaseUrl,
    },
    // Never auto-push: Drizzle would drop Prisma tables (leads, drivers, fleet_partners).
    push: false,
  }),
  plugins: [
    ...(blobToken
      ? [
          vercelBlobStorage({
            collections: {
              media: true,
            },
            // Server-side uploads only, avoids browser → Blob direct upload path.
            clientUploads: false,
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
