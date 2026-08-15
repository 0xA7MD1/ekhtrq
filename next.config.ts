import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source maps are only uploaded from CI, where SENTRY_AUTH_TOKEN exists.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Routes browser telemetry around ad blockers.
  tunnelRoute: "/monitoring",
});
