import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";

/**
 * The closing shot, and the one section that is a panel rather than a stretch
 * of page. The site's background is a single flat colour everywhere, so a
 * section can no longer set itself apart with a band — it does it by being a
 * solid object on that background, like every card above it.
 */
export function FinalCta() {
  return (
    <section className="relative px-6 py-16 lg:py-24">
      <div className="panel-noir rounded-card relative mx-auto w-full max-w-[1120px] px-6 py-16 text-center lg:py-20">
        <Reveal>
          {/* Solid dark-green chip. `--accent-fill` is an opaque colour now,
              not a 12% wash of the accent over whatever is behind it. */}
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-fill)] px-3 py-1.5 text-[12.5px] font-bold text-[var(--accent)]">
            <span className="size-1.5 rounded-full bg-[var(--accent)]" />
            المختبر يعمل
          </span>
        </Reveal>

        <Reveal delay={0.06}>
          <h2 className="mx-auto mt-6 max-w-3xl text-[2.25rem] leading-[1.2] font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[3.25rem]">
            المختبر يعمل الآن.
            <br />
            عمليتك الأولى بانتظارك.
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-5 max-w-lg text-base leading-[1.95] text-[var(--text-secondary)]">
            شغّل بيئة خلال ثوانٍ، وانظر إلى أي مدى تصل قبل أن تحتاج تلميحًا.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              className="h-12 rounded-lg bg-[var(--accent)] px-6 text-[0.9375rem] font-bold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]"
            >
              <a href="#pricing">
                ابدأ الاختراق
                <ArrowLeft className="size-4" strokeWidth={2} />
              </a>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="h-12 rounded-lg bg-[var(--paper)] px-6 text-[0.9375rem] font-bold text-[var(--paper-foreground)] hover:bg-[var(--paper-hover)]"
            >
              <a href="#cases">تصفّح العمليات</a>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mt-7 text-[13px] text-[var(--text-secondary)]">
            خطة مجانية. بلا بطاقة ائتمان.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
