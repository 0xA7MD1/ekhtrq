import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  /** Small accent line above the title. */
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Rendered next to the eyebrow — used for status chips like "قريبًا". */
  badge?: React.ReactNode;
  className?: string;
  align?: "start" | "center";
};

/**
 * Eyebrow, title, description. That is the whole component.
 *
 * It used to also carry an em-dash, a rule running out to the edge and a Latin
 * operations code — three pieces of furniture above every heading on the page,
 * repeated five times. The title is the thing worth looking at, so nothing
 * else competes with it now.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  badge,
  className,
  align = "start",
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <Reveal className={cn(centered && "text-center", className)}>
      <div
        className={cn(
          "flex items-center gap-2.5",
          centered && "justify-center",
        )}
      >
        {/* No letter-spacing on Arabic — tracking breaks the script's joins. */}
        <span className="text-[13px] font-bold text-[var(--accent)]">
          {eyebrow}
        </span>
        {badge}
      </div>

      <h2
        className={cn(
          "mt-3 max-w-2xl text-[2rem] leading-[1.25] font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.75rem]",
          centered && "mx-auto",
        )}
      >
        {title}
      </h2>

      {description ? (
        <p
          className={cn(
            "mt-4 max-w-xl text-[15px] leading-[1.9] text-[var(--text-secondary)]",
            centered && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  );
}
