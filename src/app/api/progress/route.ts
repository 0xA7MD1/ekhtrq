import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { getDb, schema } from "@/lib/db";
import { isClerkConfigured, isDatabaseConfigured } from "@/lib/env";
import type { SimSession } from "@/lib/sim/session";

/**
 * The progress mirror.
 *
 * Thin by design. `localStorage` is the source of truth while a case is being
 * played; this route only lets progress follow a signed-in player to another
 * device. It does no simulation and holds no game logic — it reads and writes
 * one opaque session blob per (user, case).
 *
 * Every dependency is optional. With no auth or no database configured — the
 * default until those are wired — the route reports "no mirror" and the client
 * carries on entirely offline. That's why guests never see an error.
 */

export const runtime = "nodejs";

/** Clerk's `auth()` throws without middleware; a guest is not an error here. */
async function currentUserId(): Promise<string | null> {
  if (!isClerkConfigured) return null;
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

/** 401 signals the client to stop trying and stay on localStorage. */
function noMirror() {
  return new Response(null, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured) return noMirror();

  const userId = await currentUserId();
  if (!userId) return noMirror();

  const labId = request.nextUrl.searchParams.get("labId");
  if (!labId) {
    return Response.json({ error: "labId is required" }, { status: 400 });
  }

  try {
    const rows = await getDb()
      .select()
      .from(schema.labProgress)
      .where(
        and(
          eq(schema.labProgress.userId, userId),
          eq(schema.labProgress.labId, labId),
        ),
      )
      .limit(1);

    const row = rows[0];
    // 204: authenticated, but nothing saved for this case yet.
    if (!row) return new Response(null, { status: 204 });

    return Response.json({ session: row.session });
  } catch {
    return noMirror();
  }
}

/** Minimal shape guard — this is our own client's payload, not public input. */
function isSession(value: unknown): value is SimSession {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.labId === "string" &&
    typeof candidate.hostKey === "string" &&
    Array.isArray(candidate.flags)
  );
}

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured) return noMirror();

  const userId = await currentUserId();
  if (!userId) return noMirror();

  let body: { labId?: unknown; session?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (typeof body.labId !== "string" || !isSession(body.session)) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  // The client can mislabel neither field: the row is keyed by the URL's case
  // and the signed-in user, and the stored session must agree.
  if (body.session.labId !== body.labId) {
    return Response.json({ error: "labId mismatch" }, { status: 400 });
  }

  try {
    await getDb()
      .insert(schema.labProgress)
      .values({ userId, labId: body.labId, session: body.session })
      .onConflictDoUpdate({
        target: [schema.labProgress.userId, schema.labProgress.labId],
        set: { session: body.session, updatedAt: new Date() },
      });

    return new Response(null, { status: 204 });
  } catch {
    return noMirror();
  }
}
