import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5001',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/member/network/requests',
        destination: '/dashboard/messages?tab=pending',
        permanent: false,
      },
      {
        source: '/member/subscription',
        destination: '/dashboard/settings',
        permanent: false,
      },
      {
        source: '/member/volunteering',
        destination: '/dashboard/volunteers',
        permanent: false,
      },
      {
        source: '/member/network',
        destination: '/dashboard/network',
        permanent: false,
      },
      {
        source: '/member/network/:path*',
        destination: '/dashboard/network',
        permanent: false,
      },
      {
        source: '/dashboard/network/requests',
        destination: '/dashboard/messages?tab=pending',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
