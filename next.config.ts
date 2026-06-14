import type { NextConfig } from "next";

const canonicalHost = "www.brawl-o1.site";
const canonicalUrl = `https://${canonicalHost}`;

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "brawl-status-kr.vercel.app",
          },
        ],
        destination: `${canonicalUrl}/:path*`,
        permanent: true,
      },
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "brawl-o1.site",
          },
        ],
        destination: `${canonicalUrl}/:path*`,
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.brawlify.com",
      },
    ],
  },
};

export default nextConfig;
