import { execSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { networkInterfaces } from "node:os"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const opsEnvPath = resolve(mobileRoot, "../ops/.env.local")
const envPath = resolve(mobileRoot, ".env.local")
const infisicalEnv = process.argv[2] ?? "dev"

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=")
        if (index === -1) return null
        const key = line.slice(0, index).trim()
        let value = line.slice(index + 1).trim()
        if (
          (value.startsWith("'") && value.endsWith("'")) ||
          (value.startsWith('"') && value.endsWith('"'))
        ) {
          value = value.slice(1, -1)
        }
        return [key, value]
      })
      .filter(Boolean),
  )
}

function isVirtualAdapterIp(address) {
  return (
    address.startsWith("192.168.56.") ||
    address.startsWith("169.254.") ||
    address.startsWith("172.17.") ||
    address.startsWith("172.18.")
  )
}

function detectLanIp() {
  const candidates = []
  const nets = networkInterfaces()
  for (const entries of Object.values(nets)) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue
      if (isVirtualAdapterIp(entry.address)) continue
      candidates.push(entry.address)
    }
  }

  const preferred = candidates.find((ip) => ip.startsWith("192.168."))
  if (preferred) return preferred

  const fallback = candidates.find((ip) => ip.startsWith("10."))
  return fallback ?? candidates[0] ?? null
}

function rewriteLocalOpsUrl(value) {
  if (!value) return value
  const lanIp = detectLanIp()
  if (!lanIp) return value

  try {
    const url = new URL(value)
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "0.0.0.0"
    ) {
      url.hostname = lanIp
      return url.toString().replace(/\/$/, "")
    }
  } catch {
    return value
  }

  return value
}

function writeMappedEnv(sourceVars, header) {
  const mappings = [
    ["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
    ["EXPO_PUBLIC_OPS_URL", "NEXT_PUBLIC_OPS_URL"],
  ]

  const lines = [header]
  for (const [expoKey, sourceKey] of mappings) {
    let value = sourceVars[expoKey] ?? sourceVars[sourceKey]
    if (expoKey === "EXPO_PUBLIC_OPS_URL") {
      value = rewriteLocalOpsUrl(value)
    }
    if (value?.trim()) {
      lines.push(`${expoKey}=${value.trim()}`)
    }
  }

  writeFileSync(envPath, `${lines.join("\n")}\n`)
}

let sourceVars = {}

try {
  execSync(
    `infisical export --env=${infisicalEnv} --format=dotenv --output-file=.env.local`,
    { cwd: mobileRoot, stdio: "pipe" },
  )
  sourceVars = parseEnv(readFileSync(envPath, "utf8"))
  console.log("[mobile env:pull] Pulled from Infisical")
} catch {
  if (existsSync(opsEnvPath)) {
    sourceVars = parseEnv(readFileSync(opsEnvPath, "utf8"))
    writeMappedEnv(
      sourceVars,
      "# Generated from apps/ops/.env.local — run `npm run env:pull -w ops` to refresh ops first",
    )
    console.log(
      "[mobile env:pull] Infisical unavailable — mapped from apps/ops/.env.local",
    )
  } else {
    console.error("[mobile env:pull] Failed to pull from Infisical.")
    console.error("  Run: infisical login && infisical init")
    console.error("  Or pull ops first: npm run env:pull -w ops")
    process.exit(1)
  }
}

const mappings = [
  ["EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
  ["EXPO_PUBLIC_OPS_URL", "NEXT_PUBLIC_OPS_URL"],
]

let additions = ""
for (const [expoKey, sourceKey] of mappings) {
  if (!sourceVars[expoKey]?.trim() && sourceVars[sourceKey]?.trim()) {
    let value = sourceVars[sourceKey]
    if (expoKey === "EXPO_PUBLIC_OPS_URL") {
      value = rewriteLocalOpsUrl(value)
    }
    additions += `${expoKey}=${value}\n`
  }
}

if (!sourceVars.EXPO_PUBLIC_OPS_URL?.trim() && !additions.includes("EXPO_PUBLIC_OPS_URL")) {
  const lanIp = detectLanIp()
  if (lanIp) {
    additions += `EXPO_PUBLIC_OPS_URL=http://${lanIp}:3001\n`
  }
}

if (additions) {
  const existing = readFileSync(envPath, "utf8").trimEnd()
  writeFileSync(
    envPath,
    `${existing}\n\n# Mapped from Infisical NEXT_PUBLIC_* for Expo\n${additions}`,
  )
  console.log("[mobile env:pull] Mapped NEXT_PUBLIC_* → EXPO_PUBLIC_*")
}
