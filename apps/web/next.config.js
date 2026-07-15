/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@prisma/engines/**',
      'node_modules/.prisma/client/**',
      'node_modules/@payloadcms/**/dist/admin/**',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "bull", "redis"]
    }
    return config
  },
}
export default nextConfig
