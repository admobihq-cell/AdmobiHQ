import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

import {
  BUILD_PLACEHOLDER_DATABASE_URL,
  resolveDatabaseUrl,
} from "./lib/resolve-database-url.js"

function prismaDatasourceUrl(): string {
  const resolved = resolveDatabaseUrl()
  if (resolved) return resolved

  if (process.argv.includes("generate")) {
    return BUILD_PLACEHOLDER_DATABASE_URL
  }

  return env("DATABASE_URL")
}

const webRoot = import.meta.dirname

for (const path of [resolve(webRoot, ".env.local"), resolve(webRoot, ".env")]) {
  if (existsSync(path)) {
    config({ path, override: false })
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: prismaDatasourceUrl(),
  },
})
