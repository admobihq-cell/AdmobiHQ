// Exports the web build under the /app-demo base path (see app.config.js) so
// the compiled bundle's asset URLs resolve correctly once copied into
// apps/web/public/app-demo for the embedded marketing-site iframe demo.
import { spawnSync } from "node:child_process"
import { cpSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, "..")
const outputDir = path.join(appRoot, "dist-web-demo")
const publicDir = path.resolve(appRoot, "../web/public/app-demo")

/** iPhone 14 Pro logical screen width — matches .device-screen in the phone frame. */
const DEMO_LAYOUT_WIDTH = 390
const DEMO_VIEWPORT = `width=${DEMO_LAYOUT_WIDTH}, initial-scale=1, shrink-to-fit=no`

const result = spawnSync("npx", ["expo", "export", "--platform", "web", "--output-dir", "dist-web-demo"], {
  cwd: appRoot,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, EXPO_WEB_DEMO_BASE_URL: "/app-demo" },
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

function findIoniconsFont(relativeDir) {
  const absoluteDir = path.join(outputDir, relativeDir)
  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const nextRelative = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) {
      const found = findIoniconsFont(nextRelative)
      if (found) return found
      continue
    }
    if (entry.isFile() && entry.name.startsWith("Ionicons.") && entry.name.endsWith(".ttf")) {
      return nextRelative.replaceAll("\\", "/")
    }
  }
  return null
}

function patchIndexHtml(html, ioniconsFont) {
  let patched = html.replace(
    /content="width=device-width[^"]*"/,
    `content="${DEMO_VIEWPORT}"`,
  )

  const headInjections = []

  if (ioniconsFont) {
    headInjections.push(
      `  <link rel="preload" href="/app-demo/${ioniconsFont}" as="font" type="font/ttf" crossorigin />`,
      `  <style id="demo-ionicons">
    @font-face {
      font-family: ionicons;
      src: url("/app-demo/${ioniconsFont}") format("truetype");
      font-display: block;
    }
  </style>`,
    )
  }

  if (headInjections.length > 0 && !patched.includes('id="demo-ionicons"')) {
    patched = patched.replace("</head>", `${headInjections.join("\n")}\n</head>`)
  }

  return patched
}

const ioniconsFont = findIoniconsFont("assets")
const indexPath = path.join(outputDir, "index.html")
const indexHtml = patchIndexHtml(readFileSync(indexPath, "utf8"), ioniconsFont)
writeFileSync(indexPath, indexHtml)

rmSync(publicDir, { recursive: true, force: true })
cpSync(outputDir, publicDir, { recursive: true })

console.log(`Copied web demo export to ${publicDir}`)
