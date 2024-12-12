import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/elevenlabs/:path*',
        destination: 'https://api.elevenlabs.io/v1/:path*'
      }
    ]
  }
};

export default nextConfig;