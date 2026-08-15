import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

/**
 * Three steps, and the middle one is filled solid with the accent — a card in
 * a different colour, not a tinted pane of the same one.
 *
 * The previous version gave each card its own tone — blue, purple, green — on
 * an icon plate, plus a step number ghosted at 5% opacity in the corner. That
 * is three colours that mean nothing and a number nobody can read. Now the
 * number *is* the card's mark, and colour is spent once, on the step that
 * matters.
 */
const STEPS = [
  {
    step: "01",
    title: "اختر عملية",
    copy: "افتح الملف: هدف، وخط زمني، وسؤال يستحق أن تجد له جوابًا.",
    featured: false,
  },
  {
    step: "02",
    title: "حقّق واستغلّ",
    copy: "استجوب المشتبه بهم، وارسم خريطة الشبكة، ونفّذ الاستغلال في مختبرك الحيّ. هنا تُقضى معظم الساعات.",
    featured: true,
  },
  {
    step: "03",
    title: "التقط العلَم",
    copy: "سلّم العلَم والتقرير الذي يثبت كيف دخلت بالضبط.",
    featured: false,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-24 py-16 lg:py-24"
    >
      <div className="mx-auto w-full max-w-[1120px] px-6">
        <SectionHeading
          eyebrow="كيف يعمل"
          title="ثلاث خطوات من الملف إلى الاختراق."
          description="كل عملية تسير على مسار العمل الهجومي الحقيقي — استطلاع، ثم وصول، ثم إثبات."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.step} delay={i * 0.06} className="h-full">
              <article
                className={cn(
                  "rounded-card h-full p-6 sm:p-7",
                  step.featured ? "card-accent" : "card-noir",
                )}
              >
                <span
                  dir="ltr"
                  className={cn(
                    "block font-mono text-[2.5rem] leading-none font-bold tracking-[-0.02em]",
                    step.featured
                      ? "text-[var(--accent-foreground)]"
                      : "text-[var(--accent)]",
                  )}
                >
                  {step.step}
                </span>

                <h3
                  className={cn(
                    "mt-8 text-lg font-bold",
                    step.featured
                      ? "text-[var(--accent-foreground)]"
                      : "text-[var(--text-primary)]",
                  )}
                >
                  {step.title}
                </h3>
                <p
                  className={cn(
                    "mt-3 text-sm leading-[1.9]",
                    // A solid darker green, not the title colour at 80%. Text
                    // set in alpha over a fill is the same effect the rest of
                    // the page just had removed.
                    step.featured
                      ? "text-[var(--accent-foreground-soft)]"
                      : "text-[var(--text-secondary)]",
                  )}
                >
                  {step.copy}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
