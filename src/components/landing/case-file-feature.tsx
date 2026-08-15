import { MessageSquareQuote, Network, SquareTerminal } from "lucide-react";

import { CaseFileBoard } from "@/components/landing/case-file-board";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/motion/reveal";

/**
 * One accent across all three plates. Colouring each icon separately — cyan,
 * pink, purple — named nothing: the three facets are siblings, not categories,
 * so three colours only asked the reader to look for a difference that was
 * never there.
 */
const FACETS = [
  {
    icon: Network,
    title: "بشر، لا أجهزة فقط",
    copy: "الحجج الغيابية والخطوط الزمنية تضيّق مسار الهجوم قبل أن تلمس أي طرفية.",
  },
  {
    icon: MessageSquareQuote,
    title: "استجوابات تُسرّب",
    copy: "النصوص والمستندات تخفي بيانات اعتماد أمام عينيك — إن أحسنت القراءة.",
  },
  {
    icon: SquareTerminal,
    title: "طرفية تردّ عليك",
    copy: "نظريتك لا بد أن تصمد أمام هدف حقيقي يعمل الآن.",
  },
];

export function CaseFileFeature() {
  return (
    <section className="relative py-16 lg:py-24">
      <div className="mx-auto w-full max-w-[1120px] px-6">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <SectionHeading
            eyebrow="ملف العملية"
            title="تحقيق حقيقي، لا مجرّد طرفية."
            description="العمليات تمزج البشر والقصة والأنظمة. اسحب خيطًا في استجواب فيتغيّر ما تبحث عنه على الشبكة — والعكس صحيح."
          />

          <ul className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
            {FACETS.map((facet, i) => (
              <Reveal
                key={facet.title}
                delay={0.06 * (i + 1)}
                className="h-full"
              >
                <li className="card-noir rounded-card h-full p-5">
                  <div className="flex items-start gap-3.5">
                    {/* Icon plate leads on the right, per the RTL card pattern. */}
                    <span className="icon-tile mt-0.5 size-9 shrink-0 rounded-lg">
                      <facet.icon className="size-4" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {facet.title}
                      </p>
                      <p className="mt-1.5 text-[13px] leading-[1.9] text-[var(--text-secondary)]">
                        {facet.copy}
                      </p>
                    </div>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <CaseFileBoard />
        </div>
      </div>
    </section>
  );
}
