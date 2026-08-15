"use client";

import { APP_META } from "./app-meta";
import { APP_IDS, useDesktopStore } from "@/store/use-desktop-store";
import { cn } from "@/lib/utils";

/**
 * The dock.
 *
 * macOS placement, but stamped rather than glassy: solid panel, real borders,
 * tight gaps. A window that is open but hidden behind others still shows its
 * indicator — the dot means "running", not "focused".
 *
 * Nothing ever covers it. Tiles are carved out of a work area that stops above
 * the dock, so even a filled window leaves it reachable.
 */
export function Dock() {
  const windows = useDesktopStore((store) => store.windows);
  const focused = useDesktopStore((store) => store.focused);
  const toggle = useDesktopStore((store) => store.toggle);

  return (
    <nav
      aria-label="التطبيقات"
      className="absolute bottom-3 left-1/2 z-[900] -translate-x-1/2"
    >
      <ul className="flex items-end gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-1.5 shadow-[0_16px_40px_-18px_rgba(0,0,0,0.9)]">
        {APP_IDS.map((id, index) => {
          const meta = APP_META[id];
          const state = windows[id];
          const isFocused = focused === id && !state.minimized;

          return (
            <li key={id} className="group relative">
              <button
                type="button"
                onClick={() => toggle(id)}
                aria-pressed={state.open && !state.minimized}
                className={cn(
                  "grid size-11 place-items-center rounded-lg border transition-all duration-150",
                  // A dock icon should feel like a physical key. It lifts under
                  // the pointer and takes the press — no scaling, which reads
                  // as a web template rather than a desk.
                  "hover:-translate-y-0.5 active:translate-y-0",
                  isFocused
                    ? "border-[var(--accent)] bg-[var(--bg-base)] text-[var(--accent)]"
                    : state.minimized
                      ? "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
                      : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]",
                )}
              >
                <meta.icon className="size-5" strokeWidth={1.75} />
                <span className="sr-only">{meta.title}</span>
              </button>

              {/* Running indicator, the way a dock signals a live process. It
                  widens for the focused window, so the bar reads as a state at
                  a glance instead of four identical dots. */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-0 -bottom-0.5 mx-auto h-[3px] rounded-full transition-all duration-200",
                  state.open
                    ? state.minimized
                      ? "w-1.5 bg-[var(--text-muted)]"
                      : isFocused
                        ? "w-5 bg-[var(--accent)]"
                        : "w-1.5 bg-[var(--accent)]"
                    : "w-1.5 bg-transparent",
                )}
              />

              {/* Purely visual: the button already carries the same name for
                  assistive tech, and announcing it twice helps nobody. The
                  shortcut rides along here because a tooltip is where someone
                  looks once they've decided they use this app a lot. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-base)] px-2 py-1 whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100"
              >
                <span className="text-[11.5px] text-[var(--text-primary)]">
                  {meta.title}
                </span>
                <span dir="ltr" className="mono-label text-[8px]">
                  Alt {index + 1}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
