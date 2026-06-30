import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
