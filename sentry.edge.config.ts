import * as Sentry from "@sentry/nextjs";

import { env, isSentryConfigured } from "@/lib/env";

if (isSentryConfigured) {
  Sentry.init({
    dsn: env.sentry.dsn,
    tracesSampleRate: 1,
    debug: false,
  });
}
