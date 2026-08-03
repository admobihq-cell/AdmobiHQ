#!/usr/bin/env node
// Broadcasts a push notification to every customer-mobile device announcing an
// app update. Called automatically after `eas update` publishes — see
// apps/customer-mobile/package.json's update:preview / update:production scripts.
// Requires CRON_SECRET (same secret configured in Vercel for the push-receipts
// cron). Falls back to apps/api/.env.local (`npm run env:pull -w api`) so this
// works locally without needing the caller to export it manually.

import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

function argValue(flag, fallback) {
  const i = process.argv.indexOf(flag)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

function readCronSecretFromApiEnv() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  const envPath = resolve(repoRoot, "apps/api/.env.local")
  if (!existsSync(envPath)) return undefined

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed.startsWith("CRON_SECRET=")) continue
    let value = trimmed.slice("CRON_SECRET=".length).trim()
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1)
    }
    return value
  }
  return undefined
}

const API_URL = process.env.NOTIFY_API_URL ?? "https://api.admobihq.com"
const CRON_SECRET = process.env.CRON_SECRET?.trim() || readCronSecretFromApiEnv()
const title = argValue("--title", "New update")
const body = argValue(
  "--body",
  "Admobi has a new update. Update details available in the app.",
)

async function main() {
  if (!CRON_SECRET) {
    console.warn("[notify-app-update] CRON_SECRET not set — skipping notification.")
    return
  }

  const res = await fetch(`${API_URL}/v1/notifications/broadcast`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CRON_SECRET}`,
    },
    body: JSON.stringify({ title, body, category: "system" }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error(`[notify-app-update] Broadcast failed (${res.status}): ${text}`)
    return
  }

  const data = await res.json()
  console.log(`[notify-app-update] Broadcast sent to ${data.target_count} device(s).`)
}

// Best-effort: a failed notification should never fail the OTA publish step
// it runs after, so this always exits 0.
main().catch((error) => {
  console.error("[notify-app-update]", error)
})
