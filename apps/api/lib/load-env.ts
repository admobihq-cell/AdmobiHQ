import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { config } from "dotenv"

import { resolveDatabaseUrl } from "@/lib/resolve-database-url"

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const webRoot = resolve(apiRoot, "../web")

for (const path of [
  resolve(apiRoot, ".env.local"),
  resolve(apiRoot, ".env"),
  resolve(webRoot, ".env.local"),
  resolve(webRoot, ".env"),
]) {
  if (existsSync(path)) {
    config({ path, override: false })
  }
}

const url = resolveDatabaseUrl()
if (url && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = url
}
