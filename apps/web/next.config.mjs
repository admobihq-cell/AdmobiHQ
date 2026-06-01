import { CONTENT_SIGNAL_HEADER } from "./lib/seo/robots-content-signals.js"

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [CONTENT_SIGNAL_HEADER],
      },
    ]
  },
}

export default nextConfig
