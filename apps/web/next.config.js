/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "bull", "redis"]
    }
    return config
  },
}

export default nextConfig
