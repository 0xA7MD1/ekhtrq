import { SiteNav } from "@/components/landing/site-nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CaseFileFeature } from "@/components/landing/case-file-feature";
import { FeaturedCase } from "@/components/landing/featured-case";
import { Pricing } from "@/components/landing/pricing";
import { FinalCta } from "@/components/landing/final-cta";
import { SiteFooter } from "@/components/landing/site-footer";

/**
 * No backdrop layer. The page's background is the one flat `--bg-base` fill on
 * `body`, unbroken from the nav to the footer — no alternating section bands,
 * no gradient, no grain. Every section here is transparent onto it, and every
 * card sits on top as a solid, clearly different colour.
 */
export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <CaseFileFeature />
        <FeaturedCase />
        <Pricing />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
