"use client";

import { Clock, SignalHigh, Target } from "lucide-react";

import type { LabManifest } from "@/lib/labs/schema";

const DIFFICULTY_LABEL: Record<LabManifest["difficulty"], string> = {
  easy: "تمهيدي",
  medium: "متوسط",
  hard: "متقدّم",
};

const DIFFICULTY_TONE: Record<LabManifest["difficulty"], string> = {
  easy: "var(--diff-easy)",
  medium: "var(--diff-medium)",
  hard: "var(--diff-hard)",
};

/**
 * The cold open.
 *
 * A case starts with a reason, not a task list — the player reads what
 * happened before they ever see a terminal. Rendered as the clipping that
 * landed on the desk, which is also why the type here is editorial rather
 * than UI.
 */
export function IntroOverlay({
  manifest,
  onStart,
}: {
  manifest: LabManifest;
  onStart: () => void;
}) {
  const { intro } = manifest;

  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-[var(--bg-base)]/95 p-6 backdrop-blur-sm">
      <article className="w-full max-w-xl rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-strong)] px-5 py-3">
          <span className="mono-label text-[9.5px]">
            {intro.source ?? "INCOMING"}
          </span>
          <span className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold"
              style={{
                color: DIFFICULTY_TONE[manifest.difficulty],
                borderColor: DIFFICULTY_TONE[manifest.difficulty],
              }}
            >
              <SignalHigh className="size-3" strokeWidth={2} aria-hidden="true" />
              {DIFFICULTY_LABEL[manifest.difficulty]}
            </span>
            <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--text-muted)]">
              <Clock className="size-3.5" strokeWidth={1.5} aria-hidden="true" />≈{" "}
              {manifest.estimatedMinutes} دقيقة
            </span>
          </span>
        </div>

        <div className="px-5 py-5">
          {/* Authored prose carries names, URLs and group handles in Latin;
              `auto` keeps each block reading in the direction it was written
              instead of inheriting one and reordering its punctuation. */}
          <h1
            dir="auto"
            className="text-2xl leading-[1.5] font-bold text-[var(--text-primary)]"
          >
            {intro.headline}
          </h1>

          <p
            dir="auto"
            className="mt-3 text-[14px] leading-[2.1] whitespace-pre-line text-[var(--text-secondary)]"
          >
            {intro.body}
          </p>

          <div className="mt-5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3.5">
            <p className="flex items-center gap-2">
              <Target
                className="size-4 text-[var(--diff-hard)]"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="mono-label text-[9.5px]">MISSION</span>
            </p>
            <p
              dir="auto"
              className="mt-2 text-[14px] leading-[2] font-semibold text-[var(--text-primary)]"
            >
              {intro.mission}
            </p>
          </div>

          {manifest.skills.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {manifest.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                >
                  {skill}
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={onStart}
            className="mt-5 w-full rounded-lg bg-[var(--paper)] px-4 py-3 text-[14px] font-bold text-[var(--paper-foreground)] transition-colors hover:bg-[var(--paper-hover)]"
          >
            ابدأ العملية
          </button>

          <p className="mt-3 text-center text-[11.5px] leading-[1.9] text-[var(--text-muted)]">
            كل شيء داخل هذه البيئة محاكاة. لا شبكة حقيقية ولا هدف حقيقي.
          </p>
        </div>
      </article>
    </div>
  );
}
