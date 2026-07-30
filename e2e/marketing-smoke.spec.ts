import { expect, test } from "@playwright/test"

test.describe("marketing public routes", () => {
  test("home page loads with brand hero", async ({ page }) => {
    const response = await page.goto("/")
    expect(response?.ok()).toBeTruthy()

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Taxi-top advertising in Nairobi",
    )
    await expect(page.getByText("Admobi is Kenya", { exact: false })).toBeVisible()
  })

  test("pricing page is reachable", async ({ page }) => {
    const response = await page.goto("/pricing")
    expect(response?.ok()).toBeTruthy()
    await expect(page.locator("body")).toBeVisible()
  })

  test("privacy page is reachable", async ({ page }) => {
    const response = await page.goto("/privacy")
    expect(response?.ok()).toBeTruthy()
    await expect(page.locator("body")).toBeVisible()
  })

  test("terms page is reachable", async ({ page }) => {
    const response = await page.goto("/terms")
    expect(response?.ok()).toBeTruthy()
    await expect(page.locator("body")).toBeVisible()
  })
})
