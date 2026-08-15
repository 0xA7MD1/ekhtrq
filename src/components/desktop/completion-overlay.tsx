"use client";

import Link from "next/link";
import { Check, Clock, Lightbulb, Target } from "lucide-react";

import type { LabManifest } from "@/lib/labs/schema";
import { totalHintsUsed, type SimSession } from "@/lib/sim/session";

/**
 * The close-out.
 *
 * Reports what the player did rather than scoring them — time on target and
 * hints opened, stated plainly. The teaser is the hook into the next case;
 * an operation that ends with nothing following it ends the platform too.
 */
export function CompletionOverlay({
  manifest,
  session,
  onReplay,
  onDismiss,
}: {
  manifest: LabManifest;
  session: SimSession;
  onReplay: () => void;
  onDismiss: () => void;
}) {
  // The overlay only mounts once the case is complete, so `completedAt` is
  // set; falling back to `startedAt` (elapsed 0) keeps render pure rather than
  // reaching for `Date.now()`.
  const elapsedMs =
    new Date(session.completedAt ?? session.startedAt).getTime() -
    new Date(session.startedAt).getTime();
  const minutes = Math.max(1, Math.round(elapsedMs / 60_000));
  const hints = totalHintsUsed(session);

  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-[var(--bg-base)]/95 p-6 backdrop-blur-sm">
      <article className="w-full max-w-lg rounded-lg border border-[var(--accent-border)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-2.5 border-b border-[var(--border-strong)] px-5 py-3">
          <span className="grid size-6 place-items-center rounded-full bg-[var(--accent)]">
            <Check
              className="size-4 text-[var(--accent-foreground)]"
              strokeWidth={3}
              aria-hidden="true"
            />
          </span>
          <span className="mono-label text-[9.5px]">OPERATION CLOSED</span>
        </div>

        <div className="px-5 py-5">
          <p
            dir="auto"
            className="text-[16px] leading-[2] font-bold text-[var(--text-primary)]"
          >
            {manifest.completion.message}
          </p>

          <dl className="mt-4 grid grid-cols-3 gap-2">
            {[
              {
                icon: Target,
                label: "الأهداف",
                value: `${manifest.objectives.length}/${manifest.objectives.length}`,
              },
              { icon: Clock, label: "الوقت", value: `${minutes} د` },
              { icon: Lightbulb, label: "التلميحات", value: String(hints) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-2.5 text-center"
              >
                <stat.icon
                  className="mx-auto size-4 text-[var(--text-muted)]"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <dd
                  dir="ltr"
                  className="mt-1.5 font-mono text-[14px] font-bold text-[var(--text-primary)]"
                >
                  {stat.value}
                </dd>
                <dt className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>

          {manifest.completion.teaser ? (
            <blockquote
              dir="auto"
              className="mt-4 border-s-2 border-[var(--diff-hard)] bg-[var(--bg-elevated)] px-3.5 py-3 text-[13px] leading-[2] text-[var(--text-secondary)]"
            >
              {manifest.completion.teaser}
            </blockquote>
          ) : null}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/"
              className="flex-1 rounded-lg bg-[var(--paper)] px-4 py-2.5 text-center text-[13.5px] font-bold text-[var(--paper-foreground)] transition-colors hover:bg-[var(--paper-hover)]"
            >
              العودة إلى القضايا
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2.5 text-[13.5px] font-bold text-[var(--text-primary)] transition-colors hover:border-[var(--accent)]"
            >
              ابقَ في البيئة
            </button>
            <button
              type="button"
              onClick={onReplay}
              className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2.5 text-[13.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--diff-hard)] hover:text-[var(--text-primary)]"
            >
              إعادة
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
