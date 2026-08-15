/**
 * Central place to read environment configuration.
 *
 * Nothing here throws: the landing page ships before any backend exists, so
 * every integration reports whether it is configured and callers decide what
 * to do about it. Tighten these into hard requirements once the app routes
 * (auth, cases, billing) come online.
 */

// `process.env.X` must be referenced statically for Next.js to inline the
// NEXT_PUBLIC_ values into the client bundle — don't refactor into a loop.
export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  // Auth is Clerk, not Supabase. Supabase is only the Postgres host and
  // (later) file storage — see `database` below.
  clerk: {
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
    secretKey: process.env.CLERK_SECRET_KEY ?? "",
  },

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },

  database: {
    url: process.env.DATABASE_URL ?? "",
  },

  polar: {
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
    server: (process.env.POLAR_SERVER === "production"
      ? "production"
      : "sandbox") as "production" | "sandbox",
    organizationId: process.env.NEXT_PUBLIC_POLAR_ORGANIZATION_ID ?? "",
  },

  posthog: {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
  },

  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
  },
} as const;

export const isClerkConfigured = Boolean(env.clerk.publishableKey);
export const isSupabaseConfigured = Boolean(
  env.supabase.url && env.supabase.anonKey,
);
export const isDatabaseConfigured = Boolean(env.database.url);
export const isPolarConfigured = Boolean(env.polar.accessToken);
export const isPostHogConfigured = Boolean(env.posthog.key);
export const isSentryConfigured = Boolean(env.sentry.dsn);
