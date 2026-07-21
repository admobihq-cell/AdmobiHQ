/**
 * Regenerates launcher icons (Android mipmaps source assets), splash, and favicons
 * for both Expo mobile apps from assets/brand/.
 *
 * Run: node scripts/sync-mobile-brand-assets.mjs
 */
import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const BRAND_DIR = path.join(ROOT, "assets", "brand")
const LOGO_MARK = path.join(BRAND_DIR, "logo.png")
const LOGO_TYPEMARK = path.join(BRAND_DIR, "logo_typemark.png")
const BRAND_BG = "#FAF9F7"
const SPLASH_BG = "#000000"

const APP_DIRS = [
  path.join(ROOT, "apps", "mobile", "assets", "images"),
  path.join(ROOT, "apps", "app-mobile", "assets", "images"),
]

async function canvas(size, background) {
  if (background === "transparent") {
    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
  }

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background,
    },
  })
}

async function cropLogoToContent(logoPath) {
  const { data, info } = await sharp(logoPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let minX = info.width
  let minY = info.height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const index = (y * info.width + x) * info.channels
      const alpha = data[index + 3]
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]

      if (alpha > 10 && (red > 30 || green > 30 || blue > 30)) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX) {
    return sharp(logoPath).ensureAlpha()
  }

  return sharp(logoPath).extract({
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  })
}

async function compositeLogo(size, { background, logoScale, croppedLogo, tint }) {
  const logoSize = Math.round(size * logoScale)
  let logo = croppedLogo.clone().resize(logoSize, logoSize, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })

  if (tint) {
    logo = logo.flatten({ background: tint }).png()
  }

  const logoBuffer = await logo.toBuffer()
  const base = await canvas(size, background)

  return base.composite([{ input: logoBuffer, gravity: "center" }])
}

async function writeAsset(dir, filename, pipeline) {
  const target = path.join(dir, filename)
  await pipeline.png().toFile(target)
  console.log(`  wrote ${path.relative(ROOT, target)}`)
}

async function syncAppAssets(dir, croppedLogo) {
  console.log(`\n${path.relative(ROOT, dir)}`)

  // Adaptive icons crop the outer ~18%; keep the mark inside the safe zone.
  await writeAsset(dir, "icon.png", await compositeLogo(1024, {
    background: BRAND_BG,
    logoScale: 0.52,
    croppedLogo,
  }))

  await writeAsset(dir, "android-icon-foreground.png", await compositeLogo(1024, {
    background: "transparent",
    logoScale: 0.42,
    croppedLogo,
  }))

  await writeAsset(dir, "android-icon-background.png", await canvas(1024, BRAND_BG))

  await writeAsset(dir, "android-icon-monochrome.png", await compositeLogo(1024, {
    background: "transparent",
    logoScale: 0.42,
    croppedLogo,
    tint: "#3A3834",
  }))

  const splashBuffer = await sharp(LOGO_TYPEMARK)
    .resize(1200, 1200, { fit: "inside", background: SPLASH_BG })
    .extend({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: SPLASH_BG,
    })
    .toBuffer()

  await sharp(splashBuffer).png().toFile(path.join(dir, "splash-icon.png"))
  console.log(`  wrote ${path.relative(ROOT, path.join(dir, "splash-icon.png"))}`)

  const favicon = await compositeLogo(48, {
    background: BRAND_BG,
    logoScale: 0.78,
    croppedLogo,
  })
  await writeAsset(dir, "favicon.png", favicon)
}

async function main() {
  for (const file of [LOGO_MARK, LOGO_TYPEMARK]) {
    await fs.access(file)
  }

  const croppedLogo = await cropLogoToContent(LOGO_MARK)

  for (const dir of APP_DIRS) {
    await fs.mkdir(dir, { recursive: true })
    await syncAppAssets(dir, croppedLogo)
  }

  console.log("\nDone. Rebuild native apps so Android mipmaps pick up the new icons:")
  console.log("  npm run prebuild:android -w mobile")
  console.log("  npm run prebuild:android -w app-mobile")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
