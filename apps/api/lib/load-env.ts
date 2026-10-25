import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { config } from "dotenv"

import { resolveDatabaseUrl } from "@/lib/resolve-database-url"

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

// Local dev only (Vercel injects env vars). Joined inside the loop on purpose: a standalone
// `resolve(apiRoot, "../web")` reads to the build's file tracer as "uses the web app
// directory", which shipped all of apps/web with every DB route and broke a deploy once a
// web asset was deleted.
for (const file of [".env.local", ".env", "../web/.env.local", "../web/.env"]) {
  const path = resolve(apiRoot, file)
  if (existsSync(path)) {
    config({ path, override: false })
  }
}

const url = resolveDatabaseUrl()
if (url && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = url
}
