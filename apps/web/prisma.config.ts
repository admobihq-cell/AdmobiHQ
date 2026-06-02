import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

import { resolveDatabaseUrl } from "./lib/resolve-database-url.js"

/** `prisma generate` does not connect; placeholder satisfies config when no .env in CI. */
const GENERATE_PLACEHOLDER_URL =
  "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public"

function prismaDatasourceUrl(): string {
  const resolved = resolveDatabaseUrl()
  if (resolved) return resolved

  if (process.argv.includes("generate")) {
    return GENERATE_PLACEHOLDER_URL
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
