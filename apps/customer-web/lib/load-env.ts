import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { config } from "dotenv"

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const webRoot = resolve(appRoot, "../web")

for (const path of [
  resolve(appRoot, ".env.local"),
  resolve(appRoot, ".env"),
  resolve(webRoot, ".env.local"),
  resolve(webRoot, ".env"),
]) {
  if (existsSync(path)) {
    config({ path, override: false })
  }
}
