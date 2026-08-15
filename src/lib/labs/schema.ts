import { z } from "zod";

import { BUILTIN_NAMES, TOOLBOX } from "./tools";

/**
 * The lab manifest — the entire contract between content and engine.
 *
 * Everything a case does lives in one JSON file validated against this schema.
 * The player components know nothing about any specific case: they read hosts,
 * terminal rules, sites and objectives from here and nowhere else. Adding a
 * case is dropping a file into `src/cases/`; it is never a code change.
 *
 * Two conventions run through the whole schema:
 *
 * 1. **Flags are the only state.** A session holds a `Set<string>`. `unlocks`
 *    adds flags, `requires` gates on them. That single mechanism enforces the
 *    linear-but-earned path — you cannot crack a hash you never downloaded.
 * 2. **Scalar-or-list everywhere.** `"unlocks": "x"` and `"unlocks": ["x","y"]`
 *    both parse, so simple content stays terse. The engine always sees a list.
 */

/** Accepts `"a"` or `["a","b"]`; the engine only ever sees `string[]`. */
const stringList = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (typeof value === "string" ? [value] : value));

/** Same, but defaulting to empty so callers never branch on `undefined`. */
const optionalStringList = stringList.default([]);

export const FILE_KINDS = ["text", "hex", "image", "binary"] as const;

/**
 * A file in a host's virtual filesystem.
 *
 * Directories are never declared — they are inferred from the path keys, so
 * `"/home/guest/notes.txt"` implicitly creates `/`, `/home` and `/home/guest`.
 * That keeps manifests flat and impossible to get structurally wrong.
 */
const fileNodeObject = z.object({
  content: z.string().default(""),
  /**
   * User required to read this file. `"root"` makes `cat` return a permission
   * error until a privesc rule sets the session user — this is how loot stays
   * locked behind escalation without the engine knowing what loot is.
   */
  locked: z.string().optional(),
  /** Dotfile behaviour: excluded from `ls`, shown by `ls -a`. */
  hidden: z.boolean().default(false),
  /** Offered as a download in the Files app viewer. */
  downloadable: z.boolean().default(false),
  kind: z.enum(FILE_KINDS).default("text"),
  /** Optional human label shown in the Files app instead of the basename. */
  label: z.string().optional(),
  /** Flags added the first time the player opens this file in Files. */
  unlocks: optionalStringList,
});

export type FileNode = z.infer<typeof fileNodeObject>;

/** `"/etc/passwd": "root:x:0:0"` is shorthand for `{ content: "root:x:0:0" }`. */
const fileNodeSchema = z
  .union([z.string(), fileNodeObject])
  .transform((value): FileNode =>
    typeof value === "string" ? fileNodeObject.parse({ content: value }) : value,
  );

const filesystemSchema = z.record(z.string(), fileNodeSchema).default({});

/**
 * A machine the player can be sitting at. Each host owns its own filesystem
 * and prompt, so `ssh`-ing somewhere genuinely changes what `ls` returns.
 */
const hostSchema = z.object({
  hostname: z.string(),
  /** Login user on arrival. A privesc rule can raise it to `root` later. */
  user: z.string(),
  home: z.string().default("/"),
  /**
   * Prompt template. Tokens: `{user}`, `{host}`, `{cwd}`, `{sigil}` — where
   * sigil is `#` for root and `$` otherwise, the way a real shell signals it.
   *
   * A literal string with no tokens is used verbatim, but then it cannot
   * reflect a privesc, so prefer the template form.
   */
  prompt: z.string().default("{user}@{host}:{cwd}{sigil}"),
  /** Flags required before this host is reachable at all. */
  requires: optionalStringList,
  /** Banner printed once on arrival — the login MOTD. */
  motd: z.string().optional(),
  filesystem: filesystemSchema,
});

export type LabHost = z.infer<typeof hostSchema>;

/**
 * What a matched command does to the session, beyond printing text.
 * Every field is optional: most rules only print.
 */
const effectSchema = z.object({
  /** Flags to add. `unlocks` on the rule is the shorthand for the common case. */
  setState: optionalStringList,
  switchHost: z.string().optional(),
  /** Typically `"root"` — drives the prompt sigil and unlocks `locked` files. */
  setUser: z.string().optional(),
  setCwd: z.string().optional(),
  /** Printed after the rule's own `output`. */
  output: z.string().optional(),
  /** Files written into a host's filesystem (exfil, dropped tools, loot). */
  addFiles: filesystemSchema,
  /**
   * Which host receives `addFiles`. Defaults to whichever host is active once
   * the effect resolves, so a rule that also switches hosts drops its files on
   * the machine you arrive at. Set this when you need the other one — `scp`
   * pulling loot back to the local box while you stay logged in.
   */
  addFilesTo: z.string().optional(),
});

export type LabEffect = z.infer<typeof effectSchema>;

/**
 * One scripted command. The engine walks these in order and takes the first
 * whose `match` fits the input, whose `host` matches, and whose `requires`
 * flags are all held.
 */
const terminalRuleSchema = z.object({
  /** Optional, for readability in long manifests; the engine never needs it. */
  id: z.string().optional(),
  /** Host key(s) this rule is valid on. Omit for "any host". */
  host: stringList.optional(),
  /** JavaScript regex source, tested against the raw input line. */
  match: z.string(),
  /** Regex flags. Case-insensitive by default — players type inconsistently. */
  regexFlags: z.string().default("i"),
  requires: optionalStringList,
  /** Gate on the session user, e.g. `"root"`. */
  requiresUser: z.string().optional(),
  output: z.string().optional(),
  /** Reveal `output` line by line rather than at once — scans should feel slow. */
  stream: z.boolean().default(false),
  /** Milliseconds of "working…" before any output appears. */
  delayMs: z.number().int().min(0).max(10_000).default(0),
  unlocks: optionalStringList,
  /**
   * Turns the rule into a two-step interaction: print `prompt`, capture the
   * next line, compare to `expectInput`. This is how `ssh` asks for a password
   * without the engine knowing anything about SSH.
   */
  prompt: z.string().optional(),
  expectInput: z.string().optional(),
  /** Echo the captured line as dots, as a password field would. */
  masked: z.boolean().default(true),
  onSuccess: effectSchema.optional(),
  /** Printed when `expectInput` does not match. */
  onFailure: z.object({ output: z.string() }).optional(),
  /**
   * Shown when the rule matches but `requires` is unmet. Must read as a plain
   * technical failure — this is the most tempting place to leak a hint, and
   * the one place a leak would defeat the whole guide system.
   */
  lockedOutput: z.string().optional(),
});

export type TerminalRule = z.infer<typeof terminalRuleSchema>;

/** Realistic negatives for off-path input. Overridable per case. */
const responsesSchema = z
  .object({
    commandNotFound: z.string().default("{cmd}: command not found"),
    permissionDenied: z.string().default("{cmd}: Permission denied"),
    noSuchFile: z
      .string()
      .default("{cmd}: {arg}: No such file or directory"),
    notADirectory: z.string().default("{cmd}: {arg}: Not a directory"),
    isADirectory: z.string().default("{cmd}: {arg}: Is a directory"),
    missingOperand: z.string().default("{cmd}: missing operand"),
    /** Per-tool failure when a known tool runs with no matching rule. */
    toolFallbacks: z.record(z.string(), z.string()).default({}),
  })
  // `prefault`, not `default`: in Zod 4 a bare `.default({})` short-circuits
  // and returns `{}` as-is when `responses` is omitted, leaving every nested
  // field undefined. `prefault` runs the empty object through the schema so
  // the field defaults above actually populate.
  .prefault({});

const searchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string().optional(),
  /** Small chip on the result card — "منتدى", "أرشيف", "PDF". */
  badge: z.string().optional(),
});

/** A file the fake web can hand to the Files app, via click or `wget`. */
const downloadSchema = z.object({
  /** URL path, e.g. `/backups/admin.bak`. Also what `wget` matches on. */
  path: z.string(),
  label: z.string().optional(),
  /** Where it lands locally. Defaults to the current host's home + basename. */
  saveTo: z.string().optional(),
  content: z.string().default(""),
  kind: z.enum(FILE_KINDS).default("text"),
  requires: optionalStringList,
  unlocks: optionalStringList,
});

export type LabDownload = z.infer<typeof downloadSchema>;

const siteSchema = z.object({
  title: z.string().optional(),
  /** Trusted authored markup — rendered as-is. Never player input. */
  html: z.string(),
  requires: optionalStringList,
  /** Flags granted by reaching the page at all (reading a forum post counts). */
  unlocks: optionalStringList,
  downloads: z.array(downloadSchema).default([]),
});

const browserSchema = z
  .object({
    homeUrl: z.string().optional(),
    /** Query phrase → result cards. Matching is fuzzy; see `matchSearch`. */
    search: z.record(z.string(), z.array(searchResultSchema)).default({}),
    sites: z.record(z.string(), siteSchema).default({}),
    noResults: z.string().default("لا توجد نتائج مطابقة."),
    /** Shown for a URL with no `sites` entry — a dead host, not a hint. */
    offline: z.string().default("تعذّر الوصول إلى هذا الخادم."),
  })
  // `prefault` for the same reason as `responses` — see the note there.
  .prefault({});

const objectiveSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** The flag that completes this objective. */
  done: z.string(),
});

export type LabObjective = z.infer<typeof objectiveSchema>;

/**
 * One layer of guidance: Arabic prose, and — separately — the commands to run.
 *
 * Keeping them apart is not cosmetic. A command buried inside an Arabic
 * sentence is reordered by the bidirectional algorithm, so its punctuation and
 * slashes end up on the wrong side and the player copies something subtly
 * broken. Prose goes in `text`, commands go in `code`, and the renderer gives
 * each the direction it needs.
 *
 * Short symbols — a filename, a single flag — stay inline in `text` wrapped in
 * `backticks`; the renderer isolates those too.
 */
const guideBlockObject = z.object({
  text: z.string(),
  /** One command, or a sequence to run in order. Rendered copyable. */
  code: optionalStringList,
  /** Follow-up line under the code — what the player should now see. */
  note: z.string().optional(),
});

export type GuideBlock = z.infer<typeof guideBlockObject>;

/** `"nudge": "…"` stays valid shorthand for `{ "text": "…" }`. */
const guideBlockSchema = z
  .union([z.string(), guideBlockObject])
  .transform((value): GuideBlock =>
    typeof value === "string" ? guideBlockObject.parse({ text: value }) : value,
  );

/** The three-layer safety net, keyed by objective id. */
const guideEntrySchema = z.object({
  nudge: guideBlockSchema,
  hint: guideBlockSchema,
  solution: guideBlockSchema,
  /** Concept explainer shown with the solution — the actual teaching. */
  concept: guideBlockSchema.optional(),
});

export type GuideEntry = z.infer<typeof guideEntrySchema>;

export const labManifestSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** Matches the case-file difficulty language used across the site. */
  difficulty: z.enum(["easy", "medium", "hard"]),
  isFree: z.boolean().default(false),
  estimatedMinutes: z.number().int().positive(),
  /** Short line under the title in the top bar / case header. */
  tagline: z.string().optional(),
  skills: z.array(z.string()).default([]),

  /** The cold open shown before the desktop boots. */
  intro: z.object({
    type: z.enum(["article", "message", "dossier"]).default("article"),
    source: z.string().optional(),
    headline: z.string(),
    body: z.string(),
    mission: z.string(),
  }),

  /** Key → host. The first key is where the session starts. */
  hosts: z.record(z.string(), hostSchema),
  /** Explicit start host; defaults to the first key in `hosts`. */
  startHost: z.string().optional(),

  /**
   * Tools installed on this case's machines. Every name must exist in the
   * shared toolbox, which is where `help`, `man` and the failure text for each
   * one come from. A tool the toolbox knows but this list omits is simply not
   * installed here, and reports itself as such.
   */
  tools: z.array(z.string()).default([]),

  terminal: z.array(terminalRuleSchema).default([]),
  browser: browserSchema,
  responses: responsesSchema,

  objectives: z.array(objectiveSchema).min(1),
  guide: z.record(z.string(), guideEntrySchema).default({}),

  completion: z.object({
    trigger: z.string(),
    message: z.string(),
    /** Hook into the next case. */
    teaser: z.string().optional(),
  }),
});

export type LabManifest = z.infer<typeof labManifestSchema>;
/** Pre-validation shape — what a JSON file is allowed to look like. */
export type LabManifestInput = z.input<typeof labManifestSchema>;

/**
 * Guide commands the engine would refuse to run.
 *
 * This is the worst failure a case can ship: the Guide, the last resort of a
 * stuck player, telling them to type something the simulator doesn't accept.
 * Every `code` line whose first word is a builtin or an installed tool is
 * tested against the terminal rules; gates are ignored, since the check is
 * about whether the command is *recognised*, not whether it would succeed yet.
 *
 * Lines starting with anything else — a URL to open, a password to paste — are
 * left alone rather than guessed at.
 */
function unrunnableGuideCommands(manifest: LabManifest): string[] {
  const problems: string[] = [];

  const patterns = manifest.terminal.flatMap((rule) => {
    try {
      return [new RegExp(rule.match, rule.regexFlags.replace("g", ""))];
    } catch {
      return [];
    }
  });

  for (const [objectiveId, entry] of Object.entries(manifest.guide)) {
    const blocks = [entry.nudge, entry.hint, entry.solution, entry.concept];

    for (const block of blocks) {
      for (const command of block?.code ?? []) {
        const head = command.trim().split(/\s+/)[0];
        if (head === undefined) continue;

        // Builtins are implemented by the engine and need no rule; anything
        // that isn't an installed tool isn't a command we control.
        if (BUILTIN_NAMES.includes(head)) continue;
        if (!manifest.tools.includes(head)) continue;

        if (!patterns.some((pattern) => pattern.test(command.trim()))) {
          problems.push(
            `guide["${objectiveId}"] tells the player to run "${command}", which no terminal rule matches.`,
          );
        }
      }
    }
  }

  return problems;
}

/**
 * Parse and validate, with cross-field checks zod can't express alone.
 *
 * These catch the mistakes that would otherwise surface as a case that is
 * quietly impossible to finish — an objective waiting on a flag nothing
 * grants, a rule scoped to a host that doesn't exist. Failing loudly at load
 * time is the whole reason content is data rather than code.
 */
export function parseLabManifest(input: unknown): LabManifest {
  const manifest = labManifestSchema.parse(input);
  const problems: string[] = [];

  const hostKeys = new Set(Object.keys(manifest.hosts));
  if (hostKeys.size === 0) problems.push("`hosts` is empty.");

  if (manifest.startHost && !hostKeys.has(manifest.startHost)) {
    problems.push(`startHost "${manifest.startHost}" is not a declared host.`);
  }

  for (const [index, rule] of manifest.terminal.entries()) {
    for (const host of rule.host ?? []) {
      if (!hostKeys.has(host)) {
        problems.push(`terminal[${index}] targets unknown host "${host}".`);
      }
    }
    if (rule.onSuccess?.switchHost && !hostKeys.has(rule.onSuccess.switchHost)) {
      problems.push(
        `terminal[${index}] switches to unknown host "${rule.onSuccess.switchHost}".`,
      );
    }
    if (rule.expectInput !== undefined && rule.prompt === undefined) {
      problems.push(`terminal[${index}] has expectInput without a prompt.`);
    }
  }

  // Every flag any content can grant. `setUser` is folded in because the
  // engine also publishes the current user as a flag (see `deriveFlags`).
  const grantable = new Set<string>();
  for (const rule of manifest.terminal) {
    for (const flag of rule.unlocks) grantable.add(flag);
    for (const flag of rule.onSuccess?.setState ?? []) grantable.add(flag);
    if (rule.onSuccess?.setUser) grantable.add(rule.onSuccess.setUser);
  }
  for (const site of Object.values(manifest.browser.sites)) {
    for (const flag of site.unlocks) grantable.add(flag);
    for (const download of site.downloads) {
      for (const flag of download.unlocks) grantable.add(flag);
    }
  }
  for (const host of Object.values(manifest.hosts)) {
    for (const file of Object.values(host.filesystem)) {
      for (const flag of file.unlocks) grantable.add(flag);
    }
  }

  for (const objective of manifest.objectives) {
    if (!grantable.has(objective.done)) {
      problems.push(
        `objective "${objective.id}" waits on flag "${objective.done}", which nothing grants.`,
      );
    }
    if (!manifest.guide[objective.id]) {
      problems.push(`objective "${objective.id}" has no guide entry.`);
    }
  }

  if (!grantable.has(manifest.completion.trigger)) {
    problems.push(
      `completion.trigger "${manifest.completion.trigger}" is never granted.`,
    );
  }

  for (const [index, rule] of manifest.terminal.entries()) {
    try {
      new RegExp(rule.match, rule.regexFlags);
    } catch {
      problems.push(`terminal[${index}] has an invalid regex: ${rule.match}`);
    }
  }

  // A tool with no manual is a tool the player can't be told anything about.
  for (const tool of manifest.tools) {
    if (!TOOLBOX[tool]) {
      problems.push(
        `tool "${tool}" has no entry in the shared toolbox (src/cases/_shared/toolbox.json).`,
      );
    }
  }

  problems.push(...unrunnableGuideCommands(manifest));

  if (problems.length > 0) {
    throw new Error(
      `Invalid lab manifest "${manifest.id}":\n  - ${problems.join("\n  - ")}`,
    );
  }

  return manifest;
}
