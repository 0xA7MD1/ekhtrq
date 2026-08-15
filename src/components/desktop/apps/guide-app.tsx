"use client";

import { useState } from "react";
import { Check, Eye, Lightbulb, Lock, Sparkles } from "lucide-react";

import type { GuideBlock, LabManifest } from "@/lib/labs/schema";
import { activeObjective, objectiveStates } from "@/lib/sim/session";
import { useLabStore } from "@/store/use-lab-store";
import { cn } from "@/lib/utils";
import { CodeBlock, Prose } from "../prose";

/**
 * The three-layer guide.
 *
 * The cases are meant to be hard, which only works if being stuck is never
 * terminal. Layers open one at a time — a nudge, then a direct hint, then the
 * full step with an explanation of the concept behind it, because a solution
 * you don't understand teaches nothing.
 *
 * Usage is recorded but never penalised. Counting hints against a player just
 * teaches them to suffer quietly.
 */

const LAYERS = [
  {
    key: "nudge" as const,
    label: "توجيه عام",
    action: "أعطني توجيهًا",
    icon: Eye,
    tone: "var(--text-secondary)",
  },
  {
    key: "hint" as const,
    label: "تلميح مباشر",
    action: "أعطني تلميحًا مباشرًا",
    icon: Lightbulb,
    tone: "var(--gold)",
  },
  {
    key: "solution" as const,
    label: "الخطوة كاملة",
    action: "اكشف الحل",
    icon: Sparkles,
    tone: "var(--accent)",
  },
];

/**
 * One layer of guidance: the sentence, then the commands, then what to expect.
 * Prose and commands are separate fields in the manifest precisely so they can
 * be rendered in the direction and the typeface each one needs.
 */
function Block({ block, className }: { block: GuideBlock; className?: string }) {
  return (
    <div className={className}>
      <Prose>{block.text}</Prose>
      <CodeBlock lines={block.code} />
      {block.note ? (
        <Prose muted className="mt-1.5 text-[11.5px]">
          {block.note}
        </Prose>
      ) : null}
    </div>
  );
}

export function GuideApp({ manifest }: { manifest: LabManifest }) {
  const session = useLabStore((store) => store.session);
  const revealHint = useLabStore((store) => store.revealHint);
  const [picked, setPicked] = useState<string | null>(null);

  if (!session) return null;

  const states = objectiveStates(manifest, session);
  const current = activeObjective(manifest, session);
  const selectedId = picked ?? current?.id ?? states[0]?.id;
  const selected = states.find((state) => state.id === selectedId);
  const entry = selectedId ? manifest.guide[selectedId] : undefined;
  const revealed = selectedId ? (session.hintsUsed[selectedId] ?? 0) : 0;

  return (
    <div className="flex h-full flex-col bg-[var(--bg-base)]">
      <ol className="shrink-0 border-b border-[var(--border-strong)] bg-[var(--bg-surface)] p-1.5">
        {states.map((state, index) => (
          <li key={state.id}>
            <button
              type="button"
              onClick={() => setPicked(state.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-start transition-colors",
                state.id === selectedId
                  ? "border-[var(--border-strong)] bg-[var(--bg-elevated)]"
                  : "border-transparent hover:bg-[var(--bg-elevated)]",
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded border text-[10px] font-bold",
                  state.complete
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : state.active
                      ? "border-[var(--gold)] text-[var(--gold)]"
                      : "border-[var(--border-strong)] text-[var(--text-muted)]",
                )}
              >
                {state.complete ? (
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>

              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[12.5px]",
                  state.complete
                    ? "text-[var(--text-muted)] line-through"
                    : state.active
                      ? "font-semibold text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]",
                )}
              >
                {state.title}
              </span>

              {(session.hintsUsed[state.id] ?? 0) > 0 ? (
                <span className="mono-label shrink-0 text-[9px]">
                  {session.hintsUsed[state.id]}/3
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ol>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!entry ? (
          <p className="text-[12.5px] text-[var(--text-muted)]">
            لا يوجد دليل لهذا الهدف.
          </p>
        ) : (
          <>
            <p className="text-[13px] font-bold text-[var(--text-primary)]">
              {selected?.title}
            </p>
            <p className="mt-1 text-[12px] leading-[1.9] text-[var(--text-muted)]">
              اكشف ما تحتاجه فقط. لا عقوبة على استخدام الدليل.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              {LAYERS.map((layer, index) => {
                const isOpen = revealed > index;
                const isNext = revealed === index;

                if (!isOpen) {
                  return (
                    <button
                      key={layer.key}
                      type="button"
                      disabled={!isNext}
                      onClick={() => selectedId && revealHint(selectedId)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-start transition-colors",
                        isNext
                          ? "border-[var(--border-strong)] bg-[var(--bg-elevated)] hover:border-[var(--accent)]"
                          : "cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-surface)] opacity-60",
                      )}
                    >
                      {isNext ? (
                        <layer.icon
                          className="size-4 shrink-0"
                          style={{ color: layer.tone }}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      ) : (
                        <Lock
                          className="size-4 shrink-0 text-[var(--text-muted)]"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      )}
                      <span className="flex-1 text-[12.5px] font-semibold text-[var(--text-primary)]">
                        {isNext ? layer.action : layer.label}
                      </span>
                      <span className="mono-label text-[9px]">
                        {index + 1}/3
                      </span>
                    </button>
                  );
                }

                return (
                  <article
                    key={layer.key}
                    className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3"
                  >
                    <p className="flex items-center gap-2">
                      <layer.icon
                        className="size-4 shrink-0"
                        style={{ color: layer.tone }}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span className="text-[12px] font-bold text-[var(--text-primary)]">
                        {layer.label}
                      </span>
                    </p>

                    <Block block={entry[layer.key]} className="mt-2" />

                    {layer.key === "solution" && entry.concept ? (
                      <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                        <p className="mono-label text-[9.5px]">CONCEPT</p>
                        <Block block={entry.concept} className="mt-1.5" />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
