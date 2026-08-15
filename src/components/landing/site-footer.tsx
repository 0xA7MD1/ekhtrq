import Link from "next/link";

import { Logo } from "@/components/landing/logo";

const COLUMNS = [
  {
    title: "المنتج",
    code: "PRODUCT",
    links: [
      { label: "كيف يعمل", href: "#how-it-works" },
      { label: "العمليات", href: "#cases" },
      { label: "الأسعار", href: "#pricing" },
    ],
  },
  {
    title: "الشركة",
    code: "COMPANY",
    links: [
      { label: "من نحن", href: "#" },
      { label: "الوظائف", href: "#" },
      { label: "تواصل معنا", href: "#" },
    ],
  },
  {
    title: "قانوني",
    code: "LEGAL",
    links: [
      { label: "الشروط", href: "#" },
      { label: "الخصوصية", href: "#" },
      { label: "الاستخدام المسؤول", href: "#" },
    ],
  },
];

export function SiteFooter() {
  return (
    // No band. The background runs one colour all the way down, so the footer
    // is marked by a rule and nothing else.
    <footer className="border-t border-[var(--border-subtle)]">
      <div className="mx-auto w-full max-w-[1120px] px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_repeat(3,1fr)]">
          <div>
            <Link href="/" aria-label="اخترق — الصفحة الرئيسية">
              <Logo />
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-[1.9] text-[var(--text-secondary)]">
              تدريب عملي على الأمن الهجومي. كل مختبر بيئة معزولة — اكسرها كما
              تشاء.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              {/* Just the label. The rule that used to run out from it was one
                  more line on a page that had too many. */}
              <p className="text-[11px] font-bold text-[var(--text-primary)]">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-[var(--border-subtle)] pt-6">
          <p className="text-xs text-[var(--text-secondary)]">
            © {new Date().getFullYear()} اخترق. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
}
