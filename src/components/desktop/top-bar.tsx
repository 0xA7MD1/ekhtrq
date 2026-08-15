"use client";

import { useEffect, useState } from "react";
import {
  Columns2,
  Crosshair,
  Keyboard,
  LayoutGrid,
  RotateCcw,
  SignalHigh,
  Target,
  Undo2,
} from "lucide-react";

import type { LabManifest } from "@/lib/labs/schema";
import { activeObjective, objectiveStates } from "@/lib/sim/session";
import { useLabStore } from "@/store/use-lab-store";
import { useDesktopStore } from "@/store/use-desktop-store";
import { APP_META } from "./app-meta";
import { cn } from "@/lib/utils";

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

const CHROME_BUTTON =
  "inline-flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2 py-1 text-[12px] text-[var(--text-secondary)] transition-colors";

/**
 * Workspace commands.
 *
 * Arranging four windows by hand every time is busywork, so the two moves
 * worth having a button for live here: fill the desk with whatever is open,
 * and put everything back the way the case started.
 */
function LayoutMenu() {
  const tileAll = useDesktopStore((store) => store.tileAll);
  const resetLayout = useDesktopStore((store) => store.resetLayout);
  const [open, setOpen] = useState(false);

  const viewport = () => ({ w: window.innerWidth, h: window.innerHeight });

  const items = [
    {
      label: "توزيع النوافذ",
      hint: "Ctrl Alt T",
      icon: Columns2,
      run: () => tileAll(viewport()),
    },
    {
      label: "الترتيب الافتراضي",
      hint: "Ctrl Alt R",
      icon: Undo2,
      run: () => resetLayout(viewport()),
    },
  ];

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title="ترتيب النوافذ"
        aria-label="ترتيب النوافذ"
        aria-expanded={open}
        className={cn(
          "grid size-7 place-items-center rounded-md border bg-[var(--bg-elevated)] transition-colors",
          open
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]",
        )}
      >
        <LayoutGrid className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open ? (
        <>
          {/* Catches the next click anywhere on the page, which is the only
              reliable way to close a menu that isn't modal. */}
          <span
            className="fixed inset-0 z-[1100]"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute top-full z-[1200] mt-1.5 w-[210px] end-0 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-1 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.95)]">
            {items.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    item.run();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-[var(--bg-surface)]"
                >
                  <item.icon
                    className="size-3.5 shrink-0 text-[var(--accent)]"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-[12px] text-[var(--text-primary)]">
                    {item.label}
                  </span>
                  <span dir="ltr" className="mono-label shrink-0 text-[8px]">
                    {item.hint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </span>
  );
}

/**
 * Kali-style status bar: who you are, what you're on, how long you've been at
 * it. Everything is derived from the session, so it can't drift from the
 * terminal's idea of the world.
 */
export function TopBar({
  manifest,
  onReset,
  onShowShortcuts,
}: {
  manifest: LabManifest;
  onReset: () => void;
  onShowShortcuts: () => void;
}) {
  const session = useLabStore((store) => store.session);
  const focused = useDesktopStore((store) => store.focused);

  // Rendered only after mount: a clock in the server payload would hydrate
  // mismatched, and an operation timer has to start from the session anyway.
  // The first value is set on the next frame rather than synchronously in the
  // effect body, so the clock never causes a cascading render.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = requestAnimationFrame(tick);
    const timer = setInterval(tick, 1_000);
    return () => {
      cancelAnimationFrame(first);
      clearInterval(timer);
    };
  }, []);

  if (!session) return null;

  const states = objectiveStates(manifest, session);
  const completed = states.filter((state) => state.complete).length;
  const current = activeObjective(manifest, session);
  const ratio = states.length === 0 ? 0 : completed / states.length;

  const elapsedMs = now ? now.getTime() - new Date(session.startedAt).getTime() : 0;
  const minutes = Math.max(0, Math.floor(elapsedMs / 60_000));
  const seconds = Math.max(0, Math.floor((elapsedMs % 60_000) / 1_000));

  return (
    <header className="absolute inset-x-0 top-0 z-[1000] h-10 border-b border-[var(--border-strong)] bg-[var(--bg-base)]">
      <div className="flex h-[38px] items-center gap-3 px-3">
        <span className="flex items-center gap-2">
          <Crosshair
            className="size-4 text-[var(--accent)]"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="text-[13px] font-bold text-[var(--text-primary)]">
            اخترق
          </span>
        </span>

        <span className="h-4 w-px bg-[var(--border-strong)]" />

        <span className="text-[12.5px] font-semibold text-[var(--text-secondary)]">
          {focused ? APP_META[focused].title : "سطح المكتب"}
        </span>

        <span className="ms-auto flex items-center gap-2">
          {current ? (
            <span className="hidden items-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-1 lg:inline-flex">
              <span className="mono-label text-[9px] leading-none">
                {twoDigits(completed)}/{twoDigits(states.length)}
              </span>
              <span className="h-3 w-px bg-[var(--border-strong)]" />
              <span className="max-w-[220px] truncate text-[12px] text-[var(--text-primary)]">
                {current.complete ? manifest.completion.message : current.title}
              </span>
            </span>
          ) : null}

          <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--diff-hard)] bg-[rgba(229,72,77,0.12)] px-2.5 py-1">
            <Target
              className="size-3.5 text-[var(--diff-hard)]"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
              {manifest.title}
            </span>
          </span>

          {/* The way back from a workspace the player has dragged into a
              corner. Layout only — progress is untouched. */}
          <LayoutMenu />

          <button
            type="button"
            onClick={onShowShortcuts}
            title="اختصارات لوحة المفاتيح"
            aria-label="اختصارات لوحة المفاتيح"
            className="grid size-7 place-items-center rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
          >
            <Keyboard className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onReset}
            title="إعادة ضبط العملية"
            className={cn(CHROME_BUTTON, "hover:border-[var(--diff-hard)] hover:text-[var(--text-primary)]")}
          >
            <RotateCcw className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
            <span className="hidden sm:inline">إعادة ضبط</span>
          </button>

          <SignalHigh
            className="size-4 text-[var(--accent)]"
            strokeWidth={1.75}
            aria-hidden="true"
          />

          <span
            dir="ltr"
            className="rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2 py-1 font-mono text-[11.5px] tabular-nums text-[var(--text-primary)]"
          >
            {twoDigits(minutes)}:{twoDigits(seconds)}
          </span>

          <span
            dir="ltr"
            className="hidden font-mono text-[11.5px] tabular-nums text-[var(--text-secondary)] sm:inline"
          >
            {now
              ? `${twoDigits(now.getHours())}:${twoDigits(now.getMinutes())}`
              : "--:--"}
          </span>
        </span>
      </div>

      {/* Objective progress, drawn as the bar's own bottom edge. */}
      <div className="h-px w-full bg-[var(--border-strong)]">
        <div
          className="h-px bg-[var(--accent)] transition-[width] duration-500"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </header>
  );
}
