const appJson = require("./app.json")

/**
 * app.json stays the source of truth for every real build (dev, EAS, OTA
 * updates) — this file only overlays `experiments.baseUrl` when
 * EXPO_WEB_DEMO_BASE_URL is set, which happens exclusively in
 * scripts/export-web-demo.mjs. Without that env var this returns app.json
 * completely unchanged, so native/EAS builds are unaffected.
 */
module.exports = () => {
  const expo = { ...appJson.expo }

  if (process.env.EXPO_WEB_DEMO_BASE_URL) {
    expo.experiments = {
      ...expo.experiments,
      baseUrl: process.env.EXPO_WEB_DEMO_BASE_URL,
    }
  }

  return { expo }
}
