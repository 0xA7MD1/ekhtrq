import Link from "next/link";
import {
  Clock,
  Database,
  Globe,
  Lock,
  Mail,
  Server,
  SignalHigh,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MonoLabel } from "@/components/landing/mono-label";
import { Pill } from "@/components/landing/pill";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";

/** Attack surfaces in play. Neutral chips — the difficulty chip is the only
 *  coloured one, so it stays the thing you notice first. */
const SKILLS = ["ويب", "تصعيد صلاحيات", "استخبارات مفتوحة"];

/** Targets in scope, shown as a stack the way a case file stacks mugshots. */
const TARGETS = [Server, Globe, Database, Mail];
const TARGETS_REMAINING = 4;

export function FeaturedCase() {
  return (
    <section
      id="cases"
      className="relative scroll-mt-24 py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-6">
        <SectionHeading
          eyebrow="عملية مختارة"
          title="إصدار هذا الشهر."
          description="عمليات جديدة كل بضعة أسابيع. هذه تبدأ بأمر شراء مسرَّب وتنتهي في مكان لا تتوقعه."
        />

        <Reveal delay={0.06} className="mt-10">
          {/* Outer wrapper stays unclipped so the price badge can overhang. */}
          <div className="relative">
            {/* Hangs off the top edge, the way a price tag clips onto a file. */}
            <span className="absolute -top-3 end-6 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-bold text-[var(--accent-foreground)]">
              <Lock className="size-3" strokeWidth={2} />
              20 ريال
            </span>

            {/* No spine down the leading edge: it was a 4px stripe that named
                nothing the difficulty chip doesn't already say. */}
            <article className="card-noir rounded-card relative overflow-hidden">
              <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[1.5fr_1fr] lg:items-center">
                <div>
                  <Pill tone="hard" icon={SignalHigh}>
                    متقدّم
                  </Pill>

                  <h3 className="mt-4 text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-3xl">
                    عملية بلاك أوردر
                  </h3>
                  <p className="mt-3 max-w-xl text-[15px] leading-[1.95] text-[var(--text-secondary)]">
                    بوّابة طلبات لمورّد دفاعي تسرّب أوامر الشراء. اعثر على الباب
                    الذي تركه أحدهم مفتوحًا — ثم اعثر على من فتحه.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    {SKILLS.map((skill) => (
                      <Pill key={skill}>{skill}</Pill>
                    ))}
                    <span className="ms-1 flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
                      <Clock className="size-4" strokeWidth={1.5} />≈ 3 ساعات
                    </span>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-4">
                    <MonoLabel>6 FLAGS · 3 HOSTS</MonoLabel>

                    <div className="flex items-center gap-2">
                      {/* Overlapping stack, then the remainder in its own box. */}
                      <div className="flex -space-x-2 rtl:space-x-reverse">
                        {TARGETS.map((Icon, i) => (
                          <span
                            key={i}
                            className="grid size-8 place-items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                          >
                            <Icon className="size-3.5" strokeWidth={1.75} />
                          </span>
                        ))}
                      </div>
                      <span
                        dir="ltr"
                        className="grid size-8 place-items-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] font-mono text-[11px] font-bold text-[var(--text-primary)]"
                      >
                        +{TARGETS_REMAINING}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-5">
                  <div className="flex items-baseline justify-between">
                    <MonoLabel className="text-[10px]">SOLVED</MonoLabel>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      312 مخترقًا
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                    <div className="h-full w-[38%] rounded-full bg-[var(--accent)]" />
                  </div>

                  <Button
                    disabled
                    variant="secondary"
                    className="mt-5 h-12 w-full cursor-not-allowed rounded-lg bg-[var(--accent)] text-[0.9375rem] font-bold text-[var(--accent-foreground)] disabled:opacity-100"
                  >
                    <Lock className="size-4" strokeWidth={2} />
                    افتح العملية بـ 20 ريال
                  </Button>
                  <p className="mt-3 text-center text-xs leading-[1.8] text-[var(--text-secondary)]">
                    أو{" "}
                    <Link
                      href="/cases/01-the-name"
                      className="font-semibold text-[var(--accent)] underline underline-offset-4 transition-colors hover:text-[var(--accent-hover)]"
                    >
                      ابدأ عملية «الاسم» مجانًا
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </article>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
