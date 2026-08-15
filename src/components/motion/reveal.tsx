"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds to wait after the trigger fires — use to stagger siblings. */
  delay?: number;
  /** Pixels to travel upward into place. */
  y?: number;
  /** Fraction of the viewport height at which the element starts animating. */
  start?: string;
};

/**
 * Fades and lifts its content into view once, on scroll.
 *
 * Elements carry `data-reveal`, which globals.css uses to hide them until
 * GSAP takes over. Under `prefers-reduced-motion: reduce` that rule is
 * inactive and this component leaves the DOM untouched.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  start = "top 85%",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.fromTo(
        ref.current,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay,
          ease: "power2.out",
          scrollTrigger: { trigger: ref.current, start, once: true },
        },
      );
    },
    { scope: ref, dependencies: [delay, y, start] },
  );

  return (
    <div ref={ref} data-reveal className={cn(className)}>
      {children}
    </div>
  );
}
