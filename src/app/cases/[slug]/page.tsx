import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Desktop } from "@/components/desktop/desktop";
import { getCase, listCaseSlugs } from "@/lib/labs/registry";

/**
 * A case runs at its own route. The manifest is read and validated here — on
 * the server, at build time — then handed to the client `Desktop` as a plain
 * prop. That is the whole server involvement: no request touches a function
 * once the desktop mounts, which is what keeps the simulation instant and free
 * to host.
 */

// Prerender every case on disk. Adding one is still just a new JSON file.
export function generateStaticParams() {
  return listCaseSlugs().map((slug) => ({ slug }));
}

// A slug not on disk is a real 404, not a runtime-rendered empty case.
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: PageProps<"/cases/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const manifest = getCase(slug);
  if (!manifest) return {};

  return {
    title: manifest.title,
    description: manifest.tagline ?? manifest.intro.headline,
  };
}

export default async function CasePage({ params }: PageProps<"/cases/[slug]">) {
  const { slug } = await params;
  const manifest = getCase(slug);
  if (!manifest) notFound();

  return <Desktop manifest={manifest} />;
}
