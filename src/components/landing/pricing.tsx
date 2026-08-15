"use client";

import { useState } from "react";
import { ArrowLeft, Check, CreditCard, ShieldCheck, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/landing/pill";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

type Billing = "monthly" | "yearly";

/**
 * Prices are display-only. Checkout runs through Polar, which is scaffolded
 * but not wired up yet — every paid CTA below stays disabled until it is. The
 * free tier links into the case archive instead, because those labs are live.
 *
 * `yearly` is the *per-month* price when the year is paid up front, which is
 * how the amount is shown; the cadence line carries the "تُدفع سنويًا" caveat.
 */
const TIERS = [
  {
    name: "مجاني",
    monthly: 0,
    yearly: 0,
    unit: "شهريًا",
    description: "ما يكفي لتعرف إن كان هذا المكان يناسبك.",
    featured: false,
    inherits: null,
    features: [
      "3 عمليات تمهيدية",
      "مختبر في المتصفح، ساعتان لكل جلسة",
      "تقارير المجتمع",
    ],
  },
  {
    name: "احترافي",
    monthly: 19,
    yearly: 15,
    unit: "شهريًا",
    description: "الأرشيف كاملًا، وكل عملية جديدة يوم صدورها.",
    featured: true,
    inherits: "كل ما في المجاني، وفوقه:",
    features: [
      "كل العمليات، بما فيها الإصدارات الجديدة",
      "مختبرات دائمة — تكمل من حيث توقّفت",
      "شروح رسمية بعد أن تحلّ العملية",
      "تتبّع التقدّم وشهادات إتمام",
    ],
  },
  {
    name: "فريق",
    monthly: 15,
    yearly: 12,
    unit: "لكل مقعد شهريًا",
    description: "لفرق الأمن التي تتدرّب معًا.",
    featured: false,
    inherits: "كل ما في الاحترافي، وفوقه:",
    features: [
      "مساحة عمل مشتركة ولوحة ترتيب للفريق",
      "إسناد العمليات ومتابعة الإنجاز",
      "دخول موحّد وفوترة بالفواتير",
      "مدير حساب مخصّص",
    ],
  },
] as const;

const BILLING_OPTIONS: { id: Billing; label: string }[] = [
  { id: "monthly", label: "شهري" },
  { id: "yearly", label: "سنوي" },
];

/** Reassurance strip under the grid. */
const GUARANTEES = [
  { icon: ShieldCheck, ar: "بيئات معزولة بالكامل" },
  { icon: CreditCard, ar: "بلا بطاقة ائتمان للبدء" },
  { icon: Undo2, ar: "ألغِ متى شئت" },
];

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("yearly");

  return (
    <section id="pricing" className="relative scroll-mt-24 py-16 lg:py-24">
      <div className="mx-auto w-full max-w-[1120px] px-6">
        <SectionHeading
          align="center"
          eyebrow="الأسعار"
          badge={<Pill>قريبًا</Pill>}
          title="ادفع مقابل المدى، لا مقابل الفيديوهات."
          description="كل الخطط تشغّل المختبرات نفسها. الفرق هو حجم الأرشيف الذي تحصل عليه، ومدة بقاء بيئاتك."
        />

        <Reveal delay={0.06}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <div
              role="group"
              aria-label="دورة الفوترة"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] p-1"
            >
              {BILLING_OPTIONS.map((option) => {
                const active = billing === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setBilling(option.id)}
                    className={cn(
                      "rounded-full px-5 py-2 text-[13px] font-bold transition-colors",
                      active
                        ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <span className="text-[13px] font-bold text-[var(--accent)]">
              وفّر حتى 21٪
            </span>
          </div>
        </Reveal>

        <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-3">
          {TIERS.map((tier, i) => {
            const amount = tier[billing];
            const discounted = billing === "yearly" && amount < tier.monthly;
            /* One inverted card in the section — a card in a different colour,
               and it belongs to the tier the page wants you to pick. Every
               value here is a solid token: no `/80` ink, no `/20` rules. Text
               and lines set in alpha are the same glass effect as a tinted
               panel, just at a smaller size. */
            const ink = tier.featured
              ? "text-[var(--accent-foreground)]"
              : "text-[var(--text-primary)]";
            const inkSoft = tier.featured
              ? "text-[var(--accent-foreground-soft)]"
              : "text-[var(--text-secondary)]";
            const rule = tier.featured
              ? "border-[var(--accent-border)]"
              : "border-[var(--border-subtle)]";

            return (
              <Reveal key={tier.name} delay={i * 0.06} className="h-full">
                <article
                  className={cn(
                    "rounded-card relative flex h-full flex-col p-6 sm:p-7",
                    tier.featured ? "card-accent" : "card-noir",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className={cn("text-base font-bold", ink)}>
                      {tier.name}
                    </h3>
                    {tier.featured ? (
                      <span className="rounded-full bg-[var(--accent-foreground)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent)]">
                        الأكثر اختيارًا
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6 flex items-baseline gap-2">
                    {/* Currency + amount read as one LTR unit. */}
                    <span
                      dir="ltr"
                      className={cn(
                        "text-[3rem] leading-none font-bold tracking-[-0.03em]",
                        ink,
                      )}
                    >
                      {`$${amount}`}
                    </span>
                    <span className={cn("text-[13px]", inkSoft)}>
                      {tier.unit}
                    </span>
                  </div>

                  {/* Fixed height so the three cards keep the same rhythm
                      whichever billing cycle is selected. */}
                  <p
                    className={cn(
                      "mt-3 min-h-[1.25rem] text-[12.5px]",
                      tier.featured
                        ? "text-[var(--accent-foreground-soft)]"
                        : "text-[var(--text-muted)]",
                    )}
                  >
                    {tier.monthly === 0 ? (
                      "مجاني دائمًا. بلا بطاقة."
                    ) : discounted ? (
                      <>
                        بدل{" "}
                        <span dir="ltr" className="line-through">
                          {`$${tier.monthly}`}
                        </span>{" "}
                        — تُدفع سنويًا
                      </>
                    ) : (
                      "تُدفع شهريًا. ألغِ متى شئت."
                    )}
                  </p>

                  <p className={cn("mt-4 text-[13px] leading-[1.9]", inkSoft)}>
                    {tier.description}
                  </p>

                  {tier.monthly === 0 ? (
                    <Button
                      asChild
                      className="mt-6 h-11 w-full rounded-lg bg-[var(--accent)] text-sm font-bold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
                    >
                      <a href="#cases">
                        ابدأ مجانًا
                        <ArrowLeft className="size-4" strokeWidth={2} />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      disabled
                      variant="secondary"
                      className={cn(
                        "mt-6 h-11 w-full cursor-not-allowed rounded-lg text-sm font-bold disabled:opacity-100",
                        tier.featured
                          ? "bg-[var(--accent-foreground)] text-[var(--accent)]"
                          : "border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
                      )}
                    >
                      قريبًا
                    </Button>
                  )}

                  <div className={cn("mt-7 border-t pt-5", rule)}>
                    {tier.inherits ? (
                      <p className={cn("text-[12.5px] font-bold", ink)}>
                        {tier.inherits}
                      </p>
                    ) : null}

                    <ul className={cn("space-y-2.5", tier.inherits && "mt-3.5")}>
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex gap-2.5 text-[13px]">
                          <Check
                            className={cn(
                              "mt-1 size-3.5 shrink-0",
                              tier.featured
                                ? "text-[var(--accent-foreground)]"
                                : "text-[var(--accent)]",
                            )}
                            strokeWidth={2.5}
                          />
                          <span className={cn("leading-[1.85]", inkSoft)}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.18}>
          <ul className="panel-noir rounded-card mt-4 grid gap-4 p-5 sm:grid-cols-3">
            {GUARANTEES.map((item) => (
              <li key={item.ar} className="flex items-center gap-3">
                <item.icon
                  className="size-4 shrink-0 text-[var(--accent)]"
                  strokeWidth={1.75}
                />
                <span className="text-[13px] text-[var(--text-secondary)]">
                  {item.ar}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-[13px] leading-[1.9] text-[var(--text-secondary)]">
            الاشتراكات تُفتح قريبًا. حتى ذلك الحين، المختبرات مجانية بالكامل —
            وكلها بيئات معزولة لا يمسّ ما تفعله فيها أي نظام حقيقي.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
