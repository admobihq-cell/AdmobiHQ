import { chromium } from "playwright"

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto("https://bookofshapes.com/patterns/iso_cross", { waitUntil: "networkidle" })
await page.waitForTimeout(1000)

const buttons = await page.$$eval("button, a", (els) =>
  els.map((el) => ({
    tag: el.tagName,
    text: el.textContent?.trim().slice(0, 40),
    aria: el.getAttribute("aria-label"),
    href: el.getAttribute("href"),
  })).filter((e) => e.text || e.aria),
)
console.log(JSON.stringify(buttons, null, 2))

await browser.close()
