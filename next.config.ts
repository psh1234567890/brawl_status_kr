import type { NextConfig } from "next";

const canonicalHost = "www.brawl-o1.site";
const canonicalUrl = `https://${canonicalHost}`;
const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.NEXT_PUBLIC_BRAWLOOP_STAGING === "1";
const netlifyCommit = process.env.COMMIT_REF ?? "";
const isNetlifyProduction = process.env.NETLIFY === "true" &&
  process.env.NEXT_PUBLIC_BRAWLOOP_STAGING === "0" &&
  process.env.BRAWLOOP_NETLIFY_PRODUCTION === "1";
const configuredAssetOrigin = process.env.BRAWLOOP_ASSET_ORIGIN?.trim();
const assetUrl = configuredAssetOrigin ? new URL(configuredAssetOrigin) : undefined;
if (assetUrl && (assetUrl.protocol !== "https:" || assetUrl.username || assetUrl.password ||
    assetUrl.pathname !== "/" || assetUrl.search || assetUrl.hash)) {
  throw new Error("BRAWLOOP_ASSET_ORIGIN must be an HTTPS origin.");
}
const assetOrigin = assetUrl?.origin;
const assetSource = assetOrigin ? ` ${assetOrigin}` : "";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' data: blob: https://cdn.brawlify.com https://cdn.bsinfox.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com${assetSource}`,
  "connect-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net",
  "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https://pagead2.googlesyndication.com${assetSource}`,
  `style-src 'self' 'unsafe-inline'${assetSource}`,
  `font-src 'self' data:${assetSource}`,
  isProduction ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Netlify supplies COMMIT_REF at build time. Only embed the public Git SHA.
  env: {
    BRAWLOOP_NETLIFY_COMMIT_SHA: /^[a-f0-9]{40}$/.test(netlifyCommit) ? netlifyCommit : "",
    BRAWLOOP_NETLIFY_PRODUCTION: isNetlifyProduction ? "1" : "0",
  },
  assetPrefix: assetOrigin,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: isStaging
          ? [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow" }]
          : securityHeaders,
      },
    ];
  },
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
    // Serve source images directly; do not consume hosting image transformation quotas.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.brawlify.com",
      },
      {
        protocol: "https",
        hostname: "cdn.bsinfox.com",
        pathname: "/hypercharges/*.png",
      },
    ],
  },
};

export default nextConfig;
