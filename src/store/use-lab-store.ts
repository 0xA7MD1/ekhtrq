import { create } from "zustand";

import type { LabDownload, LabManifest } from "@/lib/labs/schema";
import {
  adoptLines,
  applyDownload,
  findDownload,
  findSite,
  looksLikeUrl,
  makeLine,
  matchSearch,
  runCommand,
  type TerminalLine,
} from "@/lib/sim/engine";
import {
  createSession,
  hasFlags,
  isComplete,
  objectiveStates,
  renderPrompt,
  type SimSession,
} from "@/lib/sim/session";

/**
 * The player's session for the case currently open.
 *
 * The whole simulation lives here, in the browser. Commands resolve against
 * the manifest with no round trip, which is both why the terminal feels
 * instant and why the platform costs nothing to run — no serverless function
 * does any work while a case is being played.
 *
 * Progress is written to `localStorage` for everyone and mirrored to Postgres
 * for signed-in players. The local copy is the source of truth during play;
 * the server copy exists so progress survives a new device.
 */

const STORAGE_PREFIX = "akhtiraq:case:";
const STORAGE_VERSION = 1;
const SCROLLBACK_LIMIT = 400;
/** Per-line reveal delay when a rule asks to stream — scans shouldn't blink in. */
const STREAM_INTERVAL_MS = 45;

type SearchResult = { title: string; url: string; snippet?: string; badge?: string };

export type Toast = { id: string; title: string; body?: string };

type PersistedLab = {
  v: number;
  session: SimSession;
  scrollback: TerminalLine[];
};

type BrowserView =
  | { kind: "blank" }
  | { kind: "results"; query: string; results: SearchResult[] }
  | { kind: "noResults"; query: string }
  | { kind: "site"; url: string }
  | { kind: "offline"; url: string };

type LabState = {
  manifest: LabManifest | null;
  session: SimSession | null;
  scrollback: TerminalLine[];
  /** A command is mid-flight; the terminal locks its input while true. */
  busy: boolean;
  toasts: Toast[];

  browser: BrowserView;
  browserInput: string;
  browserHistory: BrowserView[];

  /** Whether the signed-in mirror is available; probed once at init. */
  remote: "unknown" | "on" | "off";

  init: (manifest: LabManifest) => void;
  submit: (input: string) => Promise<void>;
  reset: () => void;

  revealHint: (objectiveId: string) => void;

  navigate: (input: string) => void;
  goHome: () => void;
  back: () => void;
  setBrowserInput: (value: string) => void;
  download: (download: LabDownload) => void;

  dismissToast: (id: string) => void;
};

function storageKey(labId: string) {
  return `${STORAGE_PREFIX}${labId}`;
}

function loadLocal(labId: string): PersistedLab | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(labId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedLab;
    if (parsed.v !== STORAGE_VERSION || parsed.session?.labId !== labId) {
      return null;
    }
    return parsed;
  } catch {
    // A corrupt or half-written entry should cost the player a fresh start,
    // never a crashed desktop.
    return null;
  }
}

function saveLocal(labId: string, data: PersistedLab) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(labId), JSON.stringify(data));
  } catch {
    // Private mode, quota — play continues, only durability is lost.
  }
}

let syncTimer: ReturnType<typeof setTimeout> | undefined;

/** Debounced mirror to Postgres. Silently inert for guests. */
function scheduleSync(get: () => LabState) {
  if (typeof window === "undefined") return;
  clearTimeout(syncTimer);

  syncTimer = setTimeout(() => {
    const { session, remote } = get();
    if (!session || remote === "off") return;

    void fetch("/api/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ labId: session.labId, session }),
    }).catch(() => {
      // Progress is already safe in localStorage; a failed mirror is not worth
      // interrupting a case for.
    });
  }, 2_000);
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const useLabStore = create<LabState>((set, get) => ({
  manifest: null,
  session: null,
  scrollback: [],
  busy: false,
  toasts: [],
  browser: { kind: "blank" },
  browserInput: "",
  browserHistory: [],
  remote: "unknown",

  init: (manifest) => {
    const restored = loadLocal(manifest.id);
    const session = restored?.session ?? createSession(manifest);

    set({
      manifest,
      session,
      // Restored lines are re-keyed rather than trusted: their ids came from a
      // page load that no longer exists, and the counter minting new ones has
      // already gone back to zero.
      scrollback: restored?.scrollback
        ? adoptLines(restored.scrollback)
        : [
            makeLine("notice", `${manifest.hosts[session.hostKey].motd ?? ""}`),
            makeLine("notice", "Type `help` for available commands."),
          ].filter((line) => line.text !== ""),
      busy: false,
      browser: { kind: "blank" },
      browserHistory: [],
      browserInput: "",
    });

    // Pull the server copy once. It only wins when it is strictly further
    // along, so an out-of-date device can't roll a player backwards.
    void fetch(`/api/progress?labId=${encodeURIComponent(manifest.id)}`)
      .then(async (response) => {
        if (response.status === 204 || response.status === 401) {
          set({ remote: "off" });
          return;
        }
        if (!response.ok) return;

        const data = (await response.json()) as { session?: SimSession };
        set({ remote: "on" });

        const current = get().session;
        if (!data.session || !current) return;
        if (data.session.flags.length > current.flags.length) {
          set({ session: data.session });
          saveLocal(manifest.id, {
            v: STORAGE_VERSION,
            session: data.session,
            scrollback: get().scrollback,
          });
        }
      })
      .catch(() => set({ remote: "off" }));
  },

  submit: async (input) => {
    const { manifest, session, busy } = get();
    if (!manifest || !session || busy) return;

    const pending = session.pending;
    const promptText = pending?.prompt ?? renderPrompt(manifest, session);
    // Real `ssh` echoes nothing while a password is typed — accurate, and it
    // keeps the secret out of anything we persist.
    const echoText = pending?.masked ? "" : input;

    const before = objectiveStates(manifest, session);

    set({
      busy: true,
      scrollback: [
        ...get().scrollback,
        makeLine("input", echoText, promptText),
      ],
    });

    const outcome = runCommand(manifest, session, input);

    if (outcome.delayMs > 0) await sleep(outcome.delayMs);

    if (outcome.clear) set({ scrollback: [] });

    if (outcome.stream) {
      for (const line of outcome.lines) {
        set({ scrollback: [...get().scrollback, line] });
        await sleep(STREAM_INTERVAL_MS);
      }
    } else if (outcome.lines.length > 0) {
      set({ scrollback: [...get().scrollback, ...outcome.lines] });
    }

    const after = objectiveStates(manifest, outcome.session);
    const finished = after.filter(
      (state, index) => state.complete && !before[index].complete,
    );

    const extra: TerminalLine[] = [];
    if (finished.length > 0) {
      const total = after.length;
      const done = after.filter((state) => state.complete).length;
      extra.push(makeLine("success", `[+] objective complete — ${done}/${total}`));
    }

    const nowComplete =
      isComplete(manifest, outcome.session) && !isComplete(manifest, session);

    set((state) => ({
      session: {
        ...outcome.session,
        completedAt: nowComplete
          ? new Date().toISOString()
          : outcome.session.completedAt,
      },
      scrollback: [...state.scrollback, ...extra].slice(-SCROLLBACK_LIMIT),
      busy: false,
      toasts: [
        ...state.toasts,
        ...finished.map((objective) => ({
          id: `${objective.id}-${Date.now()}`,
          title: "تم إنجاز هدف",
          body: objective.title,
        })),
      ],
    }));

    const next = get();
    if (next.session) {
      saveLocal(manifest.id, {
        v: STORAGE_VERSION,
        session: next.session,
        scrollback: next.scrollback,
      });
      scheduleSync(get);
    }
  },

  reset: () => {
    const { manifest } = get();
    if (!manifest) return;

    const session = createSession(manifest);
    const motd = manifest.hosts[session.hostKey].motd;

    set({
      session,
      scrollback: [
        ...(motd ? [makeLine("notice", motd)] : []),
        makeLine("notice", "Type `help` for available commands."),
      ],
      busy: false,
      browser: { kind: "blank" },
      browserHistory: [],
      browserInput: "",
      toasts: [],
    });

    saveLocal(manifest.id, {
      v: STORAGE_VERSION,
      session,
      scrollback: get().scrollback,
    });
    scheduleSync(get);
  },

  revealHint: (objectiveId) => {
    const { manifest, session } = get();
    if (!manifest || !session) return;

    const used = session.hintsUsed[objectiveId] ?? 0;
    if (used >= 3) return;

    const next: SimSession = {
      ...session,
      hintsUsed: { ...session.hintsUsed, [objectiveId]: used + 1 },
    };

    set({ session: next });
    saveLocal(manifest.id, {
      v: STORAGE_VERSION,
      session: next,
      scrollback: get().scrollback,
    });
    scheduleSync(get);
  },

  setBrowserInput: (browserInput) => set({ browserInput }),

  navigate: (input) => {
    const { manifest, session, browser } = get();
    if (!manifest || !session) return;

    const value = input.trim();
    if (value === "") return;

    const pushHistory = (view: BrowserView) =>
      set((state) => ({
        browser: view,
        browserHistory: [...state.browserHistory, browser].slice(-30),
      }));

    const page = findSite(manifest, value);
    if (page && hasFlags(manifest, session, page.site.requires)) {
      pushHistory({ kind: "site", url: page.url });
      set({ browserInput: page.url });

      if (page.site.unlocks.length > 0) {
        const gained = page.site.unlocks.filter(
          (flag) => !session.flags.includes(flag),
        );
        if (gained.length > 0) {
          const next: SimSession = {
            ...session,
            flags: [...session.flags, ...gained],
          };
          set({ session: next });
          saveLocal(manifest.id, {
            v: STORAGE_VERSION,
            session: next,
            scrollback: get().scrollback,
          });
          scheduleSync(get);
        }
      }
      return;
    }

    // A URL that doesn't resolve is a dead host, not a search.
    if (page || looksLikeUrl(value)) {
      pushHistory({ kind: "offline", url: value });
      return;
    }

    const results = matchSearch(manifest, value);
    pushHistory(
      results
        ? { kind: "results", query: value, results }
        : { kind: "noResults", query: value },
    );
  },

  goHome: () =>
    set((state) => ({
      browser: { kind: "blank" },
      browserInput: "",
      browserHistory: [...state.browserHistory, state.browser].slice(-30),
    })),

  back: () =>
    set((state) => {
      const previous = state.browserHistory.at(-1);
      if (!previous) return state;
      return {
        browser: previous,
        browserHistory: state.browserHistory.slice(0, -1),
        browserInput: previous.kind === "site" ? previous.url : "",
      };
    }),

  download: (download) => {
    const { manifest, session } = get();
    if (!manifest || !session) return;
    if (!hasFlags(manifest, session, download.requires)) return;

    const applied = applyDownload(manifest, session, download);
    const before = objectiveStates(manifest, session);
    const after = objectiveStates(manifest, applied.session);
    const finished = after.filter(
      (state, index) => state.complete && !before[index].complete,
    );

    set((state) => ({
      session: applied.session,
      scrollback: [
        ...state.scrollback,
        makeLine("notice", `[downloaded] ${applied.savedTo}`),
      ].slice(-SCROLLBACK_LIMIT),
      toasts: [
        ...state.toasts,
        {
          id: `dl-${Date.now()}`,
          title: "تم تنزيل ملف",
          body: applied.savedTo,
        },
        ...finished.map((objective) => ({
          id: `${objective.id}-${Date.now()}`,
          title: "تم إنجاز هدف",
          body: objective.title,
        })),
      ],
    }));

    saveLocal(manifest.id, {
      v: STORAGE_VERSION,
      session: applied.session,
      scrollback: get().scrollback,
    });
    scheduleSync(get);
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

/** Resolves a URL string to a declared download, for the Browser's buttons. */
export function downloadFor(manifest: LabManifest, url: string) {
  return findDownload(manifest, url);
}
