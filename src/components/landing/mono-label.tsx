import { cn } from "@/lib/utils";

type MonoLabelProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Tiny tracked-out Latin label — the counterweight to the heavy Arabic
 * display type. Always uppercase, always LTR, even inside the RTL page.
 *
 * Copy here speaks operations, not forensics: `OPS. 07 — INTRUSION`,
 * `LAB ARCHIVE`, `6 FLAGS · 3 HOSTS`, `SCOPE: AUTHORIZED`.
 */
export function MonoLabel({ children, className }: MonoLabelProps) {
  return (
    <span className={cn("mono-label text-[11px]", className)}>{children}</span>
  );
}
