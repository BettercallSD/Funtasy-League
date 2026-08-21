import type { NextConfig } from "next";

// CLAUDE.md: "Set standard security headers (CSP, X-Frame-Options,
// X-Content-Type-Options) in next.config or middleware." Content-Security-Policy
// is set in middleware.ts instead of here — it needs a per-request nonce so
// Next's own RSC hydration scripts aren't blocked (a static CSP without a
// nonce broke the app; see middleware.ts for details).
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Only meaningful over HTTPS (Vercel prod) — harmless as a no-op in local http dev.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
