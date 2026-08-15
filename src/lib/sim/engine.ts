import type {
  LabDownload,
  LabManifest,
  TerminalRule,
} from "@/lib/labs/schema";
import {
  BUILTIN_COMMANDS,
  BUILTIN_NAMES,
  isBuiltin,
  manPage,
  toolDoc,
  usagePage,
} from "@/lib/labs/tools";
import {
  basename,
  canRead,
  displayPath,
  isDir,
  isFile,
  listDir,
  resolvePath,
  type FileMap,
} from "./filesystem";
import {
  currentUser,
  hasFlags,
  hostFiles,
  type SimSession,
} from "./session";

/**
 * The simulator.
 *
 * Nothing here touches a network, a shell, or a server. `runCommand` is a pure
 * function of (manifest, session, input) → (lines, next session). Every string
 * a player sees is either scripted in the manifest or one of the generic
 * negatives below.
 *
 * Resolution order for a line:
 *
 *   0. a pending prompt (an `ssh` password) consumes the line outright
 *   1. the line is split on `&&` / `;` and each command resolved in turn:
 *      a. manifest `terminal` rules, in order — content can override anything
 *      b. engine built-ins (`ls`, `cd`, `cat`, `wget`, …)
 *      c. a realistic negative
 *
 * Rules come before built-ins so a case can script `ls` on a weird host
 * without the engine getting in the way.
 */

export type TerminalLineKind =
  | "input"
  | "output"
  | "error"
  | "notice"
  | "success";

export type TerminalLine = {
  id: string;
  kind: TerminalLineKind;
  text: string;
  /** Echoed prompt, kept separate so it can be coloured apart from the command. */
  prompt?: string;
};

export type CommandOutcome = {
  session: SimSession;
  lines: TerminalLine[];
  /** Wipe the scrollback (`clear`). */
  clear: boolean;
  /** "Working…" pause before output appears. */
  delayMs: number;
  /** Reveal output line by line rather than all at once. */
  stream: boolean;
  /** Flags gained by this command — drives the objective-complete notice. */
  unlocked: string[];
};

let lineCounter = 0;
export function makeLine(
  kind: TerminalLineKind,
  text: string,
  prompt?: string,
): TerminalLine {
  lineCounter += 1;
  return { id: `l${lineCounter}`, kind, text, prompt };
}

/**
 * Re-keys restored scrollback onto this page's counter.
 *
 * Scrollback outlives the page it was written on — it is persisted, and a
 * resumed case puts those lines straight back on screen. The counter behind
 * `makeLine` does not outlive the page: it restarts at zero, so the first
 * command of a resumed session mints an id the restored lines already carry,
 * React sees two children with one key, and rows start being dropped.
 *
 * Re-issuing every id on the way in makes that collision impossible, and
 * repairs histories already written with duplicates — which is every session
 * that has been resumed and played since. Ids are internal render keys only;
 * nothing reads them back, so renumbering costs nothing.
 */
export function adoptLines(restored: TerminalLine[]): TerminalLine[] {
  return restored.map((line) => {
    lineCounter += 1;
    return { ...line, id: `l${lineCounter}` };
  });
}

function lines(kind: TerminalLineKind, text: string): TerminalLine[] {
  return text.split("\n").map((part) => makeLine(kind, part));
}

/**
 * How an off-path command fails.
 *
 * The text comes from the shared toolbox, per tool, and is fixed there — it
 * must never differ based on how close the player is to the answer. A negative
 * that changes shape is a hint, and hints belong in the Guide.
 *
 * Two situations, one deliberately identical outcome: a tool this case never
 * installed reports exactly what an unknown command reports, so the response
 * can't be used to probe which tools exist elsewhere in the platform.
 */
function toolFailure(
  manifest: LabManifest,
  cmd: string,
  hasOperand: boolean,
): string {
  const override = manifest.responses.toolFallbacks[cmd];
  if (override) return override;

  if (!manifest.tools.includes(cmd)) return manifest.responses.commandNotFound;

  const doc = toolDoc(cmd);
  if (!doc) return manifest.responses.commandNotFound;

  return hasOperand ? doc.errors.noMatch : doc.errors.noTarget;
}

/** Commands the player can read a manual for on this case's machines. */
function installedCommands(manifest: LabManifest): string[] {
  return [...BUILTIN_NAMES, ...manifest.tools.filter((tool) => !isBuiltin(tool))];
}

/** Splits a command line, honouring simple single/double quoting. */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }

  return tokens;
}

function fill(
  template: string,
  values: Record<string, string | undefined>,
): string {
  return template.replaceAll(/\{(\w+)\}/g, (whole, key: string) =>
    values[key] ?? whole,
  );
}

/** Trailing slash and case differences shouldn't decide whether a URL resolves. */
function normalizeUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  const withScheme = /^[a-z]+:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;
  return withScheme.toLowerCase();
}

function originOf(url: string): string {
  const normalized = normalizeUrl(url);
  const afterScheme = normalized.indexOf("://") + 3;
  const slash = normalized.indexOf("/", afterScheme);
  return slash === -1 ? normalized : normalized.slice(0, slash);
}

export function findSite(manifest: LabManifest, url: string) {
  const target = normalizeUrl(url);
  for (const [siteUrl, site] of Object.entries(manifest.browser.sites)) {
    if (normalizeUrl(siteUrl) === target) return { url: siteUrl, site };
  }
  return null;
}

/** Resolves a full URL to a downloadable file declared on any site. */
export function findDownload(
  manifest: LabManifest,
  url: string,
): { download: LabDownload; siteUrl: string } | null {
  const target = normalizeUrl(url);

  for (const [siteUrl, site] of Object.entries(manifest.browser.sites)) {
    const origin = originOf(siteUrl);
    for (const download of site.downloads) {
      if (normalizeUrl(origin + download.path) === target) {
        return { download, siteUrl };
      }
    }
  }

  return null;
}

/** Strips authored markup so `curl` can print a page as a shell would. */
function htmlToText(html: string): string {
  return html
    .replaceAll(/<\s*br\s*\/?>/gi, "\n")
    .replaceAll(/<\/\s*(p|div|h[1-6]|li|tr)\s*>/gi, "\n")
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll(/&nbsp;/g, " ")
    .replaceAll(/&amp;/g, "&")
    .replaceAll(/&lt;/g, "<")
    .replaceAll(/&gt;/g, ">")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, all) => line !== "" || all[index - 1] !== "")
    .join("\n")
    .trim();
}

type Ctx = {
  manifest: LabManifest;
  session: SimSession;
  user: string;
  home: string;
  files: FileMap;
  argv: string[];
  input: string;
};

/** Adds flags, returning the next session and only the genuinely new ones. */
function grant(
  session: SimSession,
  flags: string[],
): { session: SimSession; unlocked: string[] } {
  const unlocked = flags.filter((flag) => !session.flags.includes(flag));
  if (unlocked.length === 0) return { session, unlocked };
  return { session: { ...session, flags: [...session.flags, ...unlocked] }, unlocked };
}

/** Writes files into a host's session overlay without touching the manifest. */
function addFiles(
  session: SimSession,
  hostKey: string,
  files: FileMap,
): SimSession {
  if (Object.keys(files).length === 0) return session;

  return {
    ...session,
    addedFiles: {
      ...session.addedFiles,
      [hostKey]: { ...(session.addedFiles[hostKey] ?? {}), ...files },
    },
  };
}

/**
 * Saves a download into the session's filesystem and grants its flags.
 * Shared by the Browser's download buttons and the terminal's `wget`.
 */
export function applyDownload(
  manifest: LabManifest,
  session: SimSession,
  download: LabDownload,
): { session: SimSession; unlocked: string[]; savedTo: string } {
  const home = manifest.hosts[session.hostKey].home;
  const savedTo =
    download.saveTo ??
    `${home === "/" ? "" : home}/${basename(download.path)}`;

  let next = addFiles(session, session.hostKey, {
    [savedTo]: {
      content: download.content,
      hidden: false,
      downloadable: true,
      kind: download.kind,
      label: download.label,
      unlocks: [],
      locked: undefined,
    },
  });

  const granted = grant(next, download.unlocks);
  next = granted.session;

  return { session: next, unlocked: granted.unlocked, savedTo };
}

/** Applies a matched rule's effects — flags, host switch, privesc, files. */
function applyRule(
  manifest: LabManifest,
  session: SimSession,
  rule: TerminalRule,
): { session: SimSession; lines: TerminalLine[]; unlocked: string[] } {
  const out: TerminalLine[] = [];
  let next = session;
  const unlocked: string[] = [];

  const granted = grant(next, [
    ...rule.unlocks,
    ...(rule.onSuccess?.setState ?? []),
  ]);
  next = granted.session;
  unlocked.push(...granted.unlocked);

  if (rule.output) out.push(...lines("output", rule.output));

  const effect = rule.onSuccess;
  if (effect) {
    if (effect.switchHost) {
      const target = effect.switchHost;
      next = {
        ...next,
        hostKey: target,
        cwd: manifest.hosts[target].home,
      };

      const motd = manifest.hosts[target].motd;
      if (motd && !next.seenMotd.includes(target)) {
        next = { ...next, seenMotd: [...next.seenMotd, target] };
        out.push(...lines("notice", motd));
      }
    }

    if (effect.setUser) {
      next = {
        ...next,
        users: { ...next.users, [next.hostKey]: effect.setUser },
      };
      // The user doubles as a flag, so a privesc satisfies `"done": "root"`.
      if (!next.flags.includes(effect.setUser)) unlocked.push(effect.setUser);
    }

    if (effect.setCwd) next = { ...next, cwd: effect.setCwd };

    if (Object.keys(effect.addFiles).length > 0) {
      next = addFiles(
        next,
        effect.addFilesTo ?? next.hostKey,
        effect.addFiles,
      );
    }

    if (effect.output) out.push(...lines("output", effect.output));
  }

  return { session: next, lines: out, unlocked };
}

function builtin(ctx: Ctx): CommandOutcome | null {
  const { manifest, session, user, home, files, argv } = ctx;
  const cmd = argv[0];
  const responses = manifest.responses;

  const fail = (template: string, arg?: string) =>
    lines("error", fill(template, { cmd, arg, user, host: session.hostKey }));

  const done = (
    outLines: TerminalLine[],
    patch: Partial<CommandOutcome> = {},
  ): CommandOutcome => ({
    session,
    lines: outLines,
    clear: false,
    delayMs: 0,
    stream: false,
    unlocked: [],
    ...patch,
  });

  // `<tool> --help` answers for anything installed. Case rules are matched
  // before builtins, so a scripted invocation still wins over this.
  if (
    argv.slice(1).some((arg) => arg === "--help" || arg === "-h") &&
    installedCommands(manifest).includes(cmd)
  ) {
    const doc = toolDoc(cmd);
    if (doc) return done(lines("output", usagePage(cmd, doc)));
  }

  switch (cmd) {
    case "clear":
      return done([], { clear: true });

    case "pwd":
      return done(lines("output", session.cwd));

    case "whoami":
      return done(lines("output", user));

    case "id": {
      const uid = user === "root" ? 0 : 1000;
      return done(
        lines(
          "output",
          `uid=${uid}(${user}) gid=${uid}(${user}) groups=${uid}(${user})`,
        ),
      );
    }

    case "exit":
      return done(
        lines("error", "logout: not permitted inside an active engagement"),
      );

    /**
     * `help` and `man` are the only places the platform explains itself in
     * Arabic. Everything they print is content — the toolbox — so adding a
     * tool to a case never means editing the engine.
     */
    case "help": {
      const width =
        Math.max(...installedCommands(manifest).map((name) => name.length)) + 3;

      const out = ["الأوامر المدمجة", ""];
      for (const entry of BUILTIN_COMMANDS) {
        out.push(`  ${entry.name.padEnd(width)}${entry.summary}`);
      }

      const tools = manifest.tools.filter((tool) => !isBuiltin(tool));
      if (tools.length > 0) {
        out.push("", "الأدوات المثبّتة على هذا الجهاز", "");
        for (const tool of tools) {
          const doc = toolDoc(tool);
          out.push(`  ${tool.padEnd(width)}${doc?.summary ?? ""}`);
        }
      }

      out.push("", "اكتب man ثم اسم الأداة لقراءة دليلها كاملًا.");
      // The example sits on its own line: an Arabic line ending in Latin gets
      // its punctuation reordered, and a command a player can't read verbatim
      // is worse than no example at all.
      out.push("", "لتشغيل أمرين بالترتيب، اربطهما:");
      out.push("    cmd1 && cmd2");
      return done(lines("output", out.join("\n")));
    }

    case "man": {
      const target = argv[1];

      if (!target) {
        return done(
          lines(
            "output",
            [
              "What manual page do you want?",
              "",
              `  ${installedCommands(manifest).join("  ")}`,
            ].join("\n"),
          ),
        );
      }

      // Scoped to what this case installs: a manual for a tool that isn't on
      // the machine would announce that the tool exists somewhere.
      if (!installedCommands(manifest).includes(target)) {
        return done(lines("error", `No manual entry for ${target}`));
      }

      const doc = toolDoc(target);
      if (!doc) {
        const entry = BUILTIN_COMMANDS.find((item) => item.name === target);
        return done(
          lines("output", ["NAME", `    ${target} — ${entry?.summary ?? ""}`].join("\n")),
        );
      }

      return done(lines("output", manPage(target, doc)));
    }

    case "ls": {
      const flags = argv.slice(1).filter((arg) => arg.startsWith("-"));
      const operands = argv.slice(1).filter((arg) => !arg.startsWith("-"));
      const showAll = flags.some((flag) => flag.includes("a"));
      const longForm = flags.some((flag) => flag.includes("l"));
      const target = resolvePath(session.cwd, operands[0] ?? ".", home);

      if (isFile(files, target)) return done(lines("output", basename(target)));
      if (!isDir(files, target)) {
        return done(fail(responses.noSuchFile, operands[0] ?? target));
      }

      const entries = listDir(files, target, { all: showAll });
      if (entries.length === 0) return done([]);

      if (longForm) {
        const rows = entries.map((entry) => {
          const locked = entry.node?.locked;
          const owner = locked ?? (user === "root" ? "root" : user);
          const mode = entry.isDir
            ? "drwxr-xr-x"
            : locked
              ? "-rw-------"
              : "-rw-r--r--";
          const size = String(entry.node?.content.length ?? 4096).padStart(6);
          return `${mode}  ${owner.padEnd(6)} ${size}  ${entry.name}${entry.isDir ? "/" : ""}`;
        });
        return done(lines("output", rows.join("\n")));
      }

      return done(
        lines(
          "output",
          entries
            .map((entry) => (entry.isDir ? `${entry.name}/` : entry.name))
            .join("  "),
        ),
      );
    }

    case "cd": {
      const operand = argv[1] ?? "~";
      const target = resolvePath(session.cwd, operand, home);

      if (isDir(files, target)) {
        return done([], { session: { ...session, cwd: target } });
      }
      if (isFile(files, target)) {
        return done(fail(responses.notADirectory, operand));
      }
      return done(fail(responses.noSuchFile, operand));
    }

    case "cat": {
      const operands = argv.slice(1).filter((arg) => !arg.startsWith("-"));
      if (operands.length === 0) return done(fail(responses.missingOperand));

      const out: TerminalLine[] = [];
      let next = session;
      const unlocked: string[] = [];

      for (const operand of operands) {
        const target = resolvePath(session.cwd, operand, home);
        const node = files[target];

        if (!node) {
          if (isDir(files, target)) {
            out.push(...fail(responses.isADirectory, operand));
          } else {
            out.push(...fail(responses.noSuchFile, operand));
          }
          continue;
        }

        if (!canRead(node, user)) {
          out.push(...fail(responses.permissionDenied, operand));
          continue;
        }

        out.push(...lines("output", node.content));

        if (node.unlocks.length > 0) {
          const granted = grant(next, node.unlocks);
          next = granted.session;
          unlocked.push(...granted.unlocked);
        }
      }

      return done(out, { session: next, unlocked });
    }

    case "wget":
    case "curl": {
      const url = argv.slice(1).find((arg) => !arg.startsWith("-"));
      if (!url) {
        return done(
          lines("error", `${cmd}: missing URL\nUsage: ${cmd} [OPTION]... [URL]`),
        );
      }

      const hit = findDownload(manifest, url);

      if (hit && hasFlags(manifest, session, hit.download.requires)) {
        if (cmd === "curl") {
          return done(lines("output", hit.download.content));
        }

        const saved = applyDownload(manifest, session, hit.download);
        return done(
          lines(
            "output",
            [
              `--  ${url}`,
              "Resolving host... connected.",
              "HTTP request sent, awaiting response... 200 OK",
              `Length: ${hit.download.content.length} [application/octet-stream]`,
              `Saving to: '${displayPath(saved.savedTo, home)}'`,
              "",
              `'${displayPath(saved.savedTo, home)}' saved`,
            ].join("\n"),
          ),
          { session: saved.session, unlocked: saved.unlocked, delayMs: 500 },
        );
      }

      const page = findSite(manifest, url);
      if (page && hasFlags(manifest, session, page.site.requires)) {
        if (cmd === "curl") {
          return done(lines("output", htmlToText(page.site.html)), {
            delayMs: 400,
          });
        }

        const savedTo = `${home === "/" ? "" : home}/index.html`;
        return done(
          lines(
            "output",
            [
              `--  ${url}`,
              "HTTP request sent, awaiting response... 200 OK",
              `Saving to: '${displayPath(savedTo, home)}'`,
            ].join("\n"),
          ),
          {
            session: addFiles(session, session.hostKey, {
              [savedTo]: {
                content: page.site.html,
                hidden: false,
                downloadable: true,
                kind: "text",
                label: undefined,
                unlocks: [],
                locked: undefined,
              },
            }),
            delayMs: 500,
          },
        );
      }

      // Unknown or still-locked URL. A 404 reads the same either way, which is
      // the point — the response can't be used to probe for what exists.
      return done(
        lines(
          "error",
          cmd === "curl"
            ? `curl: (22) The requested URL returned error: 404`
            : `--  ${url}\nHTTP request sent, awaiting response... 404 Not Found\nERROR 404: Not Found.`,
        ),
        { delayMs: 400 },
      );
    }

    default:
      return null;
  }
}

/** Consumes a line the simulator asked for — an `ssh` password, typically. */
function runPrompt(
  manifest: LabManifest,
  session: SimSession,
  input: string,
): CommandOutcome {
  const pending = session.pending!;
  const rule = manifest.terminal[pending.ruleIndex];
  const cleared: SimSession = { ...session, pending: null };

  const idle: CommandOutcome = {
    session: cleared,
    lines: [],
    clear: false,
    delayMs: 0,
    stream: false,
    unlocked: [],
  };

  if (!rule) return idle;

  if (input === rule.expectInput) {
    const applied = applyRule(manifest, cleared, rule);
    return {
      session: applied.session,
      lines: applied.lines,
      clear: false,
      delayMs: rule.delayMs,
      stream: rule.stream,
      unlocked: applied.unlocked,
    };
  }

  return {
    ...idle,
    lines: lines(
      "error",
      rule.onFailure?.output ?? "Permission denied, please try again.",
    ),
    delayMs: 600,
  };
}

/**
 * Runs a single command — no `&&`, no `;`.
 *
 * Returns the output lines only — the caller owns echoing the prompt, because
 * it also owns masking a password as it's typed.
 */
function runOne(
  manifest: LabManifest,
  session: SimSession,
  input: string,
): CommandOutcome {
  const user = currentUser(manifest, session);
  const host = manifest.hosts[session.hostKey];
  const files = hostFiles(manifest, session);

  const idle: CommandOutcome = {
    session,
    lines: [],
    clear: false,
    delayMs: 0,
    stream: false,
    unlocked: [],
  };

  const trimmed = input.trim();
  if (trimmed === "") return idle;

  // 1. Manifest rules, in order. Content wins over built-ins.
  for (const [index, rule] of manifest.terminal.entries()) {
    if (rule.host && !rule.host.includes(session.hostKey)) continue;

    let pattern: RegExp;
    try {
      pattern = new RegExp(rule.match, rule.regexFlags.replace("g", ""));
    } catch {
      continue;
    }
    if (!pattern.test(trimmed)) continue;

    const argv = tokenize(trimmed);
    const gateFailed =
      !hasFlags(manifest, session, rule.requires) ||
      (rule.requiresUser !== undefined && rule.requiresUser !== user);

    if (gateFailed) {
      const fallback =
        rule.lockedOutput ??
        manifest.responses.toolFallbacks[argv[0]] ??
        toolDoc(argv[0])?.errors.noMatch ??
        manifest.responses.permissionDenied;

      return {
        ...idle,
        lines: lines(
          "error",
          fill(fallback, {
            cmd: argv[0],
            arg: argv[1] ?? "",
            user,
            host: host.hostname,
          }),
        ),
        delayMs: Math.min(rule.delayMs, 900),
      };
    }

    // An interactive rule stops here and waits for the next line.
    if (rule.prompt !== undefined && rule.expectInput !== undefined) {
      return {
        ...idle,
        session: {
          ...session,
          pending: {
            ruleIndex: index,
            prompt: rule.prompt,
            masked: rule.masked,
          },
        },
        delayMs: rule.delayMs,
      };
    }

    const applied = applyRule(manifest, session, rule);
    return {
      session: applied.session,
      lines: applied.lines,
      clear: false,
      delayMs: rule.delayMs,
      stream: rule.stream,
      unlocked: applied.unlocked,
    };
  }

  // 2. Engine built-ins.
  const argv = tokenize(trimmed);
  const fromBuiltin = builtin({
    manifest,
    session,
    user,
    home: host.home,
    files,
    argv,
    input: trimmed,
  });
  if (fromBuiltin) return fromBuiltin;

  // 3. A realistic negative. An installed tool fails the way that tool fails —
  //    bare invocation gets its usage complaint, a real attempt gets its
  //    "couldn't reach the target". Anything else is simply not installed.
  const cmd = argv[0];
  const installed = manifest.tools.includes(cmd);

  return {
    ...idle,
    lines: lines(
      "error",
      fill(toolFailure(manifest, cmd, argv.length > 1), {
        cmd,
        arg: argv[1] ?? "",
        user,
        host: host.hostname,
      }),
    ),
    delayMs: installed ? 700 : 0,
  };
}

/**
 * One command inside a chained line, with the operator that introduced it.
 *
 * `after` is empty for the first command; `"&&"` means it runs only if the one
 * before it succeeded, `";"` means it runs either way.
 */
type ChainPart = { command: string; after: "" | "&&" | ";" };

/**
 * Splits a line into the commands it actually runs.
 *
 * A player reaches the terminal by copying a block out of the Guide, and a
 * block is often two steps. Pasted into a single-line input the newline
 * disappears and the two commands fuse into one unrunnable string — so the
 * Guide hands them over joined by `&&`, which then has to mean here what it
 * means in a shell. `;` works too, since players type what they know.
 *
 * Quotes and backslashes are honoured, because an operator inside them is
 * data: `find . -exec /bin/sh \; -quit` is one command, not two.
 */
function splitChain(input: string): ChainPart[] {
  const parts: ChainPart[] = [];
  let buffer = "";
  let after: ChainPart["after"] = "";
  let quote: '"' | "'" | null = null;

  const cut = (operator: "&&" | ";") => {
    parts.push({ command: buffer.trim(), after });
    buffer = "";
    after = operator;
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    // An escape carries the character behind it through untouched — the `\;`
    // closing a `find -exec` must not read as a separator.
    if (char === "\\" && quote !== "'") {
      buffer += char + (input[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (quote) {
      if (char === quote) quote = null;
      buffer += char;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
      continue;
    }

    if (char === "&" && input[index + 1] === "&") {
      cut("&&");
      index += 1;
      continue;
    }

    if (char === ";") {
      cut(";");
      continue;
    }

    buffer += char;
  }

  parts.push({ command: buffer.trim(), after });
  return parts;
}

/** A command failed if it printed anything on the error channel. */
function errored(outcome: CommandOutcome): boolean {
  return outcome.lines.some((line) => line.kind === "error");
}

/**
 * Runs one line of player input, however many commands it holds.
 *
 * Returns the output lines only — the caller owns echoing the prompt, because
 * it also owns masking a password as it's typed.
 */
export function runCommand(
  manifest: LabManifest,
  session: SimSession,
  input: string,
): CommandOutcome {
  // A pending prompt swallows the line whole: it's a password, and an `&&`
  // inside one is two characters of the password, not an operator.
  if (session.pending) return runPrompt(manifest, session, input);

  const parts = splitChain(input);
  if (parts.length === 1) return runOne(manifest, session, parts[0].command);

  const idle: CommandOutcome = {
    session,
    lines: [],
    clear: false,
    delayMs: 0,
    stream: false,
    unlocked: [],
  };

  // `cmd &&` with nothing after it: a shell rejects the whole line rather than
  // running the half that parses, and so does this.
  const blank = parts.findIndex((part) => part.command === "");
  if (blank !== -1) {
    const token = parts[blank].after || parts[blank + 1]?.after || ";";
    return {
      ...idle,
      lines: lines(
        "error",
        `bash: syntax error near unexpected token \`${token}'`,
      ),
    };
  }

  let next = session;
  let out: TerminalLine[] = [];
  let clear = false;
  let delayMs = 0;
  let stream = false;
  const unlocked: string[] = [];
  let broke = false;

  for (const [index, part] of parts.entries()) {
    if (part.after === "&&" && broke) continue;

    const outcome = runOne(manifest, next, part.command);
    next = outcome.session;
    delayMs += outcome.delayMs;
    stream ||= outcome.stream;
    unlocked.push(...outcome.unlocked);

    // A `clear` mid-chain wipes what the chain printed before it, exactly as
    // it wipes the scrollback above it.
    if (outcome.clear) {
      out = [];
      clear = true;
    }

    out.push(...outcome.lines);
    broke = errored(outcome);

    // An interactive command owns the next line the player types, so nothing
    // behind it can run. Saying so beats dropping commands in silence.
    if (next.pending) {
      if (index < parts.length - 1) {
        out.push(
          makeLine(
            "notice",
            "[!] لم تُنفَّذ بقية الأوامر — هذا الأمر ينتظر إدخالًا منك.",
          ),
        );
      }
      break;
    }
  }

  return {
    session: next,
    lines: out,
    clear,
    // Chained delays add up fast, and past a couple of seconds a terminal that
    // is "working" is indistinguishable from one that has hung.
    delayMs: Math.min(delayMs, 2_000),
    stream,
    unlocked,
  };
}

/**
 * Fuzzy-matches a search box query against the manifest's phrase map.
 *
 * Players type approximations, and in Arabic they type them several ways, so
 * matching normalises alef/ya/ta-marbuta variants and diacritics before
 * comparing. An exact key wins; otherwise the longest key contained in the
 * query does, which keeps "من هم matrix" hitting the "matrix" entry.
 */
function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replaceAll(/[ً-ْـ]/g, "")
    .replaceAll(/[إأآا]/g, "ا")
    .replaceAll(/[ىي]/g, "ي")
    .replaceAll(/ة/g, "ه")
    .replaceAll(/[^\p{L}\p{N}\s.:/-]/gu, " ")
    .replaceAll(/\s+/g, " ");
}

export function matchSearch(manifest: LabManifest, query: string) {
  const target = normalizeQuery(query);
  if (target === "") return null;

  const entries = Object.entries(manifest.browser.search);

  for (const [phrase, results] of entries) {
    if (normalizeQuery(phrase) === target) return results;
  }

  const partial = entries
    .filter(([phrase]) => {
      const key = normalizeQuery(phrase);
      return key.length > 2 && (target.includes(key) || key.includes(target));
    })
    .sort((a, b) => b[0].length - a[0].length);

  return partial[0]?.[1] ?? null;
}

/** True when the string looks like a URL rather than a search phrase. */
export function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim();
  return /^[a-z]+:\/\//i.test(trimmed) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed);
}
