"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import logoMark from "@/assets/logo-mark.png";
import type { LabManifest } from "@/lib/labs/schema";
import { isComplete, renderPrompt } from "@/lib/sim/session";
import { useLabStore } from "@/store/use-lab-store";
import { APP_IDS, useDesktopStore } from "@/store/use-desktop-store";

import { APP_META } from "./app-meta";
import { BrowserApp } from "./apps/browser-app";
import { FilesApp } from "./apps/files-app";
import { GuideApp } from "./apps/guide-app";
import { TerminalApp } from "./apps/terminal-app";
import { CompletionOverlay } from "./completion-overlay";
import { Dock } from "./dock";
import { IntroOverlay } from "./intro-overlay";
import { ShortcutsSheet } from "./shortcuts-sheet";
import { SnapAssist, SnapPreview } from "./snap-overlay";
import { Toasts } from "./toasts";
import { TopBar } from "./top-bar";
import { useShortcuts } from "./use-shortcuts";
import { WindowFrame } from "./window-frame";

/**
 * The simulated desktop.
 *
 * This is the whole player. It receives one validated manifest as a prop and
 * knows nothing else about the case — every string it shows comes from that
 * object or from the session derived from it. Adding a second case touches
 * none of this file.
 */
export function Desktop({ manifest }: { manifest: LabManifest }) {
  const session = useLabStore((store) => store.session);
  const init = useLabStore((store) => store.init);
  const reset = useLabStore((store) => store.reset);
  const clampAll = useDesktopStore((store) => store.clampAll);
  const dismissAssist = useDesktopStore((store) => store.dismissAssist);

  const [started, setStarted] = useState(false);
  const [closedOut, setClosedOut] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useShortcuts(useCallback(() => setShowShortcuts((open) => !open), []));

  useEffect(() => {
    init(manifest);
  }, [init, manifest]);

  // Windows open at fixed defaults so the store stays SSR-safe; the real
  // viewport is only knowable here, so geometry is corrected on mount.
  useEffect(() => {
    const fit = () =>
      clampAll({ w: window.innerWidth, h: window.innerHeight });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [clampAll]);

  const finished = session ? isComplete(manifest, session) : false;

  // A returning player with progress skips the cold open — they've read it.
  const needsIntro = !started && (session?.flags.length ?? 0) === 0;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[var(--bg-base)]">
      {/* Wallpaper. The same room the landing page is lit in — a measured
          grid, a shaft of window light through blinds, the brand mark burned
          in very low, and grain over the top so the dark field reads as a
          photograph rather than a fill. Reusing those layers is what makes
          walking into a case feel like the same building. */}
      <div aria-hidden="true" className="bg-lamp pointer-events-none absolute inset-0" />
      <div
        aria-hidden="true"
        className="bg-slats pointer-events-none absolute inset-0 opacity-70"
      />
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-0 opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 grid place-items-center"
      >
        <Image
          src={logoMark}
          alt=""
          width={520}
          height={520}
          // It's the biggest thing painted, so Chrome scores this near-invisible
          // watermark as the LCP element — lazy-loading it holds the metric open
          // for no visual gain. Eager, but deliberately not `preload`: it must
          // not outrank the terminal in the <head>.
          loading="eager"
          className="w-[min(46vw,520px)] opacity-[0.035] select-none"
        />
      </div>
      <div
        aria-hidden="true"
        className="bg-vignette pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden="true"
        className="bg-grain pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
      />

      {/* Below this width a windowed desktop is unusable, and pretending
          otherwise is worse than saying so. */}
      <div className="relative z-10 grid h-full place-items-center px-8 text-center md:hidden">
        <div>
          <p className="text-[15px] font-bold text-[var(--text-primary)]">
            هذه البيئة تحتاج شاشة أكبر.
          </p>
          <p className="mt-2 text-[13px] leading-[2] text-[var(--text-secondary)]">
            افتح العملية على حاسوب أو جهاز لوحي بعرض ٧٦٨ بكسل فأكثر. الطرفية
            والمتصفح ومدير الملفات تعمل جنبًا إلى جنب، ولا يمكن اختصارها في شاشة
            هاتف.
          </p>
        </div>
      </div>

      <div className="relative hidden h-full md:block">
        <TopBar
          manifest={manifest}
          onReset={reset}
          onShowShortcuts={() => setShowShortcuts(true)}
        />

        {/* Pressing bare desk puts the snap offer away — the same way clicking
            past any other suggestion dismisses it. */}
        <div className="absolute inset-0" onPointerDown={dismissAssist}>
          <SnapPreview />

          {APP_IDS.map((id) => {
            const meta = APP_META[id];
            return (
              <WindowFrame
                key={id}
                id={id}
                title={meta.title}
                subtitle={
                  id === "terminal" && session
                    ? renderPrompt(manifest, session)
                    : meta.code
                }
                icon={meta.icon}
              >
                {id === "terminal" ? <TerminalApp manifest={manifest} /> : null}
                {id === "browser" ? <BrowserApp manifest={manifest} /> : null}
                {id === "files" ? <FilesApp manifest={manifest} /> : null}
                {id === "guide" ? <GuideApp manifest={manifest} /> : null}
              </WindowFrame>
            );
          })}
        </div>

        <SnapAssist />
        <Dock />
        <Toasts />

        {showShortcuts ? (
          <ShortcutsSheet onClose={() => setShowShortcuts(false)} />
        ) : null}

        {needsIntro ? (
          <IntroOverlay manifest={manifest} onStart={() => setStarted(true)} />
        ) : null}

        {finished && !closedOut && session ? (
          <CompletionOverlay
            manifest={manifest}
            session={session}
            onDismiss={() => setClosedOut(true)}
            onReplay={() => {
              reset();
              setClosedOut(false);
              setStarted(true);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
