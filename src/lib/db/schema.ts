import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { SimSession } from "@/lib/sim/session";

/**
 * Placeholder schema so Drizzle has something to generate against. The real
 * case/progress model lands with the app itself — treat this as a sketch.
 */

export const difficultyEnum = pgEnum("difficulty", [
  "recruit",
  "operator",
  "specialist",
  "ghost",
]);

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  hook: text("hook").notNull(),
  difficulty: difficultyEnum("difficulty").notNull().default("recruit"),
  estimatedMinutes: integer("estimated_minutes").notNull().default(60),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Case = typeof cases.$inferSelect;
export type NewCase = typeof cases.$inferInsert;

/**
 * Per-player progress through a case.
 *
 * Deliberately thin: one row per (player, case) holding the whole simulator
 * session as JSON. The engine already treats the session as an opaque,
 * serialisable blob, so there's no value in shredding it into columns the app
 * would only have to reassemble. `localStorage` is the source of truth during
 * play; this row exists so progress follows the player to a new device.
 *
 * `userId` is the Clerk user id (a string, not a uuid), so auth stays the
 * only owner of identity.
 */
export const labProgress = pgTable(
  "lab_progress",
  {
    userId: text("user_id").notNull(),
    labId: text("lab_id").notNull(),
    session: jsonb("session").$type<SimSession>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.labId] })],
);

export type LabProgress = typeof labProgress.$inferSelect;
export type NewLabProgress = typeof labProgress.$inferInsert;
