/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Handle pdfjs-dist for client-side only
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      }
    }
    return config
  },
  // Add empty turbopack config to silence warning
  // The webpack config above will still work when using --webpack flag
  turbopack: {},
}

export default nextConfig
