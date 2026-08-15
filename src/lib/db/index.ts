import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env, isDatabaseConfigured } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client over the Supabase Postgres instance.
 *
 * Created lazily so importing this module never opens a connection — the
 * landing page renders without a database.
 */
let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!isDatabaseConfigured) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (!database) {
    // `prepare: false` is required for transaction-pooled connections.
    client = postgres(env.database.url, { prepare: false });
    database = drizzle(client, { schema });
  }

  return database;
}

export { schema };
