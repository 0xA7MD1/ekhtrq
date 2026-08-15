"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PostHogClientProvider } from "posthog-js/react";

import { env, isPostHogConfigured } from "@/lib/env";

/**
 * Initialises PostHog once, on the client, and only when a key is present.
 *
 * No events are captured by hand yet — autocapture and pageviews are off
 * until the product surfaces exist and we know what's worth measuring.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!isPostHogConfigured || posthog.__loaded) return;

    posthog.init(env.posthog.key, {
      api_host: env.posthog.host,
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      person_profiles: "identified_only",
    });
  }, []);

  if (!isPostHogConfigured) return children;

  return <PostHogClientProvider client={posthog}>{children}</PostHogClientProvider>;
}
