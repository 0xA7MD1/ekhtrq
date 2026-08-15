"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Arabic prose that has to carry Latin inside it, and commands that have to
 * stay verbatim.
 *
 * Mixing the two in one string is what breaks Arabic on this kind of site: the
 * bidirectional algorithm reorders the neutral characters at every boundary,
 * so a trailing full stop, a slash or a bracket jumps to the wrong end of the
 * line and the command reads as gibberish. Two rules fix it for good:
 *
 *   1. Each paragraph declares `dir="auto"`, so its direction comes from its
 *      own first strong character rather than from whatever wraps it.
 *   2. Every Latin fragment inside a sentence is isolated, so the algorithm
 *      resolves it as a self-contained island and can't drag punctuation
 *      across the boundary.
 *
 * Whole commands don't belong in a sentence at all — they go to `CodeBlock`.
 */

const INLINE_CODE = /`([^`]+)`/g;

/** Splits `backtick` spans out of a sentence into isolated Latin chips. */
function withInlineCode(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_CODE)) {
    const start = match.index;
    if (start > cursor) nodes.push(text.slice(cursor, start));

    nodes.push(
      <code
        key={start}
        dir="ltr"
        className="bidi-isolate mx-[0.15em] rounded border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-1 py-px font-mono text-[0.88em] text-[var(--text-primary)]"
      >
        {match[1]}
      </code>,
    );

    cursor = start + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function Prose({
  children,
  muted = false,
  className,
}: {
  children: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <p
      dir="auto"
      className={cn(
        "text-[12.5px] leading-[2] whitespace-pre-line",
        muted ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]",
        className,
      )}
    >
      {withInlineCode(children)}
    </p>
  );
}

/** Clipboard write with a fallback for contexts where the API is unavailable. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Copy-to-clipboard with its own "done" state, so several can sit side by side. */
function CopyButton({
  text,
  label,
  title,
}: {
  text: string;
  label?: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1_800);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) setCopied(true);
      }}
      aria-label={copied ? "تم النسخ" : title}
      title={copied ? "تم النسخ" : title}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-1 text-[10.5px] font-semibold transition-colors",
        copied
          ? "border-[var(--accent)] bg-[var(--accent-fill)] text-[var(--accent)]"
          : "border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]",
      )}
    >
      {copied ? (
        <Check className="size-3" strokeWidth={3} aria-hidden="true" />
      ) : (
        <Copy className="size-3" strokeWidth={2} aria-hidden="true" />
      )}
      {label ? <span>{copied ? "تم" : label}</span> : null}
    </button>
  );
}

/**
 * A command, or a sequence of them, exactly as the player must type it.
 *
 * Forced left-to-right and monospaced regardless of the page around it, with
 * the `$` drawn as decoration rather than content — copying gives you the line
 * you can paste, not a prompt you have to strip.
 *
 * A sequence is the part that used to mislead people. Two commands stacked in
 * one box read as one thing to anyone who doesn't already know the shell, and
 * one copy button handing back both joined by a newline confirmed it: the
 * terminal's input is a single line, the newline vanished on paste, and the
 * commands fused into a string that could never run. So a sequence is now
 * drawn as what it is — numbered rows, divided, each copyable on its own —
 * and the copy-everything button joins them with `&&`, which the engine
 * understands and which is the thing worth learning anyway.
 */
export function CodeBlock({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;

  const many = lines.length > 1;

  return (
    // The whole block is a left-to-right island, wrapper included: the copy
    // button's `end` and the text's padding have to resolve the same way, or
    // the button lands on one side and the space reserved for it on the other.
    <div
      dir="ltr"
      className="mt-2 overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--bg-base)]"
    >
      {many ? (
        // The only Arabic in the block, so it gets its own direction back.
        <div
          dir="rtl"
          className="flex items-center justify-between gap-2 border-b border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-1.5"
        >
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
            أوامر منفصلة — نفّذ كل سطر وحده
          </span>
          <CopyButton
            text={lines.join(" && ")}
            label="نسخ الكل بـ &&"
            title="انسخ الأوامر مربوطة بـ && لتنفيذها بالترتيب في سطر واحد"
          />
        </div>
      ) : null}

      {lines.map((line, index) => (
        <div
          key={index}
          className={cn(
            "flex items-start gap-2 px-2 py-1.5",
            index > 0 && "border-t border-[var(--border-subtle)]",
          )}
        >
          {many ? (
            <span className="mt-px shrink-0 select-none font-mono text-[11px] leading-[1.9] tabular-nums text-[var(--text-muted)]">
              {index + 1}
            </span>
          ) : null}

          <code className="force-ltr min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-[12px] leading-[1.9] text-[var(--text-primary)]">
            <span aria-hidden="true" className="select-none text-[var(--text-muted)]">
              ${" "}
            </span>
            {line}
          </code>

          <CopyButton
            text={line}
            label={many ? undefined : "نسخ"}
            title={many ? `انسخ الأمر ${index + 1}` : "انسخ الأمر"}
          />
        </div>
      ))}
    </div>
  );
}
