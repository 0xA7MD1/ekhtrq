import type { LabHost, LabManifest, LabObjective } from "@/lib/labs/schema";
import { displayPath, type FileMap } from "./filesystem";

/**
 * Session state and everything derived from it.
 *
 * The session is the player's whole progress through a case: where they are,
 * who they are, what they've learned. It is plain JSON so it can round-trip
 * through `localStorage` and Postgres without ceremony.
 *
 * All derivation lives here rather than in components, so the Terminal, the
 * Guide and the progress bar can't disagree about what's been unlocked.
 */

/** A command waiting on a second line of input — an `ssh` password prompt. */
export type PendingInput = {
  ruleIndex: number;
  prompt: string;
  masked: boolean;
};

export type SimSession = {
  labId: string;
  hostKey: string;
  /** Per-host user overrides. Absent means the host's declared login user. */
  users: Record<string, string>;
  cwd: string;
  flags: string[];
  /** Objective id → how many of the three guide layers have been opened. */
  hintsUsed: Record<string, number>;
  /** Files picked up during play, per host — downloads, dropped tools, exfil. */
  addedFiles: Record<string, FileMap>;
  /** Hosts whose MOTD has already printed, so it only greets you once. */
  seenMotd: string[];
  pending: PendingInput | null;
  startedAt: string;
  completedAt: string | null;
};

export function startHostKey(manifest: LabManifest): string {
  return manifest.startHost ?? Object.keys(manifest.hosts)[0];
}

export function createSession(manifest: LabManifest): SimSession {
  const hostKey = startHostKey(manifest);

  return {
    labId: manifest.id,
    hostKey,
    users: {},
    cwd: manifest.hosts[hostKey].home,
    flags: [],
    hintsUsed: {},
    addedFiles: {},
    seenMotd: [hostKey],
    pending: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };
}

export function hostOf(manifest: LabManifest, session: SimSession): LabHost {
  return manifest.hosts[session.hostKey];
}

export function currentUser(
  manifest: LabManifest,
  session: SimSession,
  hostKey = session.hostKey,
): string {
  return session.users[hostKey] ?? manifest.hosts[hostKey].user;
}

/**
 * Flags that gates are evaluated against.
 *
 * The current user is published as a flag so a manifest can write
 * `"done": "root"` and `"requires": "root"` without a second gating concept.
 */
export function activeFlags(
  manifest: LabManifest,
  session: SimSession,
): Set<string> {
  const flags = new Set(session.flags);
  flags.add(currentUser(manifest, session));
  return flags;
}

export function hasFlags(
  manifest: LabManifest,
  session: SimSession,
  required: string[],
): boolean {
  if (required.length === 0) return true;
  const flags = activeFlags(manifest, session);
  return required.every((flag) => flags.has(flag));
}

/** Authored files for a host, overlaid with anything gained during play. */
export function hostFiles(
  manifest: LabManifest,
  session: SimSession,
  hostKey = session.hostKey,
): FileMap {
  return {
    ...manifest.hosts[hostKey].filesystem,
    ...(session.addedFiles[hostKey] ?? {}),
  };
}

/** Fills `{user}` `{host}` `{cwd}` `{sigil}` in the host's prompt template. */
export function renderPrompt(
  manifest: LabManifest,
  session: SimSession,
): string {
  const host = hostOf(manifest, session);
  const user = currentUser(manifest, session);

  return host.prompt
    .replaceAll("{user}", user)
    .replaceAll("{host}", host.hostname)
    .replaceAll("{cwd}", displayPath(session.cwd, host.home))
    .replaceAll("{sigil}", user === "root" ? "#" : "$");
}

export type ObjectiveState = LabObjective & {
  done: string;
  complete: boolean;
  active: boolean;
};

/**
 * Objectives in order, each resolved against the flags held.
 *
 * The active objective is the first incomplete one — it drives the progress
 * bar, the top-bar chip and which entry the Guide opens on. Objectives can
 * complete out of order (a player may stumble into loot early); only the
 * "active" pointer assumes a sequence.
 */
export function objectiveStates(
  manifest: LabManifest,
  session: SimSession,
): ObjectiveState[] {
  const flags = activeFlags(manifest, session);
  let activeAssigned = false;

  return manifest.objectives.map((objective) => {
    const complete = flags.has(objective.done);
    const active = !complete && !activeAssigned;
    if (active) activeAssigned = true;
    return { ...objective, complete, active };
  });
}

export function activeObjective(
  manifest: LabManifest,
  session: SimSession,
): ObjectiveState | undefined {
  const states = objectiveStates(manifest, session);
  return states.find((state) => state.active) ?? states.at(-1);
}

export function progressRatio(
  manifest: LabManifest,
  session: SimSession,
): number {
  const states = objectiveStates(manifest, session);
  if (states.length === 0) return 0;
  return states.filter((state) => state.complete).length / states.length;
}

export function isComplete(
  manifest: LabManifest,
  session: SimSession,
): boolean {
  return activeFlags(manifest, session).has(manifest.completion.trigger);
}

export function totalHintsUsed(session: SimSession): number {
  return Object.values(session.hintsUsed).reduce((sum, n) => sum + n, 0);
}
