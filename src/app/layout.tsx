import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";

import { Providers } from "@/components/providers";
import { env } from "@/lib/env";
import "./globals.css";

// Neither IBM Plex family is variable, so weights are requested explicitly.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Monospace is reserved for terminal UI — never for body copy.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "اخترق — تعلّم الاختراق. على الحقيقة.",
    template: "%s — اخترق",
  },
  description:
    "«اخترق» يعلّمك الأمن الهجومي عبر قضايا عملية. أهداف حقيقية، واستغلال حقيقي، ودليل تلتقطه بنفسك — لا دورة فيديو أخرى.",
  keywords: [
    "الأمن الهجومي",
    "الاختراق الأخلاقي",
    "اختبار الاختراق",
    "تدريب أمن سيبراني",
    "مختبرات أمنية",
    "CTF",
  ],
  openGraph: {
    type: "website",
    siteName: "اخترق",
    locale: "ar_SA",
    title: "اخترق — تعلّم الاختراق. على الحقيقة.",
    description:
      "قضايا أمن هجومي عملية. تحقّق، واستغلّ الثغرة، والتقط الدليل داخل مختبرات تعمل في متصفحك.",
    url: env.siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "اخترق — تعلّم الاختراق. على الحقيقة.",
    description:
      "قضايا أمن هجومي عملية. تحقّق، واستغلّ الثغرة، والتقط الدليل داخل مختبرات تعمل في متصفحك.",
  },
};

export const viewport: Viewport = {
  themeColor: "#080c12",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      // `dark` keeps shadcn's dark: variants resolving; the site has no light mode.
      className={`dark ${plexArabic.variable} ${plexMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      {/* Extensions (ColorZilla, Grammarly, …) inject attributes on <body> before
          hydration; suppress the resulting mismatch warning on this element only. */}
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col bg-background text-foreground"
      >
        <noscript>
          {/* Scroll reveals start hidden — show everything when JS is off. */}
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
