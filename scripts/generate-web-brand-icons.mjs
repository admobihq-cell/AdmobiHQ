/**
 * Writes static favicon / apple-icon / logo / OG PNGs so Vercel does not
 * run ImageResponse (Satori) on every crawler or browser hit.
 *
 * Run: node scripts/generate-web-brand-icons.mjs
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const LOGO_MARK = path.join(ROOT, "apps", "web", "public", "brand", "logo-mark.png")
const BRAND_CREAM = { r: 250, g: 249, b: 247 }
const BRAND_OG_DARK = { r: 26, g: 24, b: 22 }
const MARK_ASPECT = 47 / 85

const APP_DIRS = [
  path.join(ROOT, "apps", "web", "app"),
  path.join(ROOT, "apps", "api", "app"),
  path.join(ROOT, "apps", "ops", "app"),
  path.join(ROOT, "apps", "customer-web", "app"),
  path.join(ROOT, "apps", "driver-web", "app"),
]

async function roundedTile(size, padding, radius) {
  const markWidth = size - padding * 2
  const markHeight = Math.round(markWidth * MARK_ASPECT)
  const mark = await sharp(LOGO_MARK).resize(markWidth, markHeight).png().toBuffer()
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" rx="${radius}" fill="rgb(${BRAND_CREAM.r},${BRAND_CREAM.g},${BRAND_CREAM.b})"/>
    </svg>`,
  )

  return sharp(svg)
    .composite([{ input: mark, gravity: "center" }])
    .png()
}

async function writePng(filePath, pipeline) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await pipeline.toFile(filePath)
  console.log(`  wrote ${path.relative(ROOT, filePath)}`)
}

async function generateOpenGraph() {
  const tile = await (await roundedTile(280, 62, 35)).toBuffer()
  const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="760" height="630">
    <text x="0" y="120" fill="#FAF9F7" fill-opacity="0.65" font-size="26" font-family="Arial, Helvetica, sans-serif" letter-spacing="5.2">NAIROBI · KENYA</text>
    <text x="0" y="220" fill="#FAF9F7" font-size="68" font-weight="600" font-family="Arial, Helvetica, sans-serif">Admobi</text>
    <text x="0" y="290" fill="#FAF9F7" fill-opacity="0.88" font-size="32" font-family="Arial, Helvetica, sans-serif">Digital taxi-top OOH that</text>
    <text x="0" y="338" fill="#FAF9F7" fill-opacity="0.88" font-size="32" font-family="Arial, Helvetica, sans-serif">moves with the city</text>
  </svg>`)

  return sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: BRAND_OG_DARK,
    },
  }).composite([
    { input: text, top: 0, left: 64 },
    { input: tile, top: 175, left: 840 },
  ])
}

async function main() {
  await fs.access(LOGO_MARK)

  const icon = await roundedTile(32, 4, 7)
  const apple = await roundedTile(180, 40, 40)
  const logo = await roundedTile(512, 112, 112)
  const iconBuffer = await icon.toBuffer()
  const appleBuffer = await apple.toBuffer()
  const logoBuffer = await logo.toBuffer()

  for (const dir of APP_DIRS) {
    console.log(`\n${path.relative(ROOT, dir)}`)
    await writePng(path.join(dir, "icon.png"), sharp(iconBuffer))
    await writePng(path.join(dir, "apple-icon.png"), sharp(appleBuffer))
  }

  console.log(`\n${path.relative(ROOT, path.join(ROOT, "apps", "web"))}`)
  await writePng(path.join(ROOT, "apps", "web", "app", "opengraph-image.png"), await generateOpenGraph())
  await writePng(path.join(ROOT, "apps", "web", "public", "logo.png"), sharp(logoBuffer))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
