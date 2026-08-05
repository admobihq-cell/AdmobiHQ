import { chromium } from "playwright"
const outDir = process.argv[2] || "."
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } })
await page.goto("http://localhost:3000/#app-demo", { waitUntil: "networkidle" })
await page.waitForTimeout(500)
const section = page.locator("#app-demo")
await section.scrollIntoViewIfNeeded()
await page.waitForTimeout(500)
await section.screenshot({ path: `${outDir}/homepage-demo-section.png` })
// dark mode check
await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"))
await page.waitForTimeout(300)
await section.screenshot({ path: `${outDir}/homepage-demo-section-dark.png` })
await browser.close()
console.log("done")
