import path from "node:path"
import { fileURLToPath } from "node:url"

const appDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(appDir, "../..")

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  // Monorepo: stop Turbopack from using C:\Users\victo\ as the workspace root
  turbopack: {
    root: repoRoot,
  },
}

export default nextConfig
