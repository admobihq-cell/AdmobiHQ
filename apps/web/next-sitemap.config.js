import {
  enhanceRobotsTxt,
} from "./lib/seo/robots-content-signals.js"

const HIGH_PRIORITY_PATHS = new Set([
  "/",
  "/start-campaign",
  "/products-solutions",
  "/partner-fleet",
])

/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: "https://admobihq.com",
  generateRobotsTxt: true,
  exclude: ["/api/*"],
  transform: async (config, path) => {
    const priority = path === "/" ? 1 : HIGH_PRIORITY_PATHS.has(path) ? 0.9 : 0.7
    return {
      loc: path,
      changefreq: "weekly",
      priority,
      lastmod: new Date().toISOString(),
    }
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    transformRobotsTxt: async (_config, robotsTxt) =>
      enhanceRobotsTxt(robotsTxt),
  },
}
