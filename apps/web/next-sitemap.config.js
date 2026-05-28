import {
  enhanceRobotsTxt,
} from "./lib/seo/robots-content-signals.js"

/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: "https://admobihq.com",
  generateRobotsTxt: true,
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
