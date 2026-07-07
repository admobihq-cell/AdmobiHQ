import { execSync } from "node:child_process"

if (process.env.NEXT_PUBLIC_ALLOW_INDEXING === "false") {
  console.log("[sitemap] Skipped — NEXT_PUBLIC_ALLOW_INDEXING=false (staging)")
  process.exit(0)
}

execSync("next-sitemap", { stdio: "inherit" })
