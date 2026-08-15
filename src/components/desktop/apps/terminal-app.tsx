"use client";

import { useEffect, useRef, useState } from "react";

import type { LabManifest } from "@/lib/labs/schema";
import type { TerminalLineKind } from "@/lib/sim/engine";
import { listDir, resolvePath } from "@/lib/sim/filesystem";
import { hostFiles, renderPrompt } from "@/lib/sim/session";
import { useLabStore } from "@/store/use-lab-store";
import { cn } from "@/lib/utils";

/**
 * The terminal.
 *
 * Strictly LTR and monospaced inside an otherwise RTL Arabic app — a shell
 * that flowed right-to-left would be unreadable, and every real one the player
 * will ever touch runs the other way.
 *
 * The component owns only presentation and input affordances (history, tab
 * completion, focus). What a command *does* is entirely the engine's business.
 */

const LINE_TONE: Record<TerminalLineKind, string> = {
  input: "text-[var(--text-primary)]",
  output: "text-[var(--text-secondary)]",
  error: "text-[var(--diff-hard)]",
  notice: "text-[var(--gold)]",
  success: "text-[var(--accent)]",
};

export function TerminalApp({ manifest }: { manifest: LabManifest }) {
  const session = useLabStore((store) => store.session);
  const scrollback = useLabStore((store) => store.scrollback);
  const busy = useLabStore((store) => store.busy);
  const submit = useLabStore((store) => store.submit);

  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pin to the bottom as output arrives, the way a real terminal behaves.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [scrollback]);

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  if (!session) return null;

  const pending = session.pending;
  const prompt = pending?.prompt ?? renderPrompt(manifest, session);
  const masked = pending?.masked ?? false;

  /**
   * Tab completion over the current directory. Completes to the single match,
   * or to the longest common prefix when several share one — same contract as
   * a shell, and it teaches the player that paths here are real.
   */
  function complete() {
    if (pending) return;

    const tokens = value.split(" ");
    const last = tokens.at(-1) ?? "";
    if (last === "") return;

    const home = manifest.hosts[session!.hostKey].home;
    const files = hostFiles(manifest, session!);

    const slash = last.lastIndexOf("/");
    const dirPart = slash === -1 ? "." : last.slice(0, slash + 1);
    const namePart = slash === -1 ? last : last.slice(slash + 1);
    const dir = resolvePath(session!.cwd, dirPart, home);

    const matches = listDir(files, dir, { all: namePart.startsWith(".") })
      .filter((entry) => entry.name.startsWith(namePart))
      .map((entry) => (entry.isDir ? `${entry.name}/` : entry.name));

    if (matches.length === 0) return;

    let completion = matches[0];
    if (matches.length > 1) {
      let prefix = "";
      for (let index = 0; index < matches[0].length; index += 1) {
        const char = matches[0][index];
        if (matches.every((match) => match[index] === char)) prefix += char;
        else break;
      }
      if (prefix.length <= namePart.length) return;
      completion = prefix;
    }

    tokens[tokens.length - 1] =
      (slash === -1 ? "" : last.slice(0, slash + 1)) + completion;
    setValue(tokens.join(" "));
  }

  /**
   * A pasted block is usually two steps copied out of the Guide.
   *
   * The input is a single line, so the browser's own handling drops the
   * newlines and welds the commands into one word that can never run — the
   * single most common way a player gets stuck on something that isn't the
   * puzzle. Turning each newline into the operator that means the same thing
   * keeps the paste runnable, and leaves `&&` sitting in the input where it
   * can be read before it's sent.
   */
  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text.includes("\n")) return;

    event.preventDefault();

    const commands = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");

    // A prompt is waiting on a password, not on commands — an operator spliced
    // into one would only corrupt it.
    const insert = commands.join(pending ? "" : " && ");

    const field = event.currentTarget;
    const start = field.selectionStart ?? value.length;
    const end = field.selectionEnd ?? value.length;
    setValue(value.slice(0, start) + insert + value.slice(end));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Ctrl+Alt is the desktop's own modifier — arranging windows must not also
    // walk the command history out from under the player.
    if (event.ctrlKey && event.altKey) return;

    if (event.key === "Tab") {
      event.preventDefault();
      complete();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (history.length === 0) return;
      const next = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setValue(history[next]);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex === null) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(null);
        setValue("");
        return;
      }
      setHistoryIndex(next);
      setValue(history[next]);
      return;
    }

    if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      void submit("clear");
      return;
    }

    if (event.key === "c" && event.ctrlKey) {
      event.preventDefault();
      setValue("");
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    const line = value;
    setValue("");
    setHistoryIndex(null);
    if (!masked && line.trim() !== "") {
      setHistory((previous) => [...previous.slice(-40), line]);
    }
    void submit(line);
  }

  return (
    <div
      dir="ltr"
      onClick={() => inputRef.current?.focus()}
      className="force-ltr flex h-full flex-col bg-[#080c11] font-mono text-[12.5px] leading-[1.65]"
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2.5">
        {scrollback.map((line) => (
          <p
            key={line.id}
            // Per line, not per pane. Output here is genuinely mixed — an
            // English scan report, an Arabic MOTD, an Arabic file printed by
            // `cat` — and forcing the whole pane left-to-right reorders every
            // Arabic line in it. `auto` reads each line's first strong
            // character and gives that line the direction it was written in,
            // while the column stays left-aligned like a real terminal.
            dir="auto"
            className={cn(
              "min-h-[1.15em] break-words whitespace-pre-wrap",
              LINE_TONE[line.kind],
            )}
          >
            {line.prompt ? (
              <span className="bidi-isolate text-[var(--accent)]">
                {line.prompt}{" "}
              </span>
            ) : null}
            {line.text}
          </p>
        ))}

        {busy ? (
          <p className="min-h-[1.15em] text-[var(--text-muted)]">
            <span className="inline-block animate-pulse">▍</span>
          </p>
        ) : null}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex shrink-0 items-center gap-2 border-t border-[var(--border-subtle)] bg-[#0a0e13] px-3 py-2"
      >
        <label htmlFor="terminal-input" className="shrink-0 text-[var(--accent)]">
          {prompt}
        </label>
        <input
          id="terminal-input"
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          disabled={busy}
          type={masked ? "password" : "text"}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="سطر الأوامر"
          className="min-w-0 flex-1 bg-transparent text-[var(--text-primary)] caret-[var(--accent)] outline-none disabled:opacity-50"
        />
      </form>
    </div>
  );
}
