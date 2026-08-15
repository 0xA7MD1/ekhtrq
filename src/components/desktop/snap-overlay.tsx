"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { useDesktopStore, zoneRect } from "@/store/use-desktop-store";
import { APP_META } from "./app-meta";
import { useViewport } from "./use-viewport";

/**
 * The ghost that shows where a dragged window will land.
 *
 * Drawn over the desk rather than under it: the window being dragged is only
 * ever near an edge when this is up, so covering the middle of the screen with
 * a thin tint costs nothing and answers the only question the player has —
 * "how big will it be if I let go here?".
 */
export function SnapPreview() {
  const preview = useDesktopStore((store) => store.preview);
  const viewport = useViewport();

  if (!preview || !viewport) return null;

  const rect = zoneRect(preview, viewport);

  return (
    <div
      aria-hidden="true"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      // The one deliberately translucent surface in the product: a drag preview
      // has to show the windows underneath it, so it carries its own rgba
      // rather than `--accent-fill`, which is an opaque chip colour.
      className="snap-ghost pointer-events-none absolute z-[600] border-2 border-[var(--accent)] bg-[rgba(63,185,80,0.14)]"
    >
      <span className="corner-marks absolute inset-0 [--mark:20px]" />
    </div>
  );
}

/**
 * Snap assist.
 *
 * Snapping one window to a half leaves an obvious hole beside it, and the whole
 * point of tiling here is working two panes at once — the terminal against the
 * brief, the browser against the file tree. So the hole asks what goes in it
 * instead of sitting empty and making the player go find the dock.
 */
export function SnapAssist() {
  const assist = useDesktopStore((store) => store.assist);
  const dismiss = useDesktopStore((store) => store.dismissAssist);
  const snapTo = useDesktopStore((store) => store.snapTo);
  const viewport = useViewport();

  // An offer, not a modal — it must never be the thing standing between the
  // player and the terminal.
  useEffect(() => {
    if (!assist) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [assist, dismiss]);

  if (!assist || !viewport) return null;

  const rect = zoneRect(assist.zone, viewport);

  return (
    <div
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      className="absolute z-[850] grid place-items-center border border-[var(--border-strong)] bg-[var(--bg-base)]/85 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-[380px] rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3 shadow-[0_20px_50px_-18px_rgba(0,0,0,0.95)]">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12.5px] font-bold text-[var(--text-primary)]">
            ضع نافذة هنا
          </p>
          <button
            type="button"
            aria-label="تجاهل"
            onClick={dismiss}
            className="grid size-6 place-items-center rounded border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:border-[var(--diff-hard)] hover:text-[var(--text-primary)]"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </div>

        <ul className="mt-2.5 grid grid-cols-2 gap-1.5">
          {assist.candidates.map((id) => {
            const meta = APP_META[id];
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => snapTo(id, assist.zone, viewport)}
                  className="flex w-full items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-2 text-start transition-colors hover:border-[var(--accent)] hover:bg-[var(--bg-base)]"
                >
                  <meta.icon
                    className="size-4 shrink-0 text-[var(--accent)]"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--text-primary)]">
                    {meta.title}
                  </span>
                  <span className="mono-label shrink-0 text-[8.5px]">
                    {meta.code}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
