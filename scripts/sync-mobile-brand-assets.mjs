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

async function compositeLogo(size, { background, logoScale, logoPath, tint }) {
  const logoSize = Math.round(size * logoScale)
  let logo = sharp(logoPath).resize(logoSize, logoSize, {
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

async function syncAppAssets(dir) {
  console.log(`\n${path.relative(ROOT, dir)}`)

  await writeAsset(dir, "icon.png", await compositeLogo(1024, {
    background: BRAND_BG,
    logoScale: 0.52,
    logoPath: LOGO_MARK,
  }))

  await writeAsset(dir, "android-icon-foreground.png", await compositeLogo(1024, {
    background: "transparent",
    logoScale: 0.42,
    logoPath: LOGO_MARK,
  }))

  await writeAsset(dir, "android-icon-background.png", await canvas(1024, BRAND_BG))

  await writeAsset(dir, "android-icon-monochrome.png", await compositeLogo(1024, {
    background: "transparent",
    logoScale: 0.42,
    logoPath: LOGO_MARK,
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
    logoScale: 0.62,
    logoPath: LOGO_MARK,
  })
  await writeAsset(dir, "favicon.png", favicon)
}

async function main() {
  for (const file of [LOGO_MARK, LOGO_TYPEMARK]) {
    await fs.access(file)
  }

  for (const dir of APP_DIRS) {
    await fs.mkdir(dir, { recursive: true })
    await syncAppAssets(dir)
  }

  console.log("\nDone. Rebuild native apps so Android mipmaps pick up the new icons:")
  console.log("  npm run prebuild:android -w mobile")
  console.log("  npm run prebuild:android -w app-mobile")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
