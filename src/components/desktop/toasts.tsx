"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";

import { useLabStore, type Toast } from "@/store/use-lab-store";

const VISIBLE_MS = 4_000;

/**
 * Objective and download notices.
 *
 * Progress has to be legible without the player watching the status bar, but
 * a notice is the one place the platform can accidentally tell someone what
 * to do next — so these only ever report what already happened.
 */
export function Toasts() {
  const toasts = useLabStore((store) => store.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="absolute top-12 end-3 z-[1500] flex w-[280px] flex-col gap-2"
    >
      {toasts.slice(-4).map((toast) => (
        <Notice key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

/**
 * One notice owns its own timer. Sharing a single effect across the list
 * restarted every countdown each time a new notice arrived, so a run of
 * completions could leave the first one pinned to the screen.
 */
function Notice({ toast }: { toast: Toast }) {
  const dismiss = useLabStore((store) => store.dismissToast);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [dismiss, toast.id]);

  return (
    <article className="flex items-start gap-2.5 rounded-lg border border-[var(--accent-border)] bg-[var(--bg-elevated)] p-2.5 shadow-[0_12px_30px_-14px_rgba(0,0,0,0.9)]">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[var(--accent)]">
        <Check
          className="size-3 text-[var(--accent-foreground)]"
          strokeWidth={3}
          aria-hidden="true"
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-bold text-[var(--text-primary)]">
          {toast.title}
        </p>
        {toast.body ? (
          <p className="mt-0.5 truncate text-[11.5px] text-[var(--text-secondary)]">
            {toast.body}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="إخفاء"
        onClick={() => dismiss(toast.id)}
        className="-me-0.5 -mt-0.5 grid size-5 shrink-0 place-items-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
      >
        <X className="size-3.5" strokeWidth={2} />
      </button>
    </article>
  );
}
