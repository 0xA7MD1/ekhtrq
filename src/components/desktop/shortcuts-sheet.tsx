"use client";

import { useEffect } from "react";
import { Keyboard, X } from "lucide-react";

import { SHORTCUTS } from "./use-shortcuts";

/**
 * The keyboard reference.
 *
 * Snapping, tiling and switching are all discoverable by pointer elsewhere —
 * this exists so a player who works at the keyboard, which is most of them by
 * the second case, doesn't have to reach for the mouse to arrange a desk.
 */
export function ShortcutsSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="اختصارات لوحة المفاتيح"
      onClick={onClose}
      className="absolute inset-0 z-[2100] grid place-items-center bg-[var(--bg-base)]/85 p-6 backdrop-blur-sm"
    >
      <article
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.95)]"
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--border-strong)] px-4 py-3">
          <Keyboard
            className="size-4 text-[var(--accent)]"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="flex-1 text-[13px] font-bold text-[var(--text-primary)]">
            اختصارات سطح المكتب
          </span>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className="grid size-6 place-items-center rounded border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:border-[var(--diff-hard)] hover:text-[var(--text-primary)]"
          >
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </div>

        <ul className="divide-y divide-[var(--border-subtle)]">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.label}
              className="flex items-center justify-between gap-4 px-4 py-2"
            >
              <span className="text-[12.5px] text-[var(--text-secondary)]">
                {shortcut.label}
              </span>

              {/* Key names stay left-to-right inside the RTL row, and read in
                  press order the way they are written on a keyboard. */}
              <span dir="ltr" className="flex shrink-0 items-center gap-1">
                {shortcut.keys.map((key) => (
                  <kbd
                    key={key}
                    className="rounded border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--text-primary)]"
                  >
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <p className="border-t border-[var(--border-strong)] px-4 py-2.5 text-[11.5px] leading-[1.9] text-[var(--text-muted)]">
          اسحب أي نافذة إلى حافة الشاشة لإلصاقها، أو قرّبها من نافذة أخرى
          لتلتصق بها. الحواف العلوية والسفلية تعطيك أرباعًا.
        </p>
      </article>
    </div>
  );
}
