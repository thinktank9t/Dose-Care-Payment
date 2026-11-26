import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Our metadata is instant, so render it blocking in <head> for every UA
  // instead of streaming it into <body> (which Lighthouse/SEO tools miss).
  htmlLimitedBots: /.*/,
  // Softens locale remounts (EN ↔ BN) via the View Transitions API.
  experimental: {
    viewTransition: true,
    // Every page is dynamic (theme/session cookies), so by default the client
    // router refetches a page on each visit, even one it already holds. The
    // app tabs render from local state, so reuse a visited page for 5 minutes,
    // matching how long prefetched pages are kept. Server actions that change
    // payments call revalidatePath, which clears this cache.
    staleTimes: {
      dynamic: 300,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
