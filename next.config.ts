import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Block third-party framing of the real site, but let /embed/* widgets be
  // embedded anywhere (that is the point of them). The negative-lookahead source
  // keeps the two rules from both matching /embed/* and sending conflicting CSP.
  async headers() {
    return [
      {
        source: '/((?!embed).*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        ],
      },
      {
        source: '/embed/:path*',
        headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
      },
    ];
  },
  // The former /analysis/* pages now live as forum articles under /articles/<slug>.
  async redirects() {
    return [
      {
        // Salary vs. Points was dropped from the published feed; send its old URL to the index.
        source: "/analysis/salary-vs-points",
        destination: "/articles",
        permanent: true,
      },
      {
        source: "/analysis/growth-of-nba",
        destination: "/articles/growth-of-nba",
        permanent: true,
      },
      {
        source: "/analysis/draft-points",
        destination: "/articles/draft-points",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
