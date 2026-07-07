import {
  enhanceRobotsTxt,
} from "./lib/seo/robots-content-signals.js"
import { fetchBlogSitemapPaths } from "./lib/payload/fetch-blog-sitemap-paths.js"
import { fetchHelpSitemapPaths } from "./lib/payload/fetch-help-sitemap-paths.js"

const LEGAL_PATHS = new Set(["/privacy", "/terms"])

const AI_SEO_STATIC_PATHS = ["/pricing", "/llms.txt", "/pricing.md"]

const siteUrl =
  process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/$/, "") || "https://admobihq.com"

const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false"

/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl,
  generateRobotsTxt: allowIndexing,
  exclude: [
    "/api/*",
    "/opengraph-image",
    "/opengraph-image.png",
    "/logo",
    "/logo.png",
    "/icon",
    "/icon.png",
    "/apple-icon",
    "/apple-icon.png",
    "/twitter-image",
    "/twitter-image.png",
    "/admin",
    "/admin/*",
  ],
  additionalPaths: async () => {
    const now = new Date().toISOString()
    const aiSeoPaths = AI_SEO_STATIC_PATHS.map((path) => ({
      loc: path,
      changefreq: "monthly",
      priority: path === "/pricing" ? 0.8 : 0.6,
      lastmod: now,
    }))
    const [helpPaths, blogPaths] = await Promise.all([
      fetchHelpSitemapPaths(),
      fetchBlogSitemapPaths(),
    ])
    return [...aiSeoPaths, ...helpPaths, ...blogPaths]
  },
  transform: async (config, path) => {
    const priority = LEGAL_PATHS.has(path) ? 0.5 : 0.8
    return {
      loc: path,
      changefreq: "monthly",
      priority,
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
