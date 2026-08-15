import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Difficulty lives on its own scale (grey / gold / red) because green is the
 * brand accent — a green "easy" chip would read as a call to action.
 */
export type PillTone =
  | "accent"
  | "gold"
  | "easy"
  | "medium"
  | "hard"
  | "info"
  | "blue"
  | "purple"
  | "cyan"
  | "orange"
  | "pink"
  | "neutral";

const TONE: Record<PillTone, string> = {
  accent: "var(--accent)",
  gold: "var(--gold)",
  easy: "var(--diff-easy)",
  medium: "var(--diff-medium)",
  hard: "var(--diff-hard)",
  info: "var(--info)",
  blue: "var(--tone-blue)",
  purple: "var(--tone-purple)",
  cyan: "var(--tone-cyan)",
  orange: "var(--tone-orange)",
  pink: "var(--tone-pink)",
  neutral: "var(--text-secondary)",
};

type PillProps = {
  children: React.ReactNode;
  tone?: PillTone;
  icon?: LucideIcon;
  className?: string;
};

/**
 * Solid status chip: an opaque tinted fill, an opaque border, text at full
 * tone.
 *
 * Both mixes land on `--bg-elevated` rather than on `transparent`. A chip
 * mixed with transparent is a tinted pane — it shows whatever is behind it and
 * changes colour depending on where it lands, which is exactly the glass
 * effect this design avoids. Mixed with a solid colour it is one fixed,
 * opaque chip that sits above any surface it is dropped on.
 */
export function Pill({
  children,
  tone = "neutral",
  icon: Icon,
  className,
}: PillProps) {
  return (
    <span
      style={{ "--tone": TONE[tone] } as React.CSSProperties}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
        "border-[color-mix(in_srgb,var(--tone)_50%,var(--bg-elevated))] bg-[color-mix(in_srgb,var(--tone)_14%,var(--bg-elevated))] text-[var(--tone)]",
        className,
      )}
    >
      {Icon ? <Icon className="size-3" strokeWidth={1.5} /> : null}
      {children}
    </span>
  );
}
