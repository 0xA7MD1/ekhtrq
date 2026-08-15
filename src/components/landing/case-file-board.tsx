"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Suspect positions are percentages of the board; cards centre on them.
 *
 * Coordinates are physical (percentages never mirror), so they are authored
 * for the RTL reading order: the first suspect sits on the right.
 */
const SUSPECTS = [
  {
    initials: "م ف",
    name: "م. الفارس",
    role: "مسؤول أنظمة",
    note: "جلسة VPN عند 03:12. يقول إنه كان على متن طائرة.",
    x: 76,
    y: 17,
  },
  {
    initials: "ل ح",
    name: "ل. الحمادي",
    role: "المشتريات",
    note: "وقّع فاتورة المورّد. وينكر أنه فتحها.",
    x: 24,
    y: 50,
  },
  {
    initials: "ر ق",
    name: "ر. القاسم",
    role: "الخدمات",
    note: "نُسخت بطاقته قبل يومين من أول تسريب.",
    x: 70,
    y: 85,
  },
];

/**
 * Curves run centre-to-centre so their ends stay tucked behind the cards; the
 * board is sized so a long middle stretch of each one stays visible.
 *
 * Points are percentages, resolved against the measured board in `pathFor`.
 * The SVG deliberately has no viewBox: user units are CSS pixels, so stroke
 * widths stay uniform and `getTotalLength()` matches what dash offsets need.
 */
const LINKS = [
  { points: [76, 17, 50, 24, 24, 50], dashed: false },
  { points: [24, 50, 42, 74, 70, 85], dashed: false },
  { points: [76, 17, 94, 51, 70, 85], dashed: true },
];

function pathFor(points: number[], width: number, height: number) {
  const [x1, y1, cx, cy, x2, y2] = points;
  const px = (p: number) => ((p / 100) * width).toFixed(1);
  const py = (p: number) => ((p / 100) * height).toFixed(1);
  return `M${px(x1)} ${py(y1)} Q ${px(cx)} ${py(cy)} ${px(x2)} ${py(y2)}`;
}

const LINK_LABELS = [
  { text: "نفس مجمّع VPN", x: "45%", y: "32%" },
  { text: "البطاقة ↔ الفاتورة", x: "45%", y: "71%" },
];

const TABS = ["اللوحة", "النص", "الطرفية"];

/** Window buttons, matching the hero terminal's chrome. */
const DOTS = ["var(--diff-hard)", "var(--gold)", "var(--accent)"];

export function CaseFileBoard() {
  const container = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const measured = size.width > 0 && size.height > 0;

  // Connector geometry is in pixels, so it has to follow the board's size.
  useEffect(() => {
    const el = board.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      // Padding box, to match what the cards' percentage offsets resolve
      // against — contentRect would shift every line by the board's padding.
      const width = el.clientWidth;
      const height = el.clientHeight;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useGSAP(
    () => {
      if (!measured) return;

      const scope = container.current;
      const paths = gsap.utils.toArray<SVGPathElement>("[data-link]", scope);
      const labels = gsap.utils.toArray<HTMLElement>(
        "[data-link-label]",
        scope,
      );
      const cards = gsap.utils.toArray<HTMLElement>("[data-suspect]", scope);

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(paths, { strokeDasharray: "none", strokeDashoffset: 0 });
        gsap.set([...labels, ...cards], { opacity: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top 72%",
          once: true,
        },
      });

      // Swap the CSS placeholder dash for each path's real length, so the
      // offset below unrolls exactly one dash the length of the curve.
      const length = (_i: number, target: SVGPathElement) =>
        target.getTotalLength();

      tl.set(paths, { strokeDasharray: length, strokeDashoffset: length })
        .fromTo(
          cards,
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.14,
            ease: "power2.out",
          },
        )
        // Connections draw themselves in once the people are on the board.
        .to(
          paths,
          {
            strokeDashoffset: 0,
            duration: 1.1,
            stagger: 0.22,
            ease: "power1.inOut",
            // Drop the dash pattern afterwards so a later resize can't
            // reintroduce a gap in a line that has already been drawn.
            onComplete: () => gsap.set(paths, { strokeDasharray: "none" }),
          },
          "-=0.15",
        )
        .to(
          labels,
          { opacity: 1, duration: 0.45, stagger: 0.12, ease: "power1.out" },
          "-=0.5",
        );
    },
    { scope: container, dependencies: [measured] },
  );

  return (
    <div ref={container} className="panel-noir rounded-card overflow-hidden">
      {/* Case-file chrome */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          {DOTS.map((dot) => (
            <span
              key={dot}
              style={{ background: dot }}
              className="size-2.5 rounded-full"
            />
          ))}
        </div>
        <span className="mono-label text-[10px]">
          OPS. 07 — OPERATION BLACKORDER
        </span>
        <div className="ms-auto flex items-center gap-1">
          {TABS.map((tab, i) => (
            <span
              key={tab}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium",
                i === 0
                  ? "border border-[var(--accent-border)] bg-[var(--accent-fill)] text-[var(--accent)]"
                  : "text-[var(--text-muted)]",
              )}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>

      {/*
       * Suspect board. The ground is cut *below* the panel, so the suspect
       * cards read as objects pinned to it rather than as text blocks.
       *
       * Deliberately bare: a 28px grid and crop marks used to sit under the
       * cards, and every one of those lines crossed behind the connectors that
       * are the actual point of the drawing.
       */}
      <div
        ref={board}
        className="well-noir relative min-h-[560px] p-4 sm:min-h-[480px] sm:p-6 lg:min-h-[520px]"
      >
        <svg
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
        >
          {measured
            ? LINKS.map((link, i) => (
                <path
                  key={i}
                  data-link
                  className="case-link"
                  d={pathFor(link.points, size.width, size.height)}
                  fill="none"
                  // One colour for every connection — a second hue implied a
                  // second kind of link that the board never actually has.
                  stroke="var(--accent)"
                  strokeWidth={2}
                  strokeOpacity={link.dashed ? 0.45 : 0.9}
                  strokeLinecap="round"
                />
              ))
            : null}
        </svg>

        {LINK_LABELS.map((label) => (
          <span
            key={label.text}
            data-link-label
            style={{ left: label.x, top: label.y, opacity: 0 }}
            // No z-index: the suspect cards come later in the DOM, so a card
            // that overlaps a label covers it, which is the right order.
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-0.5 text-[10.5px] font-medium text-[var(--text-primary)] shadow-[0_4px_12px_-6px_rgba(0,0,0,0.9)]"
          >
            {label.text}
          </span>
        ))}

        {SUSPECTS.map((suspect) => (
          // The wrapper owns the centring transform so GSAP is free to
          // animate `y` on the card inside it.
          <div
            key={suspect.initials}
            style={{ left: `${suspect.x}%`, top: `${suspect.y}%` }}
            className="absolute w-[44%] max-w-[248px] -translate-x-1/2 -translate-y-1/2 sm:w-[40%] lg:w-[32%]"
          >
            <article
              data-suspect
              style={{ opacity: 0 }}
              className="relative rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3 shadow-[0_14px_28px_-14px_rgba(0,0,0,0.95)]"
            >
              {/* Pin. The card is on a wall, so something has to hold it up. */}
              <span
                aria-hidden="true"
                className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full border border-[#7a1f22] bg-[var(--diff-hard)] shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              />

              <div className="flex items-center gap-2.5">
                {/*
                 * Evidence photo placeholder. Hatched rather than blank: an
                 * empty grey square reads as a loading avatar, hatching reads
                 * as "no photo on file", which is what it is.
                 */}
                <span className="hatch relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--border-strong)] bg-[var(--bg-sunken)]">
                  <span className="rounded-sm bg-[var(--bg-sunken)] px-1 text-[11px] font-bold text-[var(--text-primary)]">
                    {suspect.initials}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[var(--text-primary)]">
                    {suspect.name}
                  </p>
                  <p className="truncate text-[10.5px] text-[var(--text-muted)]">
                    {suspect.role}
                  </p>
                </div>
              </div>
              <p className="mt-2.5 border-t border-[var(--border-subtle)] pt-2.5 text-[11.5px] leading-relaxed text-[var(--text-secondary)]">
                {suspect.note}
              </p>
            </article>
          </div>
        ))}
      </div>

      {/* Transcript + shell */}
      <div className="grid gap-px border-t border-[var(--border-strong)] bg-[var(--border-strong)] md:grid-cols-2">
        <div className="bg-[var(--bg-surface)] p-5">
          <span className="mono-label text-[10px]">TRANSCRIPT · 02</span>
          <div className="mt-3 space-y-2.5 text-[12.5px] leading-[1.9]">
            <p className="text-[var(--text-secondary)]">
              <span className="text-[var(--accent)]">أنت</span> — اشرح لي تسجيل
              الدخول عند 03:12.
            </p>
            <p className="text-[var(--text-primary)]">
              <span className="text-[var(--text-secondary)]">م. الفارس</span> —
              لم أكن أنا. كنت على متن طائرة. راجع سجلات البطاقات.
            </p>
            {/* The one line that cracks the alibi — boxed in the accent so it
                reads as a pinned note, not another paragraph. */}
            <p className="rounded-lg border border-[var(--accent-border)] bg-[var(--accent-fill)] px-3 py-2 text-[11.5px] text-[var(--text-primary)]">
              <span className="font-bold text-[var(--accent)]">ملاحظة</span> —
              قارئ البطاقات سجّل دخولًا عند 03:09.
            </p>
          </div>
        </div>

        {/* Shell output stays left-to-right — it is real terminal text. */}
        <div dir="ltr" className="force-ltr bg-[var(--bg-sunken)] p-5">
          <span className="mono-label text-[10px]">SHELL · 10.10.14.7</span>
          <div className="mt-3 space-y-1.5 font-mono text-[12px] leading-6">
            <p>
              <span className="text-[var(--text-muted)]">$</span>{" "}
              <span className="text-[var(--text-primary)]">
                ssh -i vance.key svc-deploy@10.10.14.7
              </span>
            </p>
            <p className="text-[var(--text-muted)]">
              svc-deploy@order-portal:~$ id
            </p>
            <p className="text-[var(--accent)]">
              uid=1004(svc-deploy) groups=1004,27(sudo)
            </p>
            <p className="text-[var(--gold)]">
              [!] sudo without password — escalate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
