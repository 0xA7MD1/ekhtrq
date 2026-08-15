import { ArrowLeft, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroTerminal } from "@/components/landing/hero-terminal";
import { Reveal } from "@/components/motion/reveal";

const PROOF = [
  "مختبرات داخل المتصفح",
  "بلا إعداد",
  "اكسر ما شئت — نحن نعيد الضبط",
];

/**
 * Nothing sits behind this section. The old hero carried a 46rem emblem at 8%
 * opacity behind the terminal — a shape big enough to notice and faint enough
 * to be unreadable, which is the worst of both. The terminal is the artwork.
 */
export function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-6 pt-12 pb-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:pt-20 lg:pb-24">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] py-1.5 ps-3 pe-4 text-[12.5px] font-medium text-[var(--text-secondary)]">
              <span className="size-1.5 rounded-full bg-[var(--accent)]" />
              مختبرات حيّة، بيئات معزولة بالكامل
            </span>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="mt-6 text-[3rem] leading-[1.15] font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[3.75rem] lg:text-[4.25rem]">
              تعلّم الاختراق.
              <br />
              <span className="text-[var(--accent)]">على الحقيقة.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mt-6 max-w-xl text-base leading-[1.9] text-[var(--text-secondary)] sm:text-[17px]">
              «اخترق» يضعك داخل عمليات اختراق حقيقية — هدف، وقصة، ومختبر حيّ خاص
              بك. تُحقّق، وتستغلّ الثغرة، وتلتقط العلَم. لا أحد هنا يكتفي
              بمشاهدة الدروس.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              {/* The accent is the primary. It is the loudest thing on a
                  near-black page, so the page's main action wears it. */}
              <Button
                asChild
                className="h-12 rounded-lg bg-[var(--accent)] px-6 text-[0.9375rem] font-bold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
              >
                <a href="#pricing">
                  ابدأ الاختراق
                  <ArrowLeft className="size-4" strokeWidth={2} />
                </a>
              </Button>
              {/* The secondary is a colour too — off-white paper on dark, the
                  highest-contrast pair the page can make. A bordered button
                  the same colour as the page behind it is the one thing this
                  design does not do. */}
              <Button
                asChild
                variant="secondary"
                className="h-12 rounded-lg bg-[var(--paper)] px-6 text-[0.9375rem] font-bold text-[var(--paper-foreground)] hover:bg-[var(--paper-hover)]"
              >
                <a href="#cases">
                  <Play className="size-3.5" strokeWidth={2} />
                  شاهد عملية
                </a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.24}>
            {/*
             * One solid strip with hairline dividers, rather than three loose
             * bullets floating on the page. `gap-px` over a border-coloured
             * ground draws the rules, so they flip with the page direction for
             * free.
             */}
            <ul className="rounded-card mt-10 grid gap-px overflow-hidden border border-[var(--border-strong)] bg-[var(--border-subtle)] shadow-[var(--shadow-card)] sm:grid-cols-3">
              {PROOF.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2.5 bg-[var(--bg-surface)] px-4 py-4"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span className="text-[13px] font-medium text-[var(--text-primary)]">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.3} y={32} className="lg:pe-4">
          <HeroTerminal />
        </Reveal>
      </div>
    </section>
  );
}
