const optional = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_WEB_URL",
  "NEXT_PUBLIC_OPS_URL",
  "NEXT_PUBLIC_API_URL",
] as const

let warned = false

for (const key of optional) {
  if (!process.env[key]?.trim()) {
    console.warn(`[customer-web env:check] Optional not set: ${key}`)
    warned = true
  }
}

if (warned) {
  console.warn("[customer-web env:check] Pull env with: npm run env:pull -w customer-web")
} else {
  console.log("[customer-web env:check] OK")
}
