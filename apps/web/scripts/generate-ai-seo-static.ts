import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { buildLlmsTxt, buildPricingMarkdown } from "../lib/seo/static-ai-files"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const publicDir = join(root, "public")

writeFileSync(join(publicDir, "llms.txt"), buildLlmsTxt(), "utf8")
writeFileSync(join(publicDir, "pricing.md"), buildPricingMarkdown(), "utf8")

console.log("Generated public/llms.txt and public/pricing.md")
