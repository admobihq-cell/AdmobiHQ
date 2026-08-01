import { chromium } from "playwright"

const OUT = "C:/Users/victo/AppData/Local/Temp/claude/c--Users-victo-Documents-GitHub-AdmobiHQ/beb6187e-6ccd-477e-b3af-5e81b48f410b/scratchpad"

const browser = await chromium.launch()

for (const [width, dpr, label] of [
  [1280, 1, "w1280-dpr1"],
  [1440, 1, "w1440-dpr1"],
  [800, 1, "w800-dpr1"],
  [1280, 2, "w1280-dpr2"],
]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: dpr })
  await page.goto("http://localhost:3000", { waitUntil: "load", timeout: 60000 })
  const art = page.locator("main svg[aria-labelledby='route-signal-title route-signal-desc']")
  await art.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1000)
  await art.screenshot({ path: `${OUT}/window-${label}.png` })
  await page.close()
}

await browser.close()
