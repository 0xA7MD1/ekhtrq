import fs from "node:fs";
import path from "node:path";

import { parseLabManifest, type LabManifest } from "./schema";

/**
 * Loads case manifests off disk.
 *
 * Server-only — it touches `node:fs`, so importing it from a Client Component
 * fails the build by design. The route reads a manifest here, validates it,
 * and hands the plain object to the client player as a prop. That is the only
 * crossing: once the desktop mounts, the entire simulation runs in the browser
 * and no request touches a server again.
 *
 * Discovery is a directory read rather than a hand-maintained index so that
 * adding a case really is "drop in a JSON file". Every read happens during
 * `generateStaticParams` / prerender at build time, so nothing here runs in a
 * serverless function at request time.
 */

const CASES_DIR = path.join(process.cwd(), "src", "cases");

export type CaseSummary = Pick<
  LabManifest,
  "id" | "title" | "difficulty" | "isFree" | "estimatedMinutes" | "skills"
> & { tagline?: string; objectiveCount: number };

function readManifestFile(slug: string): LabManifest {
  const file = path.join(CASES_DIR, `${slug}.json`);
  const raw = fs.readFileSync(file, "utf8");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Case "${slug}" is not valid JSON: ${(error as Error).message}`,
    );
  }

  const manifest = parseLabManifest(json);

  // The filename is the URL. Letting them drift would 404 a case that loads
  // fine in every other respect, which is a miserable thing to debug.
  if (manifest.id !== slug) {
    throw new Error(
      `Case file "${slug}.json" declares id "${manifest.id}". They must match.`,
    );
  }

  return manifest;
}

/** Slugs of every case on disk, sorted so `01-` comes before `02-`. */
export function listCaseSlugs(): string[] {
  if (!fs.existsSync(CASES_DIR)) return [];

  return fs
    .readdirSync(CASES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();
}

/** Returns `null` for an unknown slug so routes can `notFound()` cleanly. */
export function getCase(slug: string): LabManifest | null {
  if (!listCaseSlugs().includes(slug)) return null;
  return readManifestFile(slug);
}

/**
 * Validates every case and returns card-sized summaries. The catalog UI isn't
 * built yet; this is the seam it will use, and running it in CI is the cheapest
 * way to catch a broken manifest before a player finds it.
 */
export function listCases(): CaseSummary[] {
  return listCaseSlugs().map((slug) => {
    const manifest = readManifestFile(slug);
    return {
      id: manifest.id,
      title: manifest.title,
      difficulty: manifest.difficulty,
      isFree: manifest.isFree,
      estimatedMinutes: manifest.estimatedMinutes,
      skills: manifest.skills,
      tagline: manifest.tagline,
      objectiveCount: manifest.objectives.length,
    };
  });
}
