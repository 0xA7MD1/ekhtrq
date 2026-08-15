"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/landing/logo";
import { useUiStore } from "@/store/use-ui-store";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#how-it-works", label: "كيف يعمل" },
  { href: "#cases", label: "العمليات" },
  { href: "#pricing", label: "الأسعار" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        // Solid at every scroll position. A translucent blurred bar over a lit
        // backdrop is the single worst offender for a page that reads as
        // see-through — the chrome has to be an object, not a filter.
        "sticky top-0 z-50 w-full border-b bg-[var(--bg-base)] transition-[border-color,box-shadow] duration-300",
        scrolled
          ? "border-[var(--border-strong)] shadow-[0_10px_24px_-16px_rgba(0,0,0,1)]"
          : "border-[var(--border-subtle)]",
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between px-6">
        <Link
          href="/"
          aria-label="اخترق — الصفحة الرئيسية"
          className="shrink-0"
        >
          <Logo />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="hidden h-10 rounded-lg bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] sm:inline-flex"
          >
            <a href="#pricing">ابدأ الاختراق</a>
          </Button>

          <button
            type="button"
            onClick={toggleMobileNav}
            aria-expanded={mobileNavOpen}
            aria-label="فتح القائمة"
            className="inline-flex size-10 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors hover:border-[var(--text-muted)] md:hidden"
          >
            {mobileNavOpen ? (
              <X className="size-5" strokeWidth={1.5} />
            ) : (
              <Menu className="size-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </nav>

      {mobileNavOpen ? (
        // The dropped panel is an object over the page, so it takes the card
        // fill — never the page's own colour.
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] md:hidden">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-1 px-6 py-4">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                {link.label}
              </a>
            ))}
            <Button
              asChild
              className="mt-2 h-10 rounded-lg bg-[var(--accent)] text-sm font-bold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)] sm:hidden"
            >
              <a href="#pricing" onClick={() => setMobileNavOpen(false)}>
                ابدأ الاختراق
              </a>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
