import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { config } from "dotenv"

import { resolveDatabaseUrl } from "@/lib/resolve-database-url"

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

for (const path of [
  resolve(webRoot, ".env.local"),
  resolve(webRoot, ".env"),
  resolve(webRoot, "../../.env.local"),
  resolve(webRoot, "../../.env"),
]) {
  if (existsSync(path)) {
    config({ path, override: false })
  }
}

// Normalize so Prisma and Payload both see DATABASE_URL
const url = resolveDatabaseUrl()
if (url && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = url
}
