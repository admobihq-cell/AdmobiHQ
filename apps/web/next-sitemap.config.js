import {
  enhanceRobotsTxt,
} from "./lib/seo/robots-content-signals.js"

const LEGAL_PATHS = new Set(["/privacy", "/terms"])

/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: "https://admobihq.com",
  generateRobotsTxt: true,
  exclude: ["/api/*", "/opengraph-image"],
  transform: async (config, path) => {
    const priority = LEGAL_PATHS.has(path) ? 0.5 : 0.8
    return {
      loc: path,
      changefreq: "monthly",
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
