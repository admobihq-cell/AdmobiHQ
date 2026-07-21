const optional = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_WEB_URL",
  "NEXT_PUBLIC_OPS_URL",
  "NEXT_PUBLIC_API_URL",
] as const

let warned = false

for (const key of optional) {
  if (!process.env[key]?.trim()) {
    console.warn(`[app env:check] Optional not set: ${key}`)
    warned = true
  }
}

if (warned) {
  console.warn("[app env:check] Pull env with: npm run env:pull -w app")
} else {
  console.log("[app env:check] OK")
}
