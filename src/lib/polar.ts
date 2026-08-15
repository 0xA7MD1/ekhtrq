import "server-only";

import { Polar } from "@polar-sh/sdk";

import { env, isPolarConfigured } from "@/lib/env";

/**
 * Server-side Polar client for checkout sessions, subscriptions and webhooks.
 * Nothing calls it yet — pricing on the landing page is static copy.
 */
let polar: Polar | undefined;

export function getPolar() {
  if (!isPolarConfigured) {
    throw new Error("POLAR_ACCESS_TOKEN is not set.");
  }

  polar ??= new Polar({
    accessToken: env.polar.accessToken,
    server: env.polar.server,
  });

  return polar;
}

/** Maps the pricing tiers shown on the landing page to Polar products. */
export const POLAR_PRODUCT_SLUGS = {
  pro: "ekhtrq-pro",
  team: "ekhtrq-team",
} as const;

export type PolarProductSlug =
  (typeof POLAR_PRODUCT_SLUGS)[keyof typeof POLAR_PRODUCT_SLUGS];
