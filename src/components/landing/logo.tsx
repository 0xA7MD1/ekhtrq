import Image from "next/image";

import logoMark from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src={logoMark}
      alt=""
      aria-hidden="true"
      // Rendered at 40px — the emblem's detail turns to mush much below that.
      // 80 keeps it sharp on 2x screens without shipping the 1920px master.
      // (`priority` is deprecated in Next 16; eager loading is enough here.)
      width={80}
      height={80}
      loading="eager"
      className={cn("size-10 shrink-0 select-none", className)}
    />
  );
}

/**
 * The emblem blown up as a background graphic. Rendered from the same 1920px
 * master, so the detail survives at hero scale — the caller sets the size and
 * opacity.
 */
export function LogoWatermark({ className }: { className?: string }) {
  return (
    <Image
      src={logoMark}
      alt=""
      aria-hidden="true"
      width={512}
      height={512}
      loading="lazy"
      className={cn("select-none", className)}
    />
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[1.125rem] font-bold text-[var(--text-primary)]">
        اخترق
      </span>
    </span>
  );
}
