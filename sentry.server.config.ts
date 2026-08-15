import * as Sentry from "@sentry/nextjs";

import { env, isSentryConfigured } from "@/lib/env";

// No DSN yet — skip init entirely so nothing is buffered or sent.
if (isSentryConfigured) {
  Sentry.init({
    dsn: env.sentry.dsn,
    tracesSampleRate: 1,
    enableLogs: true,
    debug: false,
  });
}
