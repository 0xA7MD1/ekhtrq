import * as Sentry from "@sentry/nextjs";

import { env, isSentryConfigured } from "@/lib/env";

// Browser-side error tracking. Inert until NEXT_PUBLIC_SENTRY_DSN is set.
if (isSentryConfigured) {
  Sentry.init({
    dsn: env.sentry.dsn,
    tracesSampleRate: 1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    debug: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
