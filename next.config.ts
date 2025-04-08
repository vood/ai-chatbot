import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 't0.gstatic.com',
      },
      {
        hostname: 'openrouter.ai',
      },
      {
        hostname: 'localhost',
      },
    ],
  },
};

export default nextConfig;
