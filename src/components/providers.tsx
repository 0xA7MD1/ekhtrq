"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { QueryClientProvider } from "@tanstack/react-query";

import { PostHogProvider } from "@/lib/analytics/posthog-provider";
import { getQueryClient } from "@/lib/query/query-client";
import { isClerkConfigured } from "@/lib/env";

/**
 * Client providers for the whole app. Rendered around `children` in the root
 * layout so the static parts of the tree stay Server Components.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const tree = (
    <QueryClientProvider client={queryClient}>
      <PostHogProvider>{children}</PostHogProvider>
    </QueryClientProvider>
  );

  // No auth is built yet, and ClerkProvider throws without a publishable key,
  // so it only mounts once one is configured.
  if (!isClerkConfigured) return tree;

  // When auth UI lands, add `@clerk/localizations` and pass `localization={arSA}`
  // so Clerk's own screens render in Arabic too.
  return <ClerkProvider afterSignOutUrl="/">{tree}</ClerkProvider>;
}
