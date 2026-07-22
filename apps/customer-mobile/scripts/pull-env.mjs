import { execSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { networkInterfaces } from "node:os"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const webAppEnvPath = resolve(appRoot, "../app/.env.local")
const apiEnvPath = resolve(appRoot, "../api/.env.local")
const envPath = resolve(appRoot, ".env.local")
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

function rewriteLocalApiUrl(value) {
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
    ["EXPO_PUBLIC_API_URL", "NEXT_PUBLIC_API_URL"],
    ["EXPO_PUBLIC_APP_URL", "NEXT_PUBLIC_APP_URL"],
  ]

  const lines = [header]
  for (const [expoKey, sourceKey] of mappings) {
    let value = sourceVars[expoKey] ?? sourceVars[sourceKey]
    if (expoKey === "EXPO_PUBLIC_API_URL" || expoKey === "EXPO_PUBLIC_APP_URL") {
      value = rewriteLocalApiUrl(value)
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
    { cwd: appRoot, stdio: "pipe" },
  )
  sourceVars = parseEnv(readFileSync(envPath, "utf8"))
  console.log("[customer-mobile env:pull] Pulled from Infisical")
} catch {
  const fallbackPath = existsSync(webAppEnvPath) ? webAppEnvPath : apiEnvPath
  if (existsSync(fallbackPath)) {
    sourceVars = parseEnv(readFileSync(fallbackPath, "utf8"))
    writeMappedEnv(
      sourceVars,
      `# Generated from ${fallbackPath} — no Clerk; customer app only`,
    )
    console.log(
      `[customer-mobile env:pull] Infisical unavailable — mapped from ${fallbackPath}`,
    )
  } else {
    writeMappedEnv(
      {
        NEXT_PUBLIC_API_URL: detectLanIp()
          ? `http://${detectLanIp()}:3003`
          : "http://localhost:3003",
        NEXT_PUBLIC_APP_URL: "http://localhost:3002",
      },
      "# Local defaults — run npm run env:pull -w customer-web first when Infisical is available",
    )
    console.log("[customer-mobile env:pull] Wrote local defaults (no Clerk)")
  }
}

const mappings = [
  ["EXPO_PUBLIC_API_URL", "NEXT_PUBLIC_API_URL"],
  ["EXPO_PUBLIC_APP_URL", "NEXT_PUBLIC_APP_URL"],
]

let additions = ""
for (const [expoKey, sourceKey] of mappings) {
  if (!sourceVars[expoKey]?.trim() && sourceVars[sourceKey]?.trim()) {
    let value = sourceVars[sourceKey]
    if (expoKey === "EXPO_PUBLIC_API_URL" || expoKey === "EXPO_PUBLIC_APP_URL") {
      value = rewriteLocalApiUrl(value)
    }
    additions += `${expoKey}=${value}\n`
  }
}

if (
  !sourceVars.EXPO_PUBLIC_API_URL?.trim() &&
  !additions.includes("EXPO_PUBLIC_API_URL")
) {
  const lanIp = detectLanIp()
  if (lanIp) {
    additions += `EXPO_PUBLIC_API_URL=http://${lanIp}:3003\n`
  }
}

if (additions && existsSync(envPath)) {
  const existing = readFileSync(envPath, "utf8").trimEnd()
  writeFileSync(
    envPath,
    `${existing}\n\n# Mapped from NEXT_PUBLIC_* for Expo\n${additions}`,
  )
  console.log("[customer-mobile env:pull] Mapped NEXT_PUBLIC_* → EXPO_PUBLIC_*")
}
