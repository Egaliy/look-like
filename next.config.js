/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['picsum.photos', 'source.unsplash.com', 'i.pinimg.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

// Чтобы API-роуты видели фазу сборки (NEXT_PHASE) при "collect page data" на Vercel
module.exports = (phase, { defaultConfig }) => {
  return {
    ...defaultConfig,
    ...nextConfig,
    env: {
      ...defaultConfig.env,
      ...(nextConfig.env || {}),
      NEXT_PHASE: phase,
    },
  }
}
