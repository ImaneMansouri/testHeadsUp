import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**": ["./data/**/*.json"],
  },
  // Dev startup otherwise writes AGENTS.md and CLAUDE.md into the repo.
  agentRules: false,
};

export default nextConfig;
