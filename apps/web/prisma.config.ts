import { existsSync } from "node:fs"
import { resolve } from "node:path"

import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

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
    url: env("DATABASE_URL"),
  },
})
