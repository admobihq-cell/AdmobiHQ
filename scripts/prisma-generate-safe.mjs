/**
 * Windows-safe Prisma generate for concurrent turbo `dev` (api + ops).
 * Retries on EBUSY when both workspaces copy the same client files.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const schema = path.join(root, "apps/web/prisma/schema.prisma")
const maxAttempts = 6

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  const result = spawnSync(
    "npx",
    ["prisma", "generate", `--schema=${schema}`],
    { cwd: root, stdio: "inherit", shell: true, env: process.env },
  )

  if (result.status === 0) process.exit(0)

  const busy = attempt < maxAttempts
  if (!busy) process.exit(result.status ?? 1)

  const waitMs = 400 * attempt
  console.warn(
    `[prisma-generate] busy/locked (attempt ${attempt}/${maxAttempts}), retrying in ${waitMs}ms…`,
  )
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs)
}
